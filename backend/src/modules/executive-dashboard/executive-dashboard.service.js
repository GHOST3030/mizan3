import { prisma } from '../../lib/prisma.js';
import { get as cacheGet, set as cacheSet } from '../../lib/cache.js';

const DASHBOARD_CACHE_TTL = 60;
const INVENTORY_CACHE_TTL = 120;

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfLastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfLastMonth = () => {
  const d = new Date();
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const buildBranchWhere = (branch_id) => ({
  ...(branch_id ? { branch_id } : {}),
});

const saleWhereCompleted = (branch_id, dateFilter = {}) => ({
  deleted_at: null,
  status: 'completed',
  ...buildBranchWhere(branch_id),
  ...dateFilter,
});

export const getTodayCards = async (branch_id) => {
  const cacheKey = `exec-dash:today:${branch_id || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const todayWhere = {
    created_at: { gte: todayStart, lte: todayEnd },
  };

  const [todaySales, saleItemsGrouped, todayExpenses, activeCustomersCount] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhereCompleted(branch_id, todayWhere),
      _count: { id: true },
      _sum: { total: true, discount_amount: true, paid_amount: true },
    }),
    prisma.saleItem.groupBy({
      by: ['product_id'],
      where: { sale: { ...saleWhereCompleted(branch_id, todayWhere) }, deleted_at: null },
      _sum: { quantity: true },
    }),
    prisma.expense.aggregate({
      where: { deleted_at: null, ...buildBranchWhere(branch_id), expense_date: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.sale.groupBy({
      by: ['customer_id'],
      where: { ...saleWhereCompleted(branch_id, todayWhere), customer_id: { not: null } },
      _count: { customer_id: true },
    }).then((groups) => groups.length),
  ]);

  const productIds = saleItemsGrouped.map((i) => i.product_id);
  const products = productIds.length > 0 ? await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, cost_price: true },
  }) : [];
  const costMap = Object.fromEntries(products.map((p) => [p.id, p.cost_price]));

  const cogs = saleItemsGrouped.reduce((sum, item) => sum + (costMap[item.product_id] || 0) * (item._sum.quantity || 0), 0);
  const totalSales = todaySales._sum.total || 0;

  const todayProfit = totalSales - cogs - (todayExpenses._sum.amount || 0);

  let yesterdaySalesTotal = 0;
  let yesterdayProfit = 0;
  let salesTrend = null;
  let profitTrend = null;

  try {
    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const yesterdayWhere = { created_at: { gte: yesterdayStart, lte: yesterdayEnd } };

    const [yesterdaySales, yesterdaySaleItems, yesterdayExpensesAgg] = await Promise.all([
      prisma.sale.aggregate({
        where: saleWhereCompleted(branch_id, yesterdayWhere),
        _sum: { total: true },
      }),
      prisma.saleItem.groupBy({
        by: ['product_id'],
        where: { sale: { ...saleWhereCompleted(branch_id, yesterdayWhere) }, deleted_at: null },
        _sum: { quantity: true },
      }),
      prisma.expense.aggregate({
        where: { deleted_at: null, ...buildBranchWhere(branch_id), expense_date: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { amount: true },
      }),
    ]);

    const yesterdayProductIds = yesterdaySaleItems.map((i) => i.product_id);
    const yesterdayProducts = yesterdayProductIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: yesterdayProductIds } },
      select: { id: true, cost_price: true },
    }) : [];
    const yesterdayCostMap = Object.fromEntries(yesterdayProducts.map((p) => [p.id, p.cost_price]));

    const yesterdayCogs = yesterdaySaleItems.reduce((sum, item) => sum + (yesterdayCostMap[item.product_id] || 0) * (item._sum.quantity || 0), 0);
    yesterdaySalesTotal = yesterdaySales._sum.total || 0;
    yesterdayProfit = yesterdaySalesTotal - yesterdayCogs - (yesterdayExpensesAgg._sum.amount || 0);

    if (yesterdaySalesTotal > 0) {
      salesTrend = ((totalSales - yesterdaySalesTotal) / yesterdaySalesTotal) * 100;
    }
    if (yesterdayProfit > 0) {
      profitTrend = ((todayProfit - yesterdayProfit) / yesterdayProfit) * 100;
    }
  } catch (err) {
    // Trend data is best-effort
  }

  const result = {
    total_sales: totalSales,
    net_profit: Math.max(0, todayProfit),
    invoice_count: todaySales._count.id || 0,
    active_customers: activeCustomersCount,
    total_discount: todaySales._sum.discount_amount || 0,
    total_paid: todaySales._sum.paid_amount || 0,
    expenses: todayExpenses._sum.amount || 0,
    expense_count: todayExpenses._count.id || 0,
    trends: {
      sales: salesTrend !== null ? Math.round(salesTrend * 100) / 100 : null,
      profit: profitTrend !== null ? Math.round(profitTrend * 100) / 100 : null,
      yesterday_sales: yesterdaySalesTotal,
      yesterday_profit: Math.max(0, yesterdayProfit),
    },
  };

  cacheSet(cacheKey, result, DASHBOARD_CACHE_TTL);
  return result;
};

export const getMonthCards = async (branch_id) => {
  const cacheKey = `exec-dash:month:${branch_id || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const monthStart = startOfMonth();
  const monthWhere = { created_at: { gte: monthStart } };

  const [monthSales, saleItemsGrouped, monthExpenses, monthPurchases] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhereCompleted(branch_id, monthWhere),
      _count: { id: true },
      _sum: { total: true, discount_amount: true },
    }),
    prisma.saleItem.groupBy({
      by: ['product_id'],
      where: { sale: { ...saleWhereCompleted(branch_id, monthWhere) }, deleted_at: null },
      _sum: { quantity: true },
    }),
    prisma.expense.aggregate({
      where: { deleted_at: null, ...buildBranchWhere(branch_id), expense_date: { gte: monthStart }, status: 'approved' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.purchase.aggregate({
      where: { deleted_at: null, status: 'completed', ...buildBranchWhere(branch_id), created_at: { gte: monthStart } },
      _sum: { total: true },
      _count: { id: true },
    }),
  ]);

  const productIds = saleItemsGrouped.map((i) => i.product_id);
  const products = productIds.length > 0 ? await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, cost_price: true },
  }) : [];
  const costMap = Object.fromEntries(products.map((p) => [p.id, p.cost_price]));

  const cogs = saleItemsGrouped.reduce((sum, item) => sum + (costMap[item.product_id] || 0) * (item._sum.quantity || 0), 0);
  const totalRevenue = monthSales._sum.total || 0;
  const totalExpenses = monthExpenses._sum.amount || 0;
  const monthProfit = totalRevenue - cogs - totalExpenses;

  let lastMonthSalesTotal = 0;
  let lastMonthProfit = 0;
  let lastMonthExpensesTotal = 0;
  let salesTrend = null;
  let profitTrend = null;
  let expenseTrend = null;

  try {
    const lastMonthStart = startOfLastMonth();
    const lastMonthEnd = endOfLastMonth();
    const lastMonthWhere = { created_at: { gte: lastMonthStart, lte: lastMonthEnd } };

    const [lastMonthSales, lastMonthSaleItems, lastMonthExpenses] = await Promise.all([
      prisma.sale.aggregate({
        where: saleWhereCompleted(branch_id, lastMonthWhere),
        _sum: { total: true },
      }),
      prisma.saleItem.groupBy({
        by: ['product_id'],
        where: { sale: { ...saleWhereCompleted(branch_id, lastMonthWhere) }, deleted_at: null },
        _sum: { quantity: true },
      }),
      prisma.expense.aggregate({
        where: { deleted_at: null, ...buildBranchWhere(branch_id), expense_date: { gte: lastMonthStart, lte: lastMonthEnd }, status: 'approved' },
        _sum: { amount: true },
      }),
    ]);

    const lastMonthProductIds = lastMonthSaleItems.map((i) => i.product_id);
    const lastMonthProducts = lastMonthProductIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: lastMonthProductIds } },
      select: { id: true, cost_price: true },
    }) : [];
    const lastMonthCostMap = Object.fromEntries(lastMonthProducts.map((p) => [p.id, p.cost_price]));
    const lastMonthCogs = lastMonthSaleItems.reduce((sum, item) => sum + (lastMonthCostMap[item.product_id] || 0) * (item._sum.quantity || 0), 0);

    lastMonthSalesTotal = lastMonthSales._sum.total || 0;
    lastMonthExpensesTotal = lastMonthExpenses._sum.amount || 0;
    lastMonthProfit = lastMonthSalesTotal - lastMonthCogs - lastMonthExpensesTotal;

    if (lastMonthSalesTotal > 0) {
      salesTrend = ((totalRevenue - lastMonthSalesTotal) / lastMonthSalesTotal) * 100;
    }
    if (lastMonthProfit > 0) {
      profitTrend = ((monthProfit - lastMonthProfit) / lastMonthProfit) * 100;
    }
    if (lastMonthExpensesTotal > 0) {
      expenseTrend = ((totalExpenses - lastMonthExpensesTotal) / lastMonthExpensesTotal) * 100;
    }
  } catch (err) {
    // Trend data is best-effort
  }

  const result = {
    total_sales: totalRevenue,
    total_profit: Math.max(0, monthProfit),
    total_expenses: totalExpenses,
    total_purchases: (monthPurchases._sum.total || 0) - (monthPurchases._count.id || 0 > 0 ? monthSales._sum.discount_amount || 0 : 0),
    sales_count: monthSales._count.id || 0,
    expense_count: monthExpenses._count.id || 0,
    purchase_count: monthPurchases._count.id || 0,
    purchase_amount: monthPurchases._sum.total || 0,
    trends: {
      sales: salesTrend !== null ? Math.round(salesTrend * 100) / 100 : null,
      profit: profitTrend !== null ? Math.round(profitTrend * 100) / 100 : null,
      expenses: expenseTrend !== null ? Math.round(expenseTrend * 100) / 100 : null,
      last_month_sales: lastMonthSalesTotal,
      last_month_profit: Math.max(0, lastMonthProfit),
      last_month_expenses: lastMonthExpensesTotal,
    },
  };

  cacheSet(cacheKey, result, DASHBOARD_CACHE_TTL);
  return result;
};

