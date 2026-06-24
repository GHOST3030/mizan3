import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';
import { AppError } from '../../utils/AppError.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

// ─── Shifts ──────────────────────────────────────────

export const getShifts = async ({ branch_id, user_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(user_id && { user_id }),
  };

  const [shifts, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { opened_at: 'desc' },
      skip,
      take,
    }),
    prisma.shift.count({ where }),
  ]);

  return {
    data: shifts,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getShiftById = async (id) => {
  const shift = await prisma.shift.findFirst({
    where: { id, deleted_at: null },
    include: {
      user: { select: { id: true, name: true } },
      sales: {
        where: { deleted_at: null },
        include: {
          payments: true,
          items: { include: { product: { select: { id: true, name: true, name_ar: true } } } },
        },
        orderBy: { created_at: 'desc' },
      },
    },
  });
  if (!shift) throw new AppError('الوردية غير موجودة', 404);
  return shift;
};

export const openShift = async (data) => {
  const existing = await prisma.shift.findFirst({
    where: { user_id: data.user_id, closed_at: null, deleted_at: null },
  });
  if (existing) throw new AppError('لديك وردية مفتوحة بالفعل', 400);

  const result = await prisma.shift.create({
    data: {
      branch_id: data.branch_id,
      user_id: data.user_id,
      opening_balance: data.opening_balance,
      notes: data.notes,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  audit('open_shift', 'shift', result.id, {
    branch_id: data.branch_id,
    user_id: data.user_id,
    metadata: { opening_balance: data.opening_balance },
  });

  return result;
};

export const closeShift = async (id, data) => {
  const shift = await prisma.shift.findFirst({
    where: { id, deleted_at: null },
    include: {
      sales: {
        where: { deleted_at: null, status: 'completed' },
        include: { payments: true },
      },
    },
  });
  if (!shift) throw new AppError('الوردية غير موجودة', 404);
  if (shift.closed_at) throw new AppError('الوردية مغلقة بالفعل', 400);

  const totalCashPayments = shift.sales.reduce((sum, sale) => {
    const cashPayments = sale.payments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
    return sum + cashPayments;
  }, 0);

  const expectedBalance = shift.opening_balance + totalCashPayments;
  const closingBalance = data.closing_balance ?? 0;
  const difference = closingBalance - expectedBalance;

  const result = await prisma.shift.update({
    where: { id },
    data: {
      closed_at: new Date(),
      closing_balance: closingBalance,
      expected_balance: expectedBalance,
      difference,
      status: difference !== 0 ? 'closed' : 'approved',
      notes: data.notes,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  audit('close_shift', 'shift', id, {
    branch_id: shift.branch_id,
    user_id: data.user_id,
    metadata: { opening_balance: shift.opening_balance, expected_balance: expectedBalance, closing_balance: closingBalance, difference },
  });

  return result;
};

export const approveShift = async (id, userId) => {
  const shift = await prisma.shift.findFirst({ where: { id, deleted_at: null } });
  if (!shift) throw new AppError('الوردية غير موجودة', 404);
  if (!shift.closed_at) throw new AppError('الوردية لم تُغلق بعد', 400);
  if (shift.status === 'approved') throw new AppError('الوردية معتمدة بالفعل', 400);

  const result = await prisma.shift.update({
    where: { id },
    data: {
      status: 'approved',
      approved_by: userId,
      approved_at: new Date(),
    },
    include: { user: { select: { id: true, name: true } } },
  });

  audit('approve_shift', 'shift', id, {
    branch_id: shift.branch_id,
    user_id: userId,
    metadata: { opening_balance: shift.opening_balance, closing_balance: shift.closing_balance, difference: shift.difference },
  });

  return result;
};

// ─── Cash Registers ─────────────────────────────────

export const getCashRegisters = async (branch_id) => {
  return prisma.cashRegister.findMany({
    where: { deleted_at: null, ...(branch_id && { branch_id }) },
    include: { currency: { select: { id: true, code: true, symbol: true } } },
    orderBy: { name: 'asc' },
  });
};

export const createCashRegister = async (data) => {
  const result = await prisma.cashRegister.create({
    data,
    include: { currency: { select: { id: true, code: true, symbol: true } } },
  });
  audit('create_cash_register', 'cash_register', result.id, { branch_id: data.branch_id, user_id: data.created_by, metadata: { name: result.name } });
  return result;
};

export const updateCashRegister = async (id, data) => {
  const cr = await prisma.cashRegister.findFirst({ where: { id, deleted_at: null } });
  if (!cr) throw new AppError('الصندوق غير موجود', 404);

  const updateData = { ...data };
  if (data.adjustment !== undefined) {
    const newBalance = cr.balance + data.adjustment;
    if (newBalance < 0) throw new AppError('الرصيد لا يمكن أن يكون أقل من صفر', 400);
    updateData.balance = newBalance;
    delete updateData.adjustment;
  }

  const result = await prisma.cashRegister.update({
    where: { id },
    data: updateData,
    include: { currency: { select: { id: true, code: true, symbol: true } } },
  });
  audit('update_cash_register', 'cash_register', id, { branch_id: cr.branch_id, user_id: data.updated_by, metadata: { name: result.name } });
  return result;
};

export const deleteCashRegister = async (id, userId) => {
  const cr = await prisma.cashRegister.findFirst({ where: { id, deleted_at: null } });
  if (!cr) throw new AppError('الصندوق غير موجود', 404);
  await prisma.cashRegister.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_cash_register', 'cash_register', id, { branch_id: cr.branch_id, user_id: userId, metadata: { name: cr.name } });
};

// ─── Expense Categories ──────────────────────────────

export const getExpenseCategories = async (branch_id) => {
  return prisma.expenseCategory.findMany({
    where: { deleted_at: null, ...(branch_id ? { branch_id: { in: [branch_id, null] } } : {}) },
    orderBy: { name_ar: 'asc' },
  });
};

export const createExpenseCategory = async (data, userId) => {
  const result = await prisma.expenseCategory.create({ data });
  audit('create_expense_category', 'expense_category', result.id, { branch_id: data.branch_id, user_id: userId, metadata: { name: result.name_ar } });
  return result;
};

export const updateExpenseCategory = async (id, data, userId) => {
  const cat = await prisma.expenseCategory.findFirst({ where: { id, deleted_at: null } });
  if (!cat) throw new AppError('التصنيف غير موجود', 404);
  const result = await prisma.expenseCategory.update({ where: { id }, data });
  audit('update_expense_category', 'expense_category', id, { branch_id: cat.branch_id, user_id: userId, metadata: { name: result.name_ar } });
  return result;
};

export const deleteExpenseCategory = async (id, userId) => {
  const cat = await prisma.expenseCategory.findFirst({ where: { id, deleted_at: null } });
  if (!cat) throw new AppError('التصنيف غير موجود', 404);
  await prisma.expenseCategory.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_expense_category', 'expense_category', id, { branch_id: cat.branch_id, user_id: userId, metadata: { name: cat.name_ar } });
};

// ─── Expenses ────────────────────────────────────────

export const getExpenses = async ({ branch_id, category, category_id, status, from, to, payment_source, user_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(category && { category }),
    ...(category_id && { category_id }),
    ...(status && { status }),
    ...(payment_source && { payment_source }),
    ...(user_id && { user_id }),
    ...(from || to) && {
      expense_date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
  };

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        expense_category: { select: { id: true, name: true, name_ar: true } },
      },
      orderBy: { expense_date: 'desc' },
      skip,
      take,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    data: expenses,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getExpenseById = async (id) => {
  const expense = await prisma.expense.findFirst({
    where: { id, deleted_at: null },
    include: {
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      expense_category: { select: { id: true, name: true, name_ar: true } },
    },
  });
  if (!expense) throw new AppError('المصروف غير موجود', 404);
  return expense;
};

export const createExpense = async (data) => {
  // If payment source is safe, deduct from safe balance
  if (data.payment_source === 'safe' && data.source_id) {
    const safe = await prisma.safeBox.findFirst({ where: { id: data.source_id, deleted_at: null } });
    if (!safe) throw new AppError('الخزنة غير موجودة', 404);
    if (safe.balance < data.amount) throw new AppError('رصيد الخزنة غير كافٍ', 400);

    await prisma.$transaction(async (tx) => {
      await tx.safeBox.update({ where: { id: data.source_id }, data: { balance: { increment: -data.amount } } });
      await tx.safeMovement.create({
        data: {
          safe_id: data.source_id,
          type: 'cash_out',
          amount: data.amount,
          currency_id: data.currency_id,
          reference_type: 'expense',
          notes: `مصروف: ${data.category} - ${data.description || ''}`,
          created_by: data.user_id,
        },
      });
    });
  }

  // If payment source is cash_register, deduct from register balance
  if (data.payment_source === 'cash_register' && data.source_id) {
    const register = await prisma.cashRegister.findFirst({ where: { id: data.source_id, deleted_at: null } });
    if (!register) throw new AppError('الصندوق غير موجود', 404);
    if (register.balance < data.amount) throw new AppError('رصيد الصندوق غير كافٍ', 400);

    await prisma.$transaction(async (tx) => {
      await tx.cashRegister.update({
        where: { id: data.source_id },
        data: { balance: { increment: -data.amount } },
      });
    });
  }

  const result = await prisma.expense.create({
    data: {
      ...data,
      expense_date: data.expense_date ? new Date(data.expense_date) : new Date(),
    },
    include: {
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      expense_category: { select: { id: true, name: true, name_ar: true } },
    },
  });
  audit('create_expense', 'expense', result.id, { branch_id: data.branch_id, user_id: data.user_id, metadata: { category: data.category, amount: data.amount, payment_source: data.payment_source } });
  return result;
};

export const approveExpense = async (id, userId) => {
  const expense = await prisma.expense.findFirst({ where: { id, deleted_at: null } });
  if (!expense) throw new AppError('المصروف غير موجود', 404);
  if (expense.status !== 'pending') throw new AppError('يمكن اعتماد المصروفات المعلقة فقط', 400);

  const result = await prisma.expense.update({
    where: { id },
    data: { status: 'approved', approved_by: userId, approved_at: new Date() },
    include: {
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      expense_category: { select: { id: true, name: true, name_ar: true } },
    },
  });
  audit('approve_expense', 'expense', id, { branch_id: expense.branch_id, user_id: userId, metadata: { category: expense.category, amount: expense.amount } });
  return result;
};

export const rejectExpense = async (id, userId, reason) => {
  const expense = await prisma.expense.findFirst({ where: { id, deleted_at: null } });
  if (!expense) throw new AppError('المصروف غير موجود', 404);
  if (expense.status !== 'pending') throw new AppError('يمكن رفض المصروفات المعلقة فقط', 400);

  const result = await prisma.$transaction(async (tx) => {
    // Reverse safe deduction
    if (expense.payment_source === 'safe' && expense.source_id) {
      await tx.safeBox.update({
        where: { id: expense.source_id },
        data: { balance: { increment: expense.amount } },
      });
      await tx.safeMovement.create({
        data: {
          safe_id: expense.source_id,
          type: 'cash_in',
          amount: expense.amount,
          currency_id: expense.currency_id,
          reference_type: 'expense_reversal',
          notes: `إلغاء مصروف مرفوض: ${expense.description || expense.category}`,
          created_by: userId,
        },
      });
    }

    // Reverse cash register deduction
    if (expense.payment_source === 'cash_register' && expense.source_id) {
      await tx.cashRegister.update({
        where: { id: expense.source_id },
        data: { balance: { increment: expense.amount } },
      });
    }

    return tx.expense.update({
      where: { id },
      data: { status: 'rejected', approved_by: userId, approved_at: new Date(), rejection_reason: reason },
      include: {
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        expense_category: { select: { id: true, name: true, name_ar: true } },
      },
    });
  });

  audit('reject_expense', 'expense', id, { branch_id: expense.branch_id, user_id: userId, metadata: { category: expense.category, amount: expense.amount, reason } });
  return result;
};

export const updateExpense = async (id, userId, userRole, data) => {
  const expense = await prisma.expense.findFirst({ where: { id, deleted_at: null } });
  if (!expense) throw new AppError('المصروف غير موجود', 404);
  if (expense.status !== 'pending') throw new AppError('يمكن تعديل المصروفات المعلقة فقط', 400);
  if (userRole === 'accountant' && expense.user_id !== userId) {
    throw new AppError('لا يمكنك تعديل مصروفات مستخدم آخر', 403);
  }

  const updateData = {};
  if (data.category !== undefined) updateData.category = data.category;
  if (data.category_id !== undefined) updateData.category_id = data.category_id;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.currency_id !== undefined) updateData.currency_id = data.currency_id;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.expense_date !== undefined) updateData.expense_date = new Date(data.expense_date);

  const result = await prisma.expense.update({
    where: { id },
    data: updateData,
    include: {
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true } },
      expense_category: { select: { id: true, name: true, name_ar: true } },
    },
  });
  audit('update_expense', 'expense', id, {
    branch_id: expense.branch_id,
    user_id: userId,
    metadata: { changes: Object.keys(updateData) },
  });
  return result;
};

export const deleteExpense = async (id, userId) => {
  const expense = await prisma.expense.findFirst({ where: { id, deleted_at: null } });
  if (!expense) throw new AppError('المصروف غير موجود', 404);

  await prisma.$transaction(async (tx) => {
    // Reverse safe deduction if expense was paid from safe
    if (expense.payment_source === 'safe' && expense.source_id) {
      await tx.safeBox.update({
        where: { id: expense.source_id },
        data: { balance: { increment: expense.amount } },
      });
      await tx.safeMovement.create({
        data: {
          safe_id: expense.source_id,
          type: 'cash_in',
          amount: expense.amount,
          currency_id: expense.currency_id,
          reference_type: 'expense_reversal',
          notes: `إلغاء مصروف محذوف: ${expense.description || expense.category}`,
          created_by: userId,
        },
      });
    }

    // Reverse cash register deduction
    if (expense.payment_source === 'cash_register' && expense.source_id) {
      await tx.cashRegister.update({
        where: { id: expense.source_id },
        data: { balance: { increment: expense.amount } },
      });
    }

    await tx.expense.update({ where: { id }, data: { deleted_at: new Date() } });
  });

  audit('delete_expense', 'expense', id, { branch_id: expense.branch_id, user_id: userId, metadata: { category: expense.category, amount: expense.amount } });
};

// ─── Currency Exchange ────────────────────────────────

export const getCurrencyExchanges = async (branch_id, page = 1, limit = 20) => {
  const where = {
    reference_type: 'currency_exchange',
    deleted_at: null,
    ...(branch_id && { safe: { branch_id } }),
  };

  const [movements, total] = await Promise.all([
    prisma.safeMovement.findMany({
      where,
      include: {
        safe: { select: { id: true, name: true, name_ar: true, branch_id: true } },
        currency: { select: { id: true, code: true, symbol: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.safeMovement.count({ where }),
  ]);

  const grouped = {};
  for (const m of movements) {
    const groupKey = `${m.reference_id || m.id}_${m.created_at.getTime()}`;
    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        id: m.reference_id || m.id,
        created_at: m.created_at,
        from_currency: null,
        to_currency: null,
        from_amount: 0,
        to_amount: 0,
        source: m.safe,
        notes: m.notes,
      };
    }
    if (m.type === 'cash_out') {
      grouped[groupKey].from_currency = m.currency;
      grouped[groupKey].from_amount = m.amount;
    } else if (m.type === 'cash_in') {
      grouped[groupKey].to_currency = m.currency;
      grouped[groupKey].to_amount = m.amount;
    }
  }

  return {
    data: Object.values(grouped),
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

export const currencyExchange = async (data) => {
  const { from_currency_id, to_currency_id, from_amount, exchange_rate, source, source_id } = data;
  const to_amount = Math.floor(from_amount * exchange_rate / 100_00);

  if (source === 'safe') {
    const safe = await prisma.safeBox.findFirst({ where: { id: source_id, deleted_at: null } });
    if (!safe) throw new AppError('الخزنة غير موجودة', 404);
    if (safe.currency_id !== from_currency_id) throw new AppError('عملة الخزنة لا تطابق عملة المصدر', 400);
    if (safe.balance < from_amount) throw new AppError('رصيد الخزنة غير كافٍ', 400);

    const toSafe = await prisma.safeBox.findFirst({
      where: { branch_id: data.branch_id, currency_id: to_currency_id, deleted_at: null },
    });
    if (!toSafe) throw new AppError(`لا توجد خزنة بعملة الهدف في هذا الفرع`, 400);

    await prisma.$transaction(async (tx) => {
      await tx.safeMovement.create({
        data: {
          safe_id: safe.id,
          type: 'cash_out',
          amount: from_amount,
          currency_id: from_currency_id,
          reference_type: 'currency_exchange',
          notes: `تحويل عملة: صرف ${from_amount}${safe.currency?.code || ''}`,
          created_by: data.created_by,
        },
      });
      await tx.safeBox.update({ where: { id: safe.id }, data: { balance: { increment: -from_amount } } });

      await tx.safeMovement.create({
        data: {
          safe_id: toSafe.id,
          type: 'cash_in',
          amount: to_amount,
          currency_id: to_currency_id,
          reference_type: 'currency_exchange',
          notes: `استلام من تحويل عملة: ${to_amount}${toSafe.currency?.code || ''}`,
          created_by: data.created_by,
        },
      });
      await tx.safeBox.update({ where: { id: toSafe.id }, data: { balance: { increment: to_amount } } });
    });
  } else if (source === 'cash_register') {
    const register = await prisma.cashRegister.findFirst({ where: { id: source_id, deleted_at: null } });
    if (!register) throw new AppError('الصندوق غير موجود', 404);
    if (register.currency_id !== from_currency_id) throw new AppError('عملة الصندوق لا تطابق عملة المصدر', 400);
    if (register.balance < from_amount) throw new AppError('رصيد الصندوق غير كافٍ', 400);

    await prisma.cashRegister.update({
      where: { id: source_id },
      data: { balance: { increment: -from_amount } },
    });

    const toRegister = await prisma.cashRegister.findFirst({
      where: { branch_id: data.branch_id, currency_id: to_currency_id, deleted_at: null },
    });
    if (toRegister) {
      await prisma.cashRegister.update({
        where: { id: toRegister.id },
        data: { balance: { increment: to_amount } },
      });
    }
  }

  audit('currency_exchange', 'currency', null, {
    branch_id: data.branch_id,
    user_id: data.created_by,
    metadata: {
      from_currency_id, to_currency_id, from_amount, to_amount, exchange_rate,
      source, source_id,
    },
  });

  return { from_amount, to_amount, exchange_rate };
};
