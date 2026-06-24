import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';
import { getNextNumber } from '../core/number-sequence.service.js';
import { getCachedSetting } from '../../lib/cache.js';
import { AppError } from '../../utils/AppError.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

const DEFAULT_DISCOUNT_LIMITS = {
  admin: 100,
  manager: 20,
  cashier: 5,
  accountant: 0,
  inventory_manager: 0,
};

const getRoleDiscountLimit = async (role, branch_id) => {
  const val = await getCachedSetting(`discount.limit.${role}.percent`, branch_id);
  if (val !== null) return parseInt(val);
  return DEFAULT_DISCOUNT_LIMITS[role] ?? 0;
};

const generatePurchaseNumber = (branch_id) => getNextNumber(branch_id, 'purchase');

export const getPurchases = async ({ q, status, supplier_id, branch_id, from, to, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(status && { status }),
    ...(supplier_id && { supplier_id }),
    ...(from || to) && {
      created_at: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      },
    },
    ...(q && {
      OR: [
        { invoice_number: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, name_ar: true, barcode: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.purchase.count({ where }),
  ]);

  return {
    data: purchases,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getPurchaseById = async (id) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id, deleted_at: null },
    include: {
      supplier: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true } },
      currency: { select: { id: true, code: true, symbol: true, exchange_rate: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, name_ar: true, barcode: true, sku: true } },
        },
      },
    },
  });
  if (!purchase) throw new AppError('الفاتورة غير موجودة', 404);
  return purchase;
};

const getConversionMap = async (items) => {
  const productUnitIds = items.filter((i) => i.unit_id).map((i) => ({ product_id: i.product_id, unit_id: i.unit_id }));
  if (productUnitIds.length === 0) return {};

  const productUnits = await prisma.productUnit.findMany({
    where: {
      deleted_at: null,
      OR: productUnitIds.map((p) => ({ product_id: p.product_id, unit_id: p.unit_id })),
    },
    select: { product_id: true, unit_id: true, conversion_factor: true },
  });

  return Object.fromEntries(productUnits.map((pu) => [`${pu.product_id}:${pu.unit_id}`, pu.conversion_factor]));
};

const getBaseQuantity = (item, conversionMap) => {
  if (item.unit_id && conversionMap[`${item.product_id}:${item.unit_id}`]) {
    return item.quantity * conversionMap[`${item.product_id}:${item.unit_id}`];
  }
  return item.quantity;
};

const addBaseQuantities = (items, conversionMap) =>
  items.map((item) => ({ ...item, _base_quantity: getBaseQuantity(item, conversionMap) }));

