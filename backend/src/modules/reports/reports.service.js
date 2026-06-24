import { prisma } from '../../lib/prisma.js';
import ExcelJS from 'exceljs';
import { get as cacheGet, set as cacheSet } from '../../lib/cache.js';
import { AppError } from '../../utils/AppError.js';

const paginate = (page = '1', limit = '50') => ({
  skip: (parseInt(page) - 1) * parseInt(limit),
  take: parseInt(limit),
});

const paginationMeta = (total, page = '1', limit = '50') => ({
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  pages: Math.ceil(total / parseInt(limit)),
});

// ─── Sales Reports ───────────────────────────────────

export const getSalesSummary = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [totalSales, totalRevenue, totalDiscount, totalTax, totalReturned, salesByMethod] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.aggregate({ where, _sum: { total: true } }),
    prisma.sale.aggregate({ where, _sum: { discount_amount: true } }),
    prisma.sale.aggregate({ where, _sum: { tax_amount: true } }),
    prisma.sale.count({ where: { ...where, status: 'returned' } }),
    prisma.salePayment.groupBy({
      by: ['method'],
      where: {
        sale: {
          ...where,
          deleted_at: null,
        },
        deleted_at: null,
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    total_sales: totalSales,
    total_revenue: totalRevenue._sum.total || 0,
    total_discount: totalDiscount._sum.discount_amount || 0,
    total_tax: totalTax._sum.tax_amount || 0,
    total_returned: totalReturned,
    sales_by_method: salesByMethod.map((s) => ({
      method: s.method,
      total: s._sum.amount || 0,
    })),
  };
};

export const getDailySales = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const sales = await prisma.sale.findMany({
    where,
    select: {
      created_at: true,
      total: true,
      invoice_number: true,
    },
    orderBy: { created_at: 'asc' },
  });

  const dailyMap = {};
  for (const sale of sales) {
    const date = sale.created_at.toISOString().split('T')[0];
    dailyMap[date] = (dailyMap[date] || 0) + sale.total;
  }

  return Object.entries(dailyMap).map(([date, total]) => ({ date, total }));
};

// ─── Inventory Reports ───────────────────────────────

export const getInventorySummary = async (branch_id) => {
  const where = { deleted_at: null, ...(branch_id && { branch_id }) };

  const [totalProducts, totalStockValue, recentMovements] = await Promise.all([
    prisma.product.count({ where }),
    prisma.inventoryBalance.aggregate({
      where: { branch_id, quantity: { gt: 0 } },
      _sum: { quantity: true },
    }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        product: { select: { id: true, name: true, name_ar: true, barcode: true } },
        warehouse: { select: { id: true, name: true, name_ar: true } },
      },
    }),
  ]);

  // المنتجات الأقل من الحد الأدنى
  const lowStockProducts = await prisma.product.findMany({
    where: {
      ...where,
      is_active: true,
      min_stock: { gt: 0 },
    },
    include: {
      inventory_balances: { select: { quantity: true } },
    },
    orderBy: { name: 'asc' },
  });

  const lowStock = lowStockProducts.filter((p) => {
    const balance = p.inventory_balances.reduce((sum, b) => sum + b.quantity, 0);
    return balance <= p.min_stock;
  });

  return {
    total_products: totalProducts,
    low_stock_count: lowStock.length,
    low_stock_products: lowStock.map((p) => ({
      id: p.id,
      name: p.name,
      name_ar: p.name_ar,
      barcode: p.barcode,
      min_stock: p.min_stock,
      current_stock: p.inventory_balances.reduce((sum, b) => sum + b.quantity, 0),
    })),
    recent_movements: recentMovements,
  };
};

// ─── Finance Reports ─────────────────────────────────

export const getFinanceSummary = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      expense_date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [totalExpenses, expensesByCategory, totalSales, cashRegisters] = await Promise.all([
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { amount: true },
    }),
    prisma.sale.aggregate({
      where: {
        deleted_at: null,
        status: 'completed',
        ...(branch_id && { branch_id }),
        ...(from || to) && {
          created_at: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        },
      },
      _sum: { total: true },
    }),
    prisma.cashRegister.findMany({
      where: { deleted_at: null, ...(branch_id && { branch_id }) },
      include: { currency: { select: { id: true, code: true, symbol: true } } },
    }),
  ]);

  return {
    total_expenses: totalExpenses._sum.amount || 0,
    expenses_by_category: expensesByCategory.map((e) => ({
      category: e.category,
      total: e._sum.amount || 0,
      count: e._count.amount,
    })),
    total_sales: totalSales._sum.total || 0,
    net_profit: (totalSales._sum.total || 0) - (totalExpenses._sum.amount || 0),
    cash_registers: cashRegisters,
  };
};

