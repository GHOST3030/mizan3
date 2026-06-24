import { AppError } from '../../utils/AppError.js';
﻿import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

// ─── Supplier Categories ─────────────────────────────

export const getSupplierCategories = async () => {
  return prisma.supplierCategory.findMany({
    where: { deleted_at: null },
    include: { _count: { select: { suppliers: true } } },
    orderBy: { name: 'asc' },
  });
};

export const createSupplierCategory = async (data) => {
  const { user_id, ...dbData } = data;
  const result = await prisma.supplierCategory.create({ data: dbData });
  audit('create_supplier_category', 'supplier_category', result.id, {
    user_id,
    metadata: { name: result.name },
  });
  return result;
};

export const updateSupplierCategory = async (id, data) => {
  const { user_id, ...dbData } = data;
  const cat = await prisma.supplierCategory.findFirst({ where: { id, deleted_at: null } });
  if (!cat) throw new AppError('التصنيف غير موجود', 404);
  const result = await prisma.supplierCategory.update({ where: { id }, data: dbData });
  audit('update_supplier_category', 'supplier_category', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteSupplierCategory = async (id, user_id) => {
  const cat = await prisma.supplierCategory.findFirst({ where: { id, deleted_at: null } });
  if (!cat) throw new AppError('التصنيف غير موجود', 404);
  const hasSuppliers = await prisma.supplier.findFirst({
    where: { supplier_category_id: id, deleted_at: null },
  });
  if (hasSuppliers) throw new AppError('لا يمكن حذف تصنيف مرتبط بموردين', 400);
  const result = await prisma.supplierCategory.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_supplier_category', 'supplier_category', id, {
    user_id,
    metadata: { name: cat.name },
  });
  return result;
};

// ─── Suppliers ───────────────────────────────────────

export const getSuppliers = async ({ q, category_id, branch_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(category_id && { supplier_category_id: category_id }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    data: suppliers,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getSupplierById = async (id) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, deleted_at: null },
    include: { category: true },
  });
  if (!supplier) throw new AppError('المورد غير موجود', 404);
  return supplier;
};

export const createSupplier = async (data) => {
  const { user_id, ...dbData } = data;
  if (dbData.supplier_category_id) {
    const cat = await prisma.supplierCategory.findFirst({
      where: { id: dbData.supplier_category_id, deleted_at: null },
    });
    if (!cat) throw new AppError('التصنيف غير موجود', 404);
  }
  const result = await prisma.supplier.create({
    data: dbData,
    include: { category: { select: { id: true, name: true } } },
  });
  audit('create_supplier', 'supplier', result.id, {
    branch_id: result.branch_id,
    user_id,
    metadata: { name: result.name, phone: result.phone },
  });
  return result;
};

export const updateSupplier = async (id, data) => {
  const { user_id, ...dbData } = data;
  const supplier = await prisma.supplier.findFirst({ where: { id, deleted_at: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  if (dbData.supplier_category_id) {
    const cat = await prisma.supplierCategory.findFirst({
      where: { id: dbData.supplier_category_id, deleted_at: null },
    });
    if (!cat) throw new AppError('التصنيف غير موجود', 404);
  }

  const result = await prisma.supplier.update({
    where: { id },
    data: dbData,
    include: { category: { select: { id: true, name: true } } },
  });
  audit('update_supplier', 'supplier', id, {
    branch_id: supplier.branch_id,
    user_id,
    metadata: { name: supplier.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteSupplier = async (id, user_id) => {
  const supplier = await prisma.supplier.findFirst({ where: { id, deleted_at: null } });
  if (!supplier) throw new AppError('المورد غير موجود', 404);
  const result = await prisma.supplier.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_supplier', 'supplier', id, {
    branch_id: supplier.branch_id,
    user_id,
    metadata: { name: supplier.name },
  });
  return result;
};

// ─── Opening Balance ───────────────────────────────────

export const setSupplierOpeningBalance = async (id, data) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id, deleted_at: null },
  });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const result = await prisma.supplier.update({
    where: { id },
    data: {
      opening_balance: data.opening_balance,
      opening_balance_date: data.opening_balance_date ? new Date(data.opening_balance_date) : null,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  audit('set_supplier_opening_balance', 'supplier', id, {
    branch_id: supplier.branch_id,
    user_id: data.user_id,
    metadata: { name: supplier.name, opening_balance: data.opening_balance, previous_balance: supplier.opening_balance },
  });

  return result;
};

// ─── Supplier Statement ───────────────────────────────

export const getSupplierStatement = async (supplierId, { from, to }) => {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, deleted_at: null },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!supplier) throw new AppError('المورد غير موجود', 404);

  const dateFilter = (from || to) ? {
    created_at: {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    },
  } : {};

  const purchases = await prisma.purchase.findMany({
    where: { supplier_id: supplierId, deleted_at: null, ...dateFilter },
    include: {
      currency: { select: { id: true, code: true, symbol: true } },
      items: {
        include: { product: { select: { id: true, name: true, name_ar: true } } },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const transactions = purchases.flatMap((purchase) => {
    const entries = [];

    entries.push({
      type: purchase.status === 'returned' ? 'return' : 'purchase',
      date: purchase.created_at,
      invoice_number: purchase.invoice_number,
      description: `فاتورة ${purchase.status === 'returned' ? 'مرتجعة' : 'شراء'} #${purchase.invoice_number || '—'}`,
      debit: purchase.status === 'returned' ? purchase.total : 0,
      credit: purchase.status === 'returned' ? 0 : purchase.total,
      currency: purchase.currency,
      purchase_id: purchase.id,
      status: purchase.status,
    });

    return entries;
  });

  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let runningBalance = supplier.opening_balance;
  const transactionsWithBalance = transactions.map((t) => {
    runningBalance += t.credit - t.debit;
    return { ...t, running_balance: runningBalance };
  });

  const totalPurchases = purchases.filter((p) => p.status === 'completed').reduce((sum, p) => sum + p.total, 0);
  const totalReturned = purchases.filter((p) => p.status === 'returned').reduce((sum, p) => sum + p.total, 0);
  const currentBalance = supplier.opening_balance + totalPurchases - totalReturned;

  return {
    supplier: {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      category: supplier.category,
      balance: supplier.balance,
      opening_balance: supplier.opening_balance,
      opening_balance_date: supplier.opening_balance_date,
    },
    summary: {
      opening_balance: supplier.opening_balance,
      total_purchases: totalPurchases,
      total_paid: 0,
      total_returned: totalReturned,
      balance: currentBalance,
    },
    transactions: transactionsWithBalance,
  };
};