export const createPurchase = async (data) => {
  const { items, user_role, created_by, ...purchaseData } = data;
  const discountAmount = purchaseData.discount_amount || 0;
  const itemSubtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
  if (itemSubtotal > 0 && discountAmount > 0) {
    const discountPercent = (discountAmount / itemSubtotal) * 100;
    const maxPercent = await getRoleDiscountLimit(user_role, purchaseData.branch_id);
    if (discountPercent > maxPercent) {
      throw new AppError(`حد الخصم المسموح لدورك هو ${maxPercent}%، الخصم الحالي ${Math.round(discountPercent)}%`, 403);
    }
  }

  const conversionMap = await getConversionMap(items);
  const invoice_number = await generatePurchaseNumber(purchaseData.branch_id);
  const total = items.reduce((sum, item) => sum + item.total, 0);

  const created = await prisma.$transaction(async (tx) => {
    const result = await tx.purchase.create({
      data: {
        ...purchaseData,
        invoice_number,
        total,
        items: { create: items },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, name_ar: true, barcode: true } },
          },
        },
      },
    });

    if (result.status === 'completed') {
      const stockItems = items.map((item) => ({
        ...item,
        _base_quantity: getBaseQuantity(item, conversionMap),
      }));

      await tx.stockMovement.createMany({
        data: stockItems.map((item) => ({
          branch_id: result.branch_id,
          product_id: item.product_id,
          type: 'purchase',
          quantity: item._base_quantity,
          reference_id: result.id,
          reference_type: 'purchase',
        })),
      });

      const productIds = items.map((i) => i.product_id);
      const existingBalances = await tx.inventoryBalance.findMany({
        where: { branch_id: result.branch_id, product_id: { in: productIds } },
      });
      const balanceMap = Object.fromEntries(existingBalances.map((b) => [b.product_id, b]));

      const updates = [];
      const creates = [];
      for (const item of stockItems) {
        const existing = balanceMap[item.product_id];
        if (existing) {
          updates.push(tx.inventoryBalance.update({
            where: { id: existing.id },
            data: { quantity: { increment: item._base_quantity } },
          }));
        } else {
          creates.push(tx.inventoryBalance.create({
            data: { branch_id: result.branch_id, product_id: item.product_id, quantity: item._base_quantity },
          }));
        }
      }
      await Promise.all([...updates, ...creates]);

      if (result.supplier_id) {
        await tx.supplier.update({
          where: { id: result.supplier_id },
          data: { balance: { increment: total } },
        });
      }
    }

    return result;
  }, { timeout: 30000 });

  audit('create_purchase', 'purchase', created.id, {
    branch_id: created.branch_id,
    user_id: created_by,
    metadata: { invoice_number, total, status: created.status },
  });

  return created;
};

export const updatePurchaseStatus = async (id, status, userId) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id, deleted_at: null },
    include: { items: { select: { product_id: true, quantity: true, unit_id: true } } },
  });
  if (!purchase) throw new AppError('الفاتورة غير موجودة', 404);

  const conversionMap = await getConversionMap(purchase.items);
  const itemsWithBase = addBaseQuantities(purchase.items, conversionMap);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.purchase.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
      },
    });

    if (status === 'completed' && purchase.status !== 'completed') {
      await tx.stockMovement.createMany({
        data: itemsWithBase.map((item) => ({
          branch_id: updated.branch_id,
          product_id: item.product_id,
          type: 'purchase',
          quantity: item._base_quantity,
          reference_id: updated.id,
          reference_type: 'purchase',
        })),
      });

      const productIds = updated.items.map((i) => i.product_id);
      const existingBalances = await tx.inventoryBalance.findMany({
        where: { branch_id: updated.branch_id, product_id: { in: productIds } },
      });
      const balanceMap = Object.fromEntries(existingBalances.map((b) => [b.product_id, b]));

      const ops = [];
      for (const item of itemsWithBase) {
        const existing = balanceMap[item.product_id];
        if (existing) {
          ops.push(tx.inventoryBalance.update({
            where: { id: existing.id },
            data: { quantity: { increment: item._base_quantity } },
          }));
        } else {
          ops.push(tx.inventoryBalance.create({
            data: { branch_id: updated.branch_id, product_id: item.product_id, quantity: item._base_quantity },
          }));
        }
      }
      await Promise.all(ops);

      if (updated.supplier_id) {
        await tx.supplier.update({
          where: { id: updated.supplier_id },
          data: { balance: { increment: updated.total } },
        });
      }
    }

    return updated;
  }, { timeout: 30000 });

  audit('update_purchase_status', 'purchase', id, {
    branch_id: purchase.branch_id,
    user_id: userId,
    metadata: { from: purchase.status, to: status, invoice_number: purchase.invoice_number },
  });

  return result;
};