// ─── Sales by Product ──────────────────────────────

export const getSalesByProduct = async ({ branch_id, from, to, page = '1', limit = '50' }) => {
  const where = {
    sale: {
      deleted_at: null,
      status: 'completed',
      ...(branch_id && { branch_id }),
      ...(from || to) && {
        created_at: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      },
    },
    deleted_at: null,
  };

  const totalItems = await prisma.saleItem.groupBy({
    by: ['product_id'],
    where,
    _count: { product_id: true },
  });
  const total = totalItems.length;

  const { skip, take } = paginate(page, limit);
  const items = await prisma.saleItem.groupBy({
    by: ['product_id'],
    where,
    _sum: { quantity: true, total: true },
    _count: { product_id: true },
    orderBy: { _sum: { total: 'desc' } },
    skip,
    take,
  });

  const productIds = items.map((i) => i.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, name_ar: true, barcode: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  return {
    data: items.map((item) => ({
      product: productMap[item.product_id] || { id: item.product_id, name: 'غير معروف' },
      quantity: item._sum.quantity || 0,
      total: item._sum.total || 0,
      invoices: item._count.product_id,
    })),
    meta: paginationMeta(total, page, limit),
  };
};

// ─── Sales by Cashier ──────────────────────────────

export const getSalesByCashier = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const sales = await prisma.sale.groupBy({
    by: ['user_id'],
    where,
    _sum: { total: true, discount_amount: true, paid_amount: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
  });

  const userIds = sales.map((s) => s.user_id);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  return sales.map((s) => ({
    user: userMap[s.user_id] || { id: s.user_id, name: 'غير معروف' },
    invoices: s._count.id,
    total: s._sum.total || 0,
    discount: s._sum.discount_amount || 0,
    paid: s._sum.paid_amount || 0,
  }));
};

// ─── Purchase Reports ──────────────────────────────

export const getPurchaseSummary = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [totalPurchases, totalAmount, purchasesBySupplier] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.aggregate({ where, _sum: { total: true } }),
    prisma.purchase.groupBy({
      by: ['supplier_id'],
      where,
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 20,
    }),
  ]);

  const supplierIds = purchasesBySupplier.filter((s) => s.supplier_id).map((s) => s.supplier_id);
  const suppliers = supplierIds.length > 0 ? await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true },
  }) : [];
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

  return {
    total_purchases: totalPurchases,
    total_amount: totalAmount._sum.total || 0,
    by_supplier: purchasesBySupplier.map((p) => ({
      supplier: p.supplier_id ? (supplierMap[p.supplier_id] || { id: p.supplier_id, name: 'غير معروف' }) : null,
      count: p._count.id,
      total: p._sum.total || 0,
    })),
  };
};

// ─── Profit / Loss ─────────────────────────────────

