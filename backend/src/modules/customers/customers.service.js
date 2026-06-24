import { AppError } from '../../utils/AppError.js';
﻿import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

export const getCustomerGroups = async () => {
  return prisma.customerGroup.findMany({
    where: { deleted_at: null },
    include: {
      children: { where: { deleted_at: null }, select: { id: true, name: true } },
      _count: { select: { customers: true } },
    },
    orderBy: { name: 'asc' },
  });
};

export const createCustomerGroup = async (data) => {
  const { user_id, ...dbData } = data;
  if (dbData.parent_id) {
    const parent = await prisma.customerGroup.findFirst({
      where: { id: dbData.parent_id, deleted_at: null },
    });
    if (!parent) throw new AppError('المجموعة الأب غير موجودة', 404);
  }
  const result = await prisma.customerGroup.create({ data: dbData });
  audit('create_customer_group', 'customer_group', result.id, {
    user_id,
    metadata: { name: result.name, parent_id: dbData.parent_id },
  });
  return result;
};

export const updateCustomerGroup = async (id, data) => {
  const { user_id, ...dbData } = data;
  const group = await prisma.customerGroup.findFirst({
    where: { id, deleted_at: null },
  });
  if (!group) throw new AppError('المجموعة غير موجودة', 404);
  const result = await prisma.customerGroup.update({ where: { id }, data: dbData });
  audit('update_customer_group', 'customer_group', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteCustomerGroup = async (id, user_id) => {
  const group = await prisma.customerGroup.findFirst({
    where: { id, deleted_at: null },
  });
  if (!group) throw new AppError('المجموعة غير موجودة', 404);
  const hasCustomers = await prisma.customer.findFirst({
    where: { customer_group_id: id, deleted_at: null },
  });
  if (hasCustomers) throw new AppError('لا يمكن حذف مجموعة مرتبطة بعملاء', 400);
  const result = await prisma.customerGroup.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
  audit('delete_customer_group', 'customer_group', id, {
    user_id,
    metadata: { name: group.name },
  });
  return result;
};

export const getCustomers = async ({ q, group_id, branch_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(group_id && { customer_group_id: group_id }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        group: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getCustomerById = async (id) => {
  const customer = await prisma.customer.findFirst({
    where: { id, deleted_at: null },
    include: { group: true },
  });
  if (!customer) throw new AppError('العميل غير موجود', 404);
  return customer;
};

export const createCustomer = async (data) => {
  const { user_id, ...dbData } = data;
  if (dbData.customer_group_id) {
    const group = await prisma.customerGroup.findFirst({
      where: { id: dbData.customer_group_id, deleted_at: null },
    });
    if (!group) throw new AppError('المجموعة غير موجودة', 404);
  }
  const result = await prisma.customer.create({
    data: dbData,
    include: { group: { select: { id: true, name: true } } },
  });
  audit('create_customer', 'customer', result.id, {
    branch_id: result.branch_id,
    user_id,
    metadata: { name: result.name, phone: result.phone },
  });
  return result;
};

export const updateCustomer = async (id, data) => {
  const { user_id, ...dbData } = data;
  const customer = await prisma.customer.findFirst({
    where: { id, deleted_at: null },
  });
  if (!customer) throw new AppError('العميل غير موجود', 404);

  if (dbData.customer_group_id) {
    const group = await prisma.customerGroup.findFirst({
      where: { id: dbData.customer_group_id, deleted_at: null },
    });
    if (!group) throw new AppError('المجموعة غير موجودة', 404);
  }

  const result = await prisma.customer.update({
    where: { id },
    data: dbData,
    include: { group: { select: { id: true, name: true } } },
  });
  audit('update_customer', 'customer', id, {
    branch_id: customer.branch_id,
    user_id,
    metadata: { name: customer.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteCustomer = async (id, user_id) => {
  const customer = await prisma.customer.findFirst({
    where: { id, deleted_at: null },
  });
  if (!customer) throw new AppError('العميل غير موجود', 404);
  const result = await prisma.customer.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
  audit('delete_customer', 'customer', id, {
    branch_id: customer.branch_id,
    user_id,
    metadata: { name: customer.name },
  });
  return result;
};

// ─── Opening Balance ───────────────────────────────────

export const setCustomerOpeningBalance = async (id, data) => {
  const customer = await prisma.customer.findFirst({
    where: { id, deleted_at: null },
  });
  if (!customer) throw new AppError('العميل غير موجود', 404);

  const result = await prisma.customer.update({
    where: { id },
    data: {
      opening_balance: data.opening_balance,
      opening_balance_date: data.opening_balance_date ? new Date(data.opening_balance_date) : null,
    },
    include: { group: { select: { id: true, name: true } } },
  });

  audit('set_customer_opening_balance', 'customer', id, {
    branch_id: customer.branch_id,
    user_id: data.user_id,
    metadata: { name: customer.name, opening_balance: data.opening_balance, previous_balance: customer.opening_balance },
  });

  return result;
};

// ─── Customer Statement ───────────────────────────────

export const getCustomerStatement = async (customerId, { from, to, page = '1', limit = '50' }) => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, deleted_at: null },
    include: { group: { select: { id: true, name: true } } },
  });
  if (!customer) throw new AppError('العميل غير موجود', 404);

  const dateFilter = (from || to) ? {
    created_at: {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    },
  } : {};

  const saleWhere = { customer_id: customerId, deleted_at: null, ...dateFilter };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const [sales, total, allSales, schedules] = await Promise.all([
    prisma.sale.findMany({
      where: saleWhere,
      include: {
        currency: { select: { id: true, code: true, symbol: true } },
        user: { select: { id: true, name: true } },
        items: {
          include: { product: { select: { id: true, name: true, name_ar: true } } },
        },
        payments: {
          include: { currency: { select: { id: true, code: true, symbol: true } } },
        },
        payment_schedules: {
          where: { deleted_at: null },
          select: { id: true, amount: true, paid_amount: true, status: true, due_date: true },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.sale.count({ where: saleWhere }),
    prisma.sale.findMany({
      where: saleWhere,
      select: { id: true, total: true, paid_amount: true, status: true, payments: { select: { amount: true } } },
    }),
    prisma.paymentSchedule.findMany({
      where: {
        sale: { customer_id: customerId, deleted_at: null, ...dateFilter },
        deleted_at: null,
        status: { in: ['pending', 'partial'] },
      },
      select: {
        id: true, sale_id: true, amount: true, paid_amount: true, status: true, due_date: true,
      },
      orderBy: { created_at: 'desc' },
    }),
  ]);

  const scheduleBySale = Object.fromEntries(
    schedules.map((s) => [s.sale_id, s]),
  );

  const transactions = sales.flatMap((sale) => {
    const entries = [];
    const schedule = scheduleBySale[sale.id];
    const paidAmount = sale.paid_amount || 0;
    const remaining = sale.status === 'returned' || sale.status === 'cancelled' ? 0 : Math.max(0, sale.total - paidAmount);

    entries.push({
      type: sale.status === 'returned' ? 'return' : 'sale',
      date: sale.created_at,
      invoice_number: sale.invoice_number,
      description: `فاتورة ${sale.status === 'returned' ? 'مرتجعة' : 'بيع'} #${sale.invoice_number}`,
      debit: sale.status === 'returned' ? 0 : sale.total,
      credit: sale.status === 'returned' ? sale.total : 0,
      currency: sale.currency,
      cashier_name: sale.user?.name || '—',
      sale_id: sale.id,
      status: sale.status,
      paid_amount: paidAmount,
      remaining,
      schedule_id: schedule?.id || null,
      schedule_status: schedule?.status || null,
      schedule_due_date: schedule?.due_date || null,
      items: sale.items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product?.name_ar || item.product?.name || 'منتج',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
      })),
    });

    if (sale.status !== 'returned') {
      for (const payment of sale.payments) {
        entries.push({
          type: 'payment',
          date: payment.created_at,
          invoice_number: sale.invoice_number,
          description: `دفعة - ${payment.method === 'cash' ? 'نقدي' : payment.method === 'card' ? 'بطاقة' : payment.method === 'transfer' ? 'تحويل' : 'آجل'} #${sale.invoice_number}`,
          debit: 0,
          credit: payment.amount,
          currency: payment.currency,
          sale_id: sale.id,
          payment_method: payment.method,
        });
      }
    }

    return entries;
  });

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let runningBalance = customer.opening_balance;
  const transactionsWithBalance = transactions.map((t) => {
    runningBalance += t.debit - t.credit;
    return { ...t, running_balance: runningBalance };
  });

  const totalSales = allSales.filter((s) => s.status === 'completed').reduce((sum, s) => sum + s.total, 0);
  const totalPaid = allSales.filter((s) => s.status !== 'returned').flatMap((s) => s.payments).reduce((sum, p) => sum + p.amount, 0);
  const totalReturned = allSales.filter((s) => s.status === 'returned').reduce((sum, s) => sum + s.total, 0);
  const currentBalance = customer.opening_balance + totalSales - totalPaid + totalReturned;

  const totalCreditRemaining = schedules.reduce((sum, s) => sum + (s.amount - s.paid_amount), 0);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      group: customer.group,
      balance: customer.balance,
      credit_limit: customer.credit_limit,
      opening_balance: customer.opening_balance,
      opening_balance_date: customer.opening_balance_date,
    },
    summary: {
      opening_balance: customer.opening_balance,
      total_sales: totalSales,
      total_paid: totalPaid,
      total_returned: totalReturned,
      credit_remaining: totalCreditRemaining,
      balance: currentBalance,
    },
    transactions: transactionsWithBalance,
    schedules,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};