export const updatePurchase = async (id, data) => {
  const { items, user_role, created_by, user_id, ...purchaseData } = data;

  const purchase = await prisma.purchase.findFirst({
    where: { id, deleted_at: null },
    include: { items: { select: { product_id: true, quantity: true, unit_id: true } } },
  });
  if (!purchase) throw new AppError('الفاتورة غير موجودة', 404);
  if (purchase.status === 'returned' || purchase.status === 'cancelled') {
    throw new AppError('لا يمكن تعديل فاتورة مرتجعة أو ملغاة', 400);
  }

  const conversionMap = await getConversionMap(purchase.items);
  const itemsWithBase = addBaseQuantities(purchase.items, conversionMap);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.purchase.update({
      where: { id },
      data: {
        ...purchaseData,
        supplier_id: purchaseData.supplier_id || purchase.supplier_id,
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        currency: { select: { id: true, code: true, symbol: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, name_ar: true, barcode: true } },
          },
        },
      },
    });

    // If status changed to completed, handle stock + supplier balance
    if (purchaseData.status === 'completed' && purchase.status !== 'completed') {
      const total = purchase.total;

      await tx.stockMovement.createMany({
        data: itemsWithBase.map((item) => ({
          branch_id: purchase.branch_id,
          product_id: item.product_id,
          type: 'purchase',
          quantity: item._base_quantity,
          reference_id: purchase.id,
          reference_type: 'purchase',
        })),
      });

      const productIds = purchase.items.map((i) => i.product_id);
      const existingBalances = await tx.inventoryBalance.findMany({
        where: { branch_id: purchase.branch_id, product_id: { in: productIds } },
      });
      const balanceMap = Object.fromEntries(existingBalances.map((b) => [b.product_id, b]));

      const ops = [];
      for (const item of itemsWithBase) {
        const existing = balanceMap[item.product_id];
        if (existing) {
          ops.push(tx.inventoryBalance.update({
            where: { id: existing.id },
            data: { quantity: { increment: item._base_quantity } },
          }));
        } else {
          ops.push(tx.inventoryBalance.create({
            data: { branch_id: purchase.branch_id, product_id: item.product_id, quantity: item._base_quantity },
          }));
        }
      }
      await Promise.all(ops);

      if (purchase.supplier_id) {
        await tx.supplier.update({
          where: { id: purchase.supplier_id },
          data: { balance: { increment: total } },
        });
      }
    }

    return updated;
  }, { timeout: 30000 });

  audit('update_purchase', 'purchase', id, {
    branch_id: result.branch_id,
    user_id: user_id || created_by,
    metadata: { changes: Object.keys(purchaseData) },
  });

  return result;
};

export const deletePurchase = async (id, userId) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id, deleted_at: null },
    select: { id: true, branch_id: true, total: true, invoice_number: true, status: true, supplier_id: true, items: { select: { product_id: true, quantity: true, unit_id: true } } },
  });
  if (!purchase) throw new AppError('الفاتورة غير موجودة', 404);

  const conversionMap = await getConversionMap(purchase.items);
  const itemsWithBase = addBaseQuantities(purchase.items, conversionMap);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.purchase.update({ where: { id }, data: { deleted_at: new Date() } });

    if (purchase.status === 'completed') {
      // Reverse stock movements
      await tx.stockMovement.createMany({
        data: itemsWithBase.map((item) => ({
          branch_id: purchase.branch_id,
          product_id: item.product_id,
          type: 'adjustment',
          quantity: -item._base_quantity,
          reference_id: purchase.id,
          reference_type: 'purchase_delete',
          notes: 'حذف فاتورة شراء',
        })),
      });

      // Reverse inventory balances
      for (const item of itemsWithBase) {
        await tx.inventoryBalance.updateMany({
          where: { branch_id: purchase.branch_id, product_id: item.product_id },
          data: { quantity: { increment: -item._base_quantity } },
        });
      }

      // Reverse supplier balance
      if (purchase.supplier_id) {
        await tx.supplier.update({
          where: { id: purchase.supplier_id },
          data: { balance: { increment: -purchase.total } },
        });
      }
    }

    return updated;
  });

  audit('delete_purchase', 'purchase', id, {
    branch_id: purchase.branch_id,
    user_id: userId,
    metadata: { invoice_number: purchase.invoice_number, total: purchase.total },
  });

  return result;
};

// ─── Purchase Return ────────────────────────────────