export const getProfitLoss = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const expensesWhere = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      expense_date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [totalSales, totalExpenses, saleItems, purchaseItems] = await Promise.all([
    prisma.sale.aggregate({
      where: { ...where, status: 'completed' },
      _sum: { total: true, discount_amount: true },
    }),
    prisma.expense.aggregate({
      where: expensesWhere,
      _sum: { amount: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { ...where, status: 'completed' }, deleted_at: null },
      select: { product_id: true, quantity: true },
    }),
    prisma.purchaseItem.findMany({
      where: { purchase: { ...where, status: 'completed' }, deleted_at: null },
      select: { product_id: true, unit_price: true, quantity: true },
    }),
  ]);

  const totalRevenue = totalSales._sum.total || 0;
  const totalDiscount = totalSales._sum.discount_amount || 0;
  const netRevenue = totalRevenue - totalDiscount;
  const expenses = totalExpenses._sum.amount || 0;

  const cogsMap = {};
  for (const item of purchaseItems) {
    cogsMap[item.product_id] = (cogsMap[item.product_id] || 0) + (item.unit_price * item.quantity);
  }
  const totalPurchases = Object.values(cogsMap).reduce((s, v) => s + v, 0);

  const soldMap = {};
  for (const item of saleItems) {
    const cost = cogsMap[item.product_id] || 0;
    const avgCost = cost > 0 ? cost / (purchaseItems.filter((p) => p.product_id === item.product_id).reduce((s, p) => s + p.quantity, 0) || 1) : 0;
    soldMap[item.product_id] = (soldMap[item.product_id] || 0) + (avgCost * item.quantity);
  }
  const cogs = Object.values(soldMap).reduce((s, v) => s + v, 0);

  return {
    total_revenue: totalRevenue,
    total_discount: totalDiscount,
    net_revenue: netRevenue,
    cost_of_goods_sold: Math.round(cogs),
    total_expenses: expenses,
    gross_profit: netRevenue - Math.round(cogs),
    net_profit: netRevenue - Math.round(cogs) - expenses,
    profit_margin_pct: netRevenue > 0 ? Math.round(((netRevenue - Math.round(cogs) - expenses) / netRevenue) * 10000) / 100 : 0,
  };
};

// ─── Top Customers ─────────────────────────────────

export const getTopCustomers = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const sales = await prisma.sale.groupBy({
    by: ['customer_id'],
    where: { ...where, customer_id: { not: null } },
    _sum: { total: true, paid_amount: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: 50,
  });

  const customerIds = sales.filter((s) => s.customer_id).map((s) => s.customer_id);
  const customers = customerIds.length > 0 ? await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true, balance: true },
  }) : [];
  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c]));

  return sales.map((s) => ({
    customer: customerMap[s.customer_id] || { id: s.customer_id, name: 'محذوف' },
    invoices: s._count.id,
    total: s._sum.total || 0,
    paid: s._sum.paid_amount || 0,
    balance: customerMap[s.customer_id]?.balance || 0,
  }));
};

// ─── Inventory Valuation ──────────────────────────

export const getInventoryValuation = async (branch_id) => {
  const balances = await prisma.inventoryBalance.findMany({
    where: { branch_id, quantity: { gt: 0 } },
    include: {
      product: { select: { id: true, name: true, name_ar: true, cost_price: true, selling_price: true } },
      warehouse: { select: { id: true, name: true, name_ar: true } },
    },
    orderBy: { product: { name: 'asc' } },
  });

  const totalCost = balances.reduce((sum, b) => sum + (b.product.cost_price * b.quantity), 0);
  const totalSelling = balances.reduce((sum, b) => sum + (b.product.selling_price * b.quantity), 0);

  return {
    total_products: balances.length,
    total_quantity: balances.reduce((sum, b) => sum + b.quantity, 0),
    total_cost_value: totalCost,
    total_selling_value: totalSelling,
    potential_profit: totalSelling - totalCost,
    by_warehouse: Object.values(balances.reduce((acc, b) => {
      const whId = b.warehouse?.id || 'none';
      if (!acc[whId]) acc[whId] = { warehouse: b.warehouse || { name_ar: 'عام' }, items: [], count: 0, cost: 0, selling: 0 };
      acc[whId].items.push(b);
      acc[whId].count += b.quantity;
      acc[whId].cost += b.product.cost_price * b.quantity;
      acc[whId].selling += b.product.selling_price * b.quantity;
      return acc;
    }, {})),
    items: balances.map((b) => ({
      product: { id: b.product.id, name: b.product.name, name_ar: b.product.name_ar },
      warehouse: b.warehouse ? { id: b.warehouse.id, name: b.warehouse.name, name_ar: b.warehouse.name_ar } : null,
      quantity: b.quantity,
      cost_price: b.product.cost_price,
      selling_price: b.product.selling_price,
      total_cost: b.product.cost_price * b.quantity,
      total_selling: b.product.selling_price * b.quantity,
    })),
  };
};

// ─── Product Movement Report ──────────────────────