export const getInventoryCards = async (branch_id) => {
  const cacheKey = `exec-dash:inventory:${branch_id || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const branchFilter = buildBranchWhere(branch_id);

  const [inventoryBalances, totalProducts, lowStockProducts] = await Promise.all([
    prisma.inventoryBalance.findMany({
      where: { quantity: { gt: 0 }, ...branchFilter },
      select: { quantity: true, product: { select: { cost_price: true, selling_price: true } } },
    }),
    prisma.product.count({ where: { deleted_at: null, is_active: true, ...branchFilter } }),
    prisma.product.findMany({
      where: { deleted_at: null, is_active: true, min_stock: { gt: 0 }, ...branchFilter },
      select: {
        id: true, name: true, name_ar: true, min_stock: true,
        inventory_balances: { where: { quantity: { gt: 0 } }, select: { quantity: true } },
      },
    }),
  ]);

  const inventoryValue = inventoryBalances.reduce((sum, b) => sum + (b.product.cost_price * b.quantity), 0);
  const inventorySellingValue = inventoryBalances.reduce((sum, b) => sum + (b.product.selling_price * b.quantity), 0);

  let lowStock = 0;
  let outOfStock = 0;
  const lowStockList = [];

  for (const p of lowStockProducts) {
    const balance = p.inventory_balances.reduce((s, b) => s + b.quantity, 0);
    if (balance === 0) {
      outOfStock++;
    } else if (balance <= p.min_stock) {
      lowStock++;
      lowStockList.push({ id: p.id, name: p.name, name_ar: p.name_ar, current_stock: balance, min_stock: p.min_stock });
    }
  }

  const result = {
    inventory_value: inventoryValue,
    inventory_selling_value: inventorySellingValue,
    total_products: totalProducts,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
    low_stock_products: lowStockList,
  };

  cacheSet(cacheKey, result, INVENTORY_CACHE_TTL);
  return result;
};

export const getFinanceCards = async (branch_id) => {
  const cacheKey = `exec-dash:finance:${branch_id || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const branchFilter = buildBranchWhere(branch_id);

  const [cashRegisters, safeBoxes, overdueReceivablesAgg, overduePayablesAgg, pendingScheduleCount, totalCustomers, totalSuppliers] = await Promise.all([
    prisma.cashRegister.findMany({
      where: { deleted_at: null, ...branchFilter },
      select: { id: true, name: true, balance: true, currency: { select: { code: true, symbol: true } } },
    }),
    prisma.safeBox.findMany({
      where: { deleted_at: null, is_active: true, ...branchFilter },
      select: { id: true, name: true, name_ar: true, balance: true, currency: { select: { code: true, symbol: true } } },
    }),
    prisma.paymentSchedule.aggregate({
      where: {
        status: { in: ['pending', 'partial'] },
        due_date: { lt: new Date() },
        sale: { deleted_at: null, status: 'completed', ...branchFilter },
      },
      _sum: { amount: true, paid_amount: true },
      _count: { id: true },
    }),
    prisma.purchase.aggregate({
      where: { deleted_at: null, status: 'completed', ...branchFilter },
      _sum: { total: true, paid_amount: true },
    }),
    prisma.paymentSchedule.count({
      where: { status: { in: ['pending', 'partial'] }, sale: { deleted_at: null, ...branchFilter } },
    }),
    prisma.customer.count({ where: { deleted_at: null, ...branchFilter } }),
    prisma.supplier.count({ where: { deleted_at: null, ...branchFilter } }),
  ]);

  const totalCashBalance = cashRegisters.reduce((sum, r) => sum + r.balance, 0);
  const totalSafeBalance = safeBoxes.reduce((sum, s) => sum + s.balance, 0);

  const outstandingReceivables = (overdueReceivablesAgg._sum.amount || 0) - (overdueReceivablesAgg._sum.paid_amount || 0);
  const outstandingPayables = (overduePayablesAgg._sum.total || 0) - (overduePayablesAgg._sum.paid_amount || 0);

  const result = {
    cash_balance: totalCashBalance,
    safe_balance: totalSafeBalance,
    cash_registers: cashRegisters,
    safe_boxes: safeBoxes,
    outstanding_receivables: Math.max(0, outstandingReceivables),
    outstanding_payables: Math.max(0, outstandingPayables),
    pending_payment_schedules_count: pendingScheduleCount,
    total_customers: totalCustomers || 0,
    total_suppliers: totalSuppliers || 0,
  };

  cacheSet(cacheKey, result, DASHBOARD_CACHE_TTL);
  return result;
};

export const getTopProducts = async (branch_id, limit = 10) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id ? { branch_id } : {}),
  };

  const items = await prisma.saleItem.groupBy({
    by: ['product_id'],
    where: { sale: where, deleted_at: null },
    _sum: { quantity: true, total: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });

  const productIds = items.map((i) => i.product_id);
  const products = productIds.length > 0 ? await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, name_ar: true, barcode: true, selling_price: true },
  }) : [];
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const byRevenue = items.map((i) => ({
    product: productMap[i.product_id] || { id: i.product_id, name: 'غير معروف', name_ar: 'غير معروف' },
    total: i._sum.total || 0,
    quantity: i._sum.quantity || 0,
  }));

  const byQuantity = [...byRevenue].sort((a, b) => b.quantity - a.quantity).slice(0, limit);

  return { by_revenue: byRevenue, by_quantity: byQuantity };
};