export const returnPurchase = async (purchaseId, { returned_items, notes, user_id }) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, deleted_at: null },
    include: { items: { select: { id: true, product_id: true, quantity: true, unit_id: true } } },
  });
  if (!purchase) throw new AppError('الفاتورة غير موجودة', 404);
  if (purchase.status === 'returned') throw new AppError('الفاتورة مرتجعة بالفعل', 400);

  const conversionMap = await getConversionMap(purchase.items);
  const itemsToReturnBase = addBaseQuantities(
    returned_items
      ? purchase.items.filter((i) => returned_items.includes(i.id))
      : purchase.items,
    conversionMap,
  );

  const result = await prisma.$transaction(async (tx) => {
    const itemsToReturn = returned_items
      ? purchase.items.filter((i) => returned_items.includes(i.id))
      : purchase.items;

    await tx.stockMovement.createMany({
      data: itemsToReturnBase.map((item) => ({
        branch_id: purchase.branch_id,
        product_id: item.product_id,
        type: 'return_purchase',
        quantity: -item._base_quantity,
        reference_id: purchase.id,
        reference_type: 'purchase_return',
        notes,
      })),
    });
    await Promise.all(itemsToReturnBase.map((item) =>
      tx.inventoryBalance.updateMany({
        where: { branch_id: purchase.branch_id, product_id: item.product_id },
        data: { quantity: { increment: -item._base_quantity } },
      })
    ));

    return tx.purchase.update({
      where: { id: purchaseId },
      data: { status: 'returned', notes: notes || purchase.notes },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, name_ar: true } } } },
      },
    });
  }, { timeout: 30000 });

  audit('return_purchase', 'purchase', purchaseId, {
    branch_id: purchase.branch_id,
    user_id,
    metadata: { invoice_number: purchase.invoice_number, notes },
  });

  return result;
};

// ─── Purchase Cancel ─────────────────────────────────

export const cancelPurchase = async (id, { reason, user_id }) => {
  const purchase = await prisma.purchase.findFirst({
    where: { id, deleted_at: null },
    include: { items: { select: { id: true, product_id: true, quantity: true, unit_id: true } } },
  });
  if (!purchase) throw new AppError('الفاتورة غير موجودة', 404);
  if (purchase.status === 'cancelled') throw new AppError('الفاتورة ملغاة بالفعل', 400);
  if (purchase.status === 'returned') throw new AppError('لا يمكن إلغاء فاتورة مرتجعة', 400);

  const conversionMap = await getConversionMap(purchase.items);
  const itemsWithBase = addBaseQuantities(purchase.items, conversionMap);

  const result = await prisma.$transaction(async (tx) => {
    if (purchase.status === 'completed') {
      await tx.stockMovement.createMany({
        data: itemsWithBase.map((item) => ({
          branch_id: purchase.branch_id,
          product_id: item.product_id,
          type: 'adjustment',
          quantity: -item._base_quantity,
          reference_id: purchase.id,
          reference_type: 'purchase_cancel',
          notes: `إلغاء فاتورة شراء: ${reason}`,
        })),
      });
      await Promise.all(itemsWithBase.map((item) =>
        tx.inventoryBalance.updateMany({
          where: { branch_id: purchase.branch_id, product_id: item.product_id },
          data: { quantity: { increment: -item._base_quantity } },
        })
      ));

      if (purchase.supplier_id) {
        await tx.supplier.update({
          where: { id: purchase.supplier_id },
          data: { balance: { increment: -purchase.total } },
        });
      }
    }

    return tx.purchase.update({
      where: { id },
      data: { status: 'cancelled', notes: reason ? `${reason}${purchase.notes ? ` | ${purchase.notes}` : ''}` : purchase.notes },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, name_ar: true } } } },
      },
    });
  }, { timeout: 30000 });

  audit('cancel_purchase', 'purchase', id, {
    branch_id: purchase.branch_id,
    user_id,
    metadata: { invoice_number: purchase.invoice_number, reason, previous_status: purchase.status, total: purchase.total },
  });

  return result;
};