export const getProductMovementReport = async ({ product_id, branch_id, from, to }) => {
  const where = {
    product_id,
    branch_id,
    deleted_at: null,
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const openingWhere = {
    product_id,
    branch_id,
    deleted_at: null,
    created_at: from ? { lt: new Date(from) } : undefined,
  };

  const beforeMovements = from ? await prisma.stockMovement.findMany({
    where: openingWhere,
    select: { quantity: true },
  }) : [];

  const openingQty = beforeMovements.reduce((sum, m) => sum + m.quantity, 0);

  const movements = await prisma.stockMovement.findMany({
    where,
    include: {
      warehouse: { select: { id: true, name: true, name_ar: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  const product = await prisma.product.findUnique({
    where: { id: product_id },
    select: { id: true, name: true, name_ar: true, barcode: true, cost_price: true, selling_price: true },
  });

  let running = openingQty;
  const details = movements.map((m) => {
    running += m.quantity;
    return {
      id: m.id,
      date: m.created_at,
      type: m.type,
      reference_type: m.reference_type,
      warehouse: m.warehouse?.name_ar || '',
      quantity: m.quantity,
      running_balance: running,
    };
  });

  const inQty = movements.filter((m) => m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
  const outQty = movements.filter((m) => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);

  return {
    product,
    period: { from: from || 'بداية', to: to || 'نهاية' },
    opening_quantity: openingQty,
    in_quantity: inQty,
    out_quantity: outQty,
    closing_quantity: openingQty + inQty - outQty,
    movements: details,
  };
};

// ─── Slow-Moving Products Report ──────────────────

export const getSlowMovingProducts = async ({ branch_id, months = 3, page = '1', limit = '50' }) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const products = await prisma.product.findMany({
    where: { deleted_at: null, ...(branch_id && { branch_id }), is_active: true },
    include: {
      inventory_balances: { where: { quantity: { gt: 0 } }, select: { quantity: true, warehouse: { select: { name_ar: true } } } },
      sale_items: {
        where: { sale: { created_at: { gte: since }, deleted_at: null, status: 'completed' }, deleted_at: null },
        select: { quantity: true, total: true },
      },
    },
  });

  const all = products
    .map((p) => {
      const currentStock = p.inventory_balances.reduce((s, b) => s + b.quantity, 0);
      const soldQty = p.sale_items.reduce((s, i) => s + i.quantity, 0);
      const soldValue = p.sale_items.reduce((s, i) => s + i.total, 0);
      const turnoverRate = currentStock > 0 ? soldQty / currentStock : 0;
      return {
        id: p.id,
        name: p.name,
        name_ar: p.name_ar,
        barcode: p.barcode,
        current_stock: currentStock,
        sold_quantity: soldQty,
        sold_value: soldValue,
        months: months,
        turnover_rate: Math.round(turnoverRate * 100) / 100,
        warehouses: p.inventory_balances.map((b) => b.warehouse?.name_ar).filter(Boolean),
      };
    })
    .filter((p) => p.current_stock > 0)
    .sort((a, b) => a.turnover_rate - b.turnover_rate);

  const total = all.length;
  const { skip, take } = paginate(page, limit);
  return { data: all.slice(skip, skip + take), meta: paginationMeta(total, page, limit) };
};

// ─── Customer Report ──────────────────────────────

export const getCustomerReport = async ({ branch_id, from, to, page = '1', limit = '50' }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && { created_at: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } },
  };

  const customerWhere = { deleted_at: null, ...(branch_id && { branch_id }) };
  const { skip, take } = paginate(page, limit);
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: customerWhere,
      include: {
        sales: {
          where,
          select: { id: true, total: true, paid_amount: true, discount_amount: true, created_at: true, invoice_number: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.customer.count({ where: customerWhere }),
  ]);

  return {
    data: customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: c.balance,
      credit_limit: c.credit_limit,
      opening_balance: c.opening_balance,
      total_sales: c.sales.reduce((s, sale) => s + sale.total, 0),
      total_paid: c.sales.reduce((s, sale) => s + sale.paid_amount, 0),
      total_discount: c.sales.reduce((s, sale) => s + sale.discount_amount, 0),
      invoice_count: c.sales.length,
    })),
    meta: paginationMeta(total, page, limit),
  };
};

// ─── Supplier Report ──────────────────────────────

export const getSupplierReport = async ({ branch_id, from, to, page = '1', limit = '50' }) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id && { branch_id }),
    ...(from || to) && { created_at: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } },
  };

  const supplierWhere = { deleted_at: null, ...(branch_id && { branch_id }) };
  const { skip, take } = paginate(page, limit);
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where: supplierWhere,
      include: {
        purchases: {
          where,
          select: { id: true, total: true, paid_amount: true, discount_amount: true, created_at: true, invoice_number: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.supplier.count({ where: supplierWhere }),
  ]);

  return {
    data: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      balance: s.balance,
      opening_balance: s.opening_balance,
      total_purchases: s.purchases.reduce((sum, p) => sum + p.total, 0),
      total_paid: s.purchases.reduce((sum, p) => sum + p.paid_amount, 0),
      invoice_count: s.purchases.length,
    })),
    meta: paginationMeta(total, page, limit),
  };
};