export const getTopCustomers = async (branch_id, limit = 10) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id ? { branch_id } : {}),
    customer_id: { not: null },
  };

  const sales = await prisma.sale.groupBy({
    by: ['customer_id'],
    where,
    _sum: { total: true, paid_amount: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });

  const customerIds = sales.map((s) => s.customer_id);
  const customers = customerIds.length > 0 ? await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true, phone: true, balance: true, credit_limit: true },
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

export const getTopSuppliers = async (branch_id, limit = 10) => {
  const where = {
    deleted_at: null,
    status: 'completed',
    ...(branch_id ? { branch_id } : {}),
    supplier_id: { not: null },
  };

  const purchases = await prisma.purchase.groupBy({
    by: ['supplier_id'],
    where,
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });

  const supplierIds = purchases.map((p) => p.supplier_id);
  const suppliers = supplierIds.length > 0 ? await prisma.supplier.findMany({
    where: { id: { in: supplierIds } },
    select: { id: true, name: true, phone: true, balance: true },
  }) : [];
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]));

  return purchases.map((p) => ({
    supplier: supplierMap[p.supplier_id] || { id: p.supplier_id, name: 'محذوف' },
    count: p._count.id,
    total: p._sum.total || 0,
  }));
};

export const getAlerts = async (branch_id) => {
  const cacheKey = `exec-dash:alerts:${branch_id || 'all'}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const branchFilter = buildBranchWhere(branch_id);

  const [lowStockProducts, negativeCashRegisters, pendingExpenses, overdueScheduleCount, overdueScheduleTotal, overduePayableTotal] = await Promise.all([
    prisma.product.findMany({
      where: { deleted_at: null, is_active: true, min_stock: { gt: 0 }, ...branchFilter },
      select: {
        id: true, name: true, name_ar: true, min_stock: true,
        inventory_balances: { select: { quantity: true } },
      },
    }),
    prisma.cashRegister.findMany({
      where: { deleted_at: null, ...branchFilter, balance: { lt: 0 } },
      select: { id: true, name: true, balance: true },
    }),
    prisma.expense.count({
      where: { deleted_at: null, status: 'pending', ...branchFilter },
    }),
    prisma.paymentSchedule.count({
      where: {
        status: { in: ['pending', 'partial'] },
        due_date: { lt: new Date() },
        sale: { deleted_at: null, status: 'completed', ...branchFilter },
      },
    }),
    prisma.paymentSchedule.aggregate({
      where: {
        status: { in: ['pending', 'partial'] },
        due_date: { lt: new Date() },
        sale: { deleted_at: null, status: 'completed', ...branchFilter },
      },
      _sum: { amount: true, paid_amount: true },
    }),
    prisma.purchase.aggregate({
      where: { deleted_at: null, status: 'completed', ...branchFilter },
      _sum: { total: true, paid_amount: true },
    }),
  ]);

  const alerts = [];

  const lowStock = lowStockProducts
    .map((p) => {
      const balance = p.inventory_balances.reduce((s, b) => s + b.quantity, 0);
      return { ...p, current_stock: balance };
    })
    .filter((p) => p.current_stock <= p.min_stock);

  if (lowStock.length > 0) {
    alerts.push({
      type: 'danger',
      title: 'مخزون منخفض',
      message: `يوجد ${lowStock.length} منتجات تحتاج إلى إعادة طلب`,
      count: lowStock.length,
      link: '/inventory/low-stock',
      items: lowStock.slice(0, 5).map((p) => ({ id: p.id, name_ar: p.name_ar, current_stock: p.current_stock, min_stock: p.min_stock })),
    });
  }

  if (negativeCashRegisters.length > 0) {
    alerts.push({
      type: 'danger',
      title: 'رصيد سلبي في الصندوق',
      message: `يوجد ${negativeCashRegisters.length} صناديق برصيد سلبي`,
      count: negativeCashRegisters.length,
      link: '/cash-registers',
    });
  }

  if (pendingExpenses > 0) {
    alerts.push({
      type: 'warning',
      title: 'مصروفات معلقة',
      message: `يوجد ${pendingExpenses} مصروفات تنتظر الاعتماد`,
      count: pendingExpenses,
      link: '/expenses',
    });
  }

  if (overdueScheduleCount > 0) {
    const totalOverdue = (overdueScheduleTotal._sum.amount || 0) - (overdueScheduleTotal._sum.paid_amount || 0);
    alerts.push({
      type: 'warning',
      title: 'ذمم مدينة متأخرة',
      message: `إجمالي ${totalOverdue.toLocaleString()} ريال من ${overdueScheduleCount} فاتورة`,
      count: overdueScheduleCount,
      amount: totalOverdue,
      link: '/pending-payments',
    });
  }

  const overduePayablesAmount = (overduePayableTotal._sum.total || 0) - (overduePayableTotal._sum.paid_amount || 0);
  if (overduePayablesAmount > 0) {
    alerts.push({
      type: 'info',
      title: 'ذمم دائنة مستحقة',
      message: `إجمالي ${overduePayablesAmount.toLocaleString()} ريال للموردين`,
      count: 0,
      amount: overduePayablesAmount,
      link: '/purchases',
    });
  }

  const result = { alerts, low_stock_count: lowStock.length, pending_expenses: pendingExpenses };
  cacheSet(cacheKey, result, DASHBOARD_CACHE_TTL);
  return result;
};

export const getDailySalesTrend = async (branch_id, days = 30) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: {
      deleted_at: null,
      status: 'completed',
      created_at: { gte: start, lte: end },
      ...(branch_id ? { branch_id } : {}),
    },
    select: { total: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  const dailyMap = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = { date: key, sales: 0 };
  }

  for (const sale of sales) {
    const key = sale.created_at.toISOString().split('T')[0];
    if (dailyMap[key]) dailyMap[key].sales += sale.total;
  }

  return Object.values(dailyMap);
};

export const getMonthlyRevenueTrend = async (branch_id, months = 12) => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setMonth(start.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: {
      deleted_at: null,
      status: 'completed',
      created_at: { gte: start, lte: end },
      ...(branch_id ? { branch_id } : {}),
    },
    select: { total: true, created_at: true },
  });

  const monthMap = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const labels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    monthMap[key] = { month: key, label: labels[d.getMonth()], revenue: 0 };
  }

  for (const sale of sales) {
    const key = `${sale.created_at.getFullYear()}-${String(sale.created_at.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) monthMap[key].revenue += sale.total;
  }

  return Object.values(monthMap);
};