// ─── Safe Box Report ──────────────────────────────

export const getSafeReport = async ({ branch_id, from, to }) => {
  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(from || to) && { created_at: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } },
  };

  const safes = await prisma.safeBox.findMany({
    where: { deleted_at: null, ...(branch_id && { branch_id }) },
    include: {
      currency: { select: { code: true, symbol: true } },
      movements: { where, orderBy: { created_at: 'desc' }, take: 100 },
    },
    orderBy: { name: 'asc' },
  });

  return safes.map((s) => ({
    id: s.id,
    name: s.name,
    name_ar: s.name_ar,
    balance: s.balance,
    currency: s.currency,
    total_cash_in: s.movements.filter((m) => m.type === 'cash_in').reduce((sum, m) => sum + m.amount, 0),
    total_cash_out: s.movements.filter((m) => m.type === 'cash_out').reduce((sum, m) => sum + m.amount, 0),
    movement_count: s.movements.length,
    recent_movements: s.movements.slice(0, 20),
  }));
};

// ─── Expense Report (detailed) ────────────────────

export const getExpenseReport = async ({ branch_id, from, to, group_by = 'category', page = '1', limit = '50' }) => {
  const where = {
    deleted_at: null,
    status: 'approved',
    ...(branch_id && { branch_id }),
    ...(from || to) && { expense_date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } },
  };

  const { skip, take } = paginate(page, limit);
  const [expenses, total, pendingCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        expense_category: { select: { id: true, name: true, name_ar: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { code: true, symbol: true } },
      },
      orderBy: { expense_date: 'desc' },
      skip,
      take,
    }),
    prisma.expense.count({ where }),
    prisma.expense.count({ where: { ...where, status: 'pending' } }),
  ]);

  const total_expenses = expenses.reduce((s, e) => s + e.amount, 0);

  let groups;
  const all = await prisma.expense.findMany({
    where,
    select: { category: true, expense_category: { select: { name_ar: true } }, user: { select: { name: true } }, payment_source: true, amount: true },
  });

  if (group_by === 'category') {
    const map = {};
    for (const e of all) {
      const key = e.expense_category?.name_ar || e.category;
      if (!map[key]) map[key] = { label: key, count: 0, total: 0 };
      map[key].count++;
      map[key].total += e.amount;
    }
    groups = Object.values(map).sort((a, b) => b.total - a.total);
  } else if (group_by === 'user') {
    const map = {};
    for (const e of all) {
      const key = e.user?.name || 'غير معروف';
      if (!map[key]) map[key] = { label: key, count: 0, total: 0 };
      map[key].count++;
      map[key].total += e.amount;
    }
    groups = Object.values(map);
  } else {
    groups = [];
  }

  const by_payment_source = { safe: 0, cash_register: 0, direct: 0 };
  for (const e of all) {
    if (e.payment_source in by_payment_source) by_payment_source[e.payment_source] += e.amount;
  }

  return {
    total_expenses,
    total_count: total,
    pending_count: pendingCount,
    by_payment_source,
    groups,
    expenses,
    meta: paginationMeta(total, page, limit),
  };
};

// ─── Excel Export ──────────────────────────────────