export const getFullDashboard = async (branch_id) => {
  const partial = {};

  try {
    const [today, month] = await Promise.all([
      getTodayCards(branch_id),
      getMonthCards(branch_id),
    ]);
    partial.today = today;
    partial.month = month;
  } catch (err) {
    partial.today = null;
    partial.month = null;
  }

  try {
    const [inventory, finance, alerts] = await Promise.all([
      getInventoryCards(branch_id),
      getFinanceCards(branch_id),
      getAlerts(branch_id),
    ]);
    partial.inventory = inventory;
    partial.finance = finance;
    partial.alerts = alerts.alerts;
  } catch (err) {
    partial.inventory = null;
    partial.finance = null;
    partial.alerts = [];
  }

  try {
    const [topProducts, topCustomers, topSuppliers] = await Promise.all([
      getTopProducts(branch_id),
      getTopCustomers(branch_id),
      getTopSuppliers(branch_id),
    ]);
    partial.top_products = topProducts;
    partial.top_customers = topCustomers;
    partial.top_suppliers = topSuppliers;
  } catch (err) {
    partial.top_products = { by_revenue: [], by_quantity: [] };
    partial.top_customers = [];
    partial.top_suppliers = [];
  }

  try {
    const [dailyTrend, monthlyTrend] = await Promise.all([
      getDailySalesTrend(branch_id),
      getMonthlyRevenueTrend(branch_id),
    ]);
    partial.daily_sales_trend = dailyTrend;
    partial.monthly_revenue_trend = monthlyTrend;
  } catch (err) {
    partial.daily_sales_trend = [];
    partial.monthly_revenue_trend = [];
  }

  return partial;
};