export const exportReport = async ({ type, branch_id, from, to, product_id }, fieldPerms = {}) => {
  let rows;
  let headers;
  let sheetName;

  const { hasProfitPerm, hasCostPerm, hasInventoryValuePerm, hasSafeBalancePerm, hasFinancialSummaryPerm } = fieldPerms;

  switch (type) {
    case 'sales_by_product': {
      const result = await getSalesByProduct({ branch_id, from, to, page: '1', limit: '1000' });
      const data = result.data;
      headers = ['المنتج', 'الباركود', 'الكمية', 'الإجمالي', 'عدد الفواتير'];
      rows = data.map((r) => [r.product?.name_ar || r.product?.name, r.product?.barcode || '', r.quantity, r.total, r.invoices]);
      sheetName = 'مبيعات حسب المنتج';
      break;
    }
    case 'sales_by_cashier': {
      const data = await getSalesByCashier({ branch_id, from, to });
      headers = ['الكاشير', 'عدد الفواتير', 'الإجمالي', 'الخصم', 'المدفوع'];
      rows = data.map((r) => [r.user?.name, r.invoices, r.total, r.discount, r.paid]);
      sheetName = 'مبيعات حسب الكاشير';
      break;
    }
    case 'purchases': {
      const data = await getPurchaseSummary({ branch_id, from, to });
      headers = ['المورد', 'عدد الفواتير', 'الإجمالي'];
      rows = data.by_supplier.map((r) => [r.supplier?.name || 'نقدي', r.count, r.total]);
      rows.unshift(['الإجمالي', data.total_purchases, data.total_amount]);
      sheetName = 'المشتريات';
      break;
    }
    case 'profit_loss': {
      const data = await getProfitLoss({ branch_id, from, to });
      headers = ['البيان', 'القيمة'];
      rows = [
        ['إجمالي المبيعات', data.total_revenue],
        ['الخصومات', data.total_discount],
        ...(hasCostPerm ? [['تكلفة البضاعة', data.cost_of_goods_sold]] : [['تكلفة البضاعة', '******']]),
        ...(hasProfitPerm ? [['إجمالي الربح', data.gross_profit]] : [['إجمالي الربح', '******']]),
        ['المصروفات', data.total_expenses],
        ...(hasProfitPerm ? [['صافي الربح', data.net_profit]] : [['صافي الربح', '******']]),
        ...(hasProfitPerm ? [['هامش الربح %', data.profit_margin_pct]] : [['هامش الربح %', '******']]),
      ];
      sheetName = 'الأرباح والخسائر';
      break;
    }
    case 'top_customers': {
      const data = await getTopCustomers({ branch_id, from, to });
      headers = ['العميل', 'رقم الهاتف', 'عدد الفواتير', 'الإجمالي', 'المدفوع', ...(hasFinancialSummaryPerm ? ['الرصيد'] : [])];
      rows = data.map((r) => {
        const row = [r.customer?.name, r.customer?.phone || '', r.invoices, r.total, r.paid];
        if (hasFinancialSummaryPerm) row.push(r.balance);
        return row;
      });
      sheetName = 'أفضل العملاء';
      break;
    }
    case 'inventory_valuation': {
      const data = await getInventoryValuation(branch_id);
      headers = ['المنتج', 'المخزن', 'الكمية', ...(hasCostPerm ? ['سعر التكلفة'] : []), 'سعر البيع', ...(hasInventoryValuePerm ? ['إجمالي التكلفة'] : []), 'إجمالي البيع'];
      rows = data.items.map((r) => {
        const row = [r.product?.name_ar || r.product?.name, r.warehouse?.name_ar || 'عام', r.quantity];
        if (hasCostPerm) row.push(r.cost_price);
        row.push(r.selling_price);
        if (hasInventoryValuePerm) row.push(r.total_cost);
        row.push(r.total_selling);
        return row;
      });
      sheetName = 'تقييم المخزون';
      break;
    }
    case 'product_movement': {
      const data = await getProductMovementReport({ product_id, branch_id, from, to });
      headers = ['التاريخ', 'النوع', 'المخزن', 'الكمية', 'الرصيد التراكمي'];
      rows = data.movements.map((r) => [
        new Date(r.date).toLocaleString('ar'),
        r.type,
        r.warehouse,
        r.quantity,
        r.running_balance,
      ]);
      rows.unshift(['رصيد افتتاحي', '', '', '', data.opening_quantity]);
      sheetName = 'حركة المنتج';
      break;
    }
    case 'slow_moving': {
      const result = await getSlowMovingProducts({ branch_id, months: parseInt(from) || 3, page: '1', limit: '1000' });
      const data = result.data;
      headers = ['المنتج', 'الباركود', 'المخزون الحالي', 'الكمية المباعة', 'قيمة المبيعات', 'معدل الدوران'];
      rows = data.map((r) => [r.name_ar || r.name, r.barcode || '', r.current_stock, r.sold_quantity, r.sold_value, r.turnover_rate]);
      sheetName = 'منتجات راكدة';
      break;
    }
    case 'customer_report': {
      const result = await getCustomerReport({ branch_id, from, to, page: '1', limit: '1000' });
      const data = result.data;
      headers = ['العميل', 'الهاتف', ...(hasFinancialSummaryPerm ? ['الرصيد'] : []), ...(hasFinancialSummaryPerm ? ['الحد الائتماني'] : []), 'عدد الفواتير', 'إجمالي المبيعات', 'إجمالي المدفوع'];
      rows = data.map((r) => {
        const row = [r.name, r.phone || ''];
        if (hasFinancialSummaryPerm) row.push(r.balance);
        if (hasFinancialSummaryPerm) row.push(r.credit_limit);
        row.push(r.invoice_count, r.total_sales, r.total_paid);
        return row;
      });
      sheetName = 'تقرير العملاء';
      break;
    }
    case 'supplier_report': {
      const result = await getSupplierReport({ branch_id, from, to, page: '1', limit: '1000' });
      const data = result.data;
      headers = ['المورد', 'الهاتف', ...(hasFinancialSummaryPerm ? ['الرصيد'] : []), 'عدد الفواتير', 'إجمالي المشتريات', 'إجمالي المدفوع'];
      rows = data.map((r) => {
        const row = [r.name, r.phone || ''];
        if (hasFinancialSummaryPerm) row.push(r.balance);
        row.push(r.invoice_count, r.total_purchases, r.total_paid);
        return row;
      });
      sheetName = 'تقرير الموردين';
      break;
    }
    case 'safe_report': {
      const data = await getSafeReport({ branch_id, from, to });
      headers = ['الخزنة', ...(hasSafeBalancePerm ? ['الرصيد'] : []), 'العملة', 'إجمالي الإيداع', 'إجمالي السحب'];
      rows = data.map((r) => {
        const row = [r.name_ar || r.name];
        if (hasSafeBalancePerm) row.push(r.balance);
        row.push(r.currency?.code || '', r.total_cash_in, r.total_cash_out);
        return row;
      });
      sheetName = 'تقرير الخزنة';
      break;
    }
    case 'expense_report': {
      const data = await getExpenseReport({ branch_id, from, to });
      headers = ['التصنيف', 'العدد', 'الإجمالي'];
      rows = data.groups.map((r) => [r.label, r.count, r.total]);
      sheetName = 'تقرير المصروفات';
      break;
    }
    default:
      throw new AppError('نوع التقرير غير معروف', 400);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Mizan POS';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName);

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, size: 12 };
  headerRow.alignment = { horizontal: 'center' };

  rows.forEach((row) => sheet.addRow(row));

  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.values.forEach((v) => {
      if (v) maxLen = Math.max(maxLen, String(v).length + 2);
    });
    col.width = Math.min(maxLen, 30);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

// ─── Dashboard ────────────────────────────────────────

export const getDashboard = async (branch_id) => {
  const cacheKey = `dashboard:${branch_id || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const branchFilter = { deleted_at: null, ...(branch_id && { branch_id }) };

  const todayWhere = {
    ...branchFilter,
    status: 'completed',
    created_at: { gte: today, lte: todayEnd },
  };

  const weekWhere = {
    ...branchFilter,
    status: 'completed',
    created_at: { gte: weekAgo },
  };

  const monthWhere = {
    ...branchFilter,
    status: 'completed',
    created_at: { gte: monthStart },
  };

  let group1, group2, group3;

  try {
    group1 = await Promise.all([
      prisma.sale.aggregate({
        where: todayWhere,
        _count: { id: true },
        _sum: { total: true, discount_amount: true, paid_amount: true },
      }),
      prisma.saleItem.groupBy({
        by: ['product_id'],
        where: { sale: { ...todayWhere }, deleted_at: null },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      prisma.sale.aggregate({
        where: weekWhere,
        _count: { id: true },
        _sum: { total: true, discount_amount: true },
      }),
      prisma.sale.aggregate({
        where: monthWhere,
        _count: { id: true },
        _sum: { total: true, discount_amount: true },
      }),
      prisma.expense.aggregate({
        where: { ...branchFilter, expense_date: { gte: today, lte: todayEnd } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);
  } catch (err) {
    group1 = [null, [], null, null, null];
  }

  try {
    group2 = await Promise.all([
      prisma.sale.findMany({
        where: branchFilter,
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true, invoice_number: true, total: true, paid_amount: true, status: true, created_at: true,
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          items: { take: 3, select: { product: { select: { id: true, name: true, name_ar: true } }, quantity: true, total: true } },
          payments: { select: { method: true, amount: true } },
        },
      }),
      getSalesSummary({ branch_id }),
      prisma.shift.count({
        where: { ...branchFilter, closed_at: null, deleted_at: null },
      }),
      prisma.expense.count({
        where: { ...branchFilter, status: 'pending', deleted_at: null },
      }),
      prisma.customer.count({ where: { ...branchFilter, deleted_at: null } }),
      prisma.supplier.count({ where: { ...branchFilter, deleted_at: null } }),
    ]);
  } catch (err) {
    group2 = [[], { today: {}, week: {}, month: {} }, 0, 0, 0, 0];
  }

  try {
    group3 = await Promise.all([
      prisma.product.findMany({
        where: { ...branchFilter, is_active: true, min_stock: { gt: 0 } },
        select: {
          id: true, name: true, name_ar: true, min_stock: true,
          inventory_balances: { select: { quantity: true } },
        },
      }).then((products) =>
        products
          .filter((p) => {
            const balance = p.inventory_balances.reduce((sum, b) => sum + b.quantity, 0);
            return balance <= p.min_stock;
          })
          .map((p) => ({
            id: p.id,
            name: p.name,
            name_ar: p.name_ar,
            current_stock: p.inventory_balances.reduce((sum, b) => sum + b.quantity, 0),
            min_stock: p.min_stock,
          }))
      ),
      prisma.safeBox.findMany({
        where: { deleted_at: null, ...(branch_id && { branch_id }) },
        select: { id: true, name: true, name_ar: true, balance: true, currency: { select: { code: true, symbol: true } } },
      }),
    ]);
  } catch (err) {
    group3 = [[], []];
  }

  const [todaySales, topProducts, weekSales, monthSales, todayExpenses] = group1;
  const [recentSales, summary, activeShifts, pendingExpensesCount, totalCustomers, totalSuppliers] = group2;
  const [lowStockProducts, safeBalances] = group3;

  const productIds = Array.isArray(topProducts) ? topProducts.map((p) => p.product_id) : [];
  const products = productIds.length > 0 ? await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, name_ar: true },
  }) : [];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const result = {
    today: {
      sales_count: todaySales?._count?.id || 0,
      total: todaySales?._sum?.total || 0,
      discount: todaySales?._sum?.discount_amount || 0,
      paid: todaySales?._sum?.paid_amount || 0,
      top_products: Array.isArray(topProducts) ? topProducts.map((p) => ({
        product: productMap[p.product_id] || { id: p.product_id, name: 'غير معروف' },
        quantity: p._sum?.quantity || 0,
        total: p._sum?.total || 0,
      })) : [],
    },
    week: {
      sales_count: weekSales?._count?.id || 0,
      total: weekSales?._sum?.total || 0,
      discount: weekSales?._sum?.discount_amount || 0,
    },
    month: {
      sales_count: monthSales?._count?.id || 0,
      total: monthSales?._sum?.total || 0,
      discount: monthSales?._sum?.discount_amount || 0,
    },
    today_expenses: {
      total: todayExpenses?._sum?.amount || 0,
      count: todayExpenses?._count?.id || 0,
    },
    pending_expenses: pendingExpensesCount || 0,
    active_shifts: activeShifts || 0,
    total_customers: totalCustomers || 0,
    total_suppliers: totalSuppliers || 0,
    safe_balances: safeBalances || [],
    recent_sales: recentSales || [],
    low_stock_products: lowStockProducts || [],
    summary: summary || {},
  };

  cacheSet(cacheKey, result, 30);
  return result;
};
