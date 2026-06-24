import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';
import { AppError } from '../../utils/AppError.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

const getProductCostPrice = async (productId, branchId) => {
  const balance = await prisma.inventoryBalance.findFirst({
    where: { product_id: productId, branch_id: branchId },
    include: { product: { select: { cost_price: true } } },
  });
  return balance?.product?.cost_price || 0;
};

// ─── Warehouses ──────────────────────────────────────

export const getWarehouses = async (branch_id) => {
  return prisma.warehouse.findMany({
    where: { deleted_at: null, ...(branch_id && { branch_id }) },
    orderBy: { name: 'asc' },
  });
};

export const createWarehouse = async (data) => {
  const result = await prisma.warehouse.create({ data });
  audit('create_warehouse', 'warehouse', result.id, { branch_id: data.branch_id, user_id: data.created_by, metadata: { name: result.name_ar } });
  return result;
};

export const updateWarehouse = async (id, data) => {
  const wh = await prisma.warehouse.findFirst({ where: { id, deleted_at: null } });
  if (!wh) throw new AppError('المستودع غير موجود', 404);
  const result = await prisma.warehouse.update({ where: { id }, data });
  audit('update_warehouse', 'warehouse', id, { branch_id: wh.branch_id, user_id: data.updated_by, metadata: { name: result.name_ar } });
  return result;
};

export const deleteWarehouse = async (id, userId) => {
  const wh = await prisma.warehouse.findFirst({ where: { id, deleted_at: null } });
  if (!wh) throw new AppError('المستودع غير موجود', 404);
  await prisma.warehouse.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_warehouse', 'warehouse', id, { branch_id: wh.branch_id, user_id: userId, metadata: { name: wh.name_ar } });
};

// ─── Inventory Balance ───────────────────────────────

export const getInventoryBalance = async ({ branch_id, warehouse_id, product_id, q, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    ...(branch_id && { branch_id }),
    ...(warehouse_id && { warehouse_id }),
    ...(product_id && { product_id }),
    ...(q && {
      product: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { name_ar: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
        ],
      },
    }),
  };

  const [balances, total] = await Promise.all([
    prisma.inventoryBalance.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, name_ar: true, barcode: true, sku: true, selling_price: true, cost_price: true, min_stock: true } },
        warehouse: { select: { id: true, name: true, name_ar: true } },
      },
      orderBy: { product: { name: 'asc' } },
      skip,
      take,
    }),
    prisma.inventoryBalance.count({ where }),
  ]);

  return {
    data: balances,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getProductStock = async (product_id, branch_id) => {
  const result = await prisma.stockMovement.groupBy({
    by: ['product_id', 'warehouse_id'],
    where: {
      product_id,
      branch_id,
      deleted_at: null,
    },
    _sum: { quantity: true },
  });

  const movements = await prisma.stockMovement.findMany({
    where: { product_id, branch_id, deleted_at: null },
    orderBy: { created_at: 'desc' },
    take: 50,
    include: { warehouse: { select: { id: true, name: true, name_ar: true } } },
  });

  return { balance: result, movements };
};

// ─── Stock Movements ─────────────────────────────────

export const getStockMovements = async ({ product_id, type, branch_id, warehouse_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(warehouse_id && { warehouse_id }),
    ...(product_id && { product_id }),
    ...(type && { type }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, name_ar: true, barcode: true } },
        warehouse: { select: { id: true, name: true, name_ar: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: movements,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const createStockMovement = async (data) => {
  const movement = await prisma.stockMovement.create({ data });

  const balanceWhere = {
    branch_id: data.branch_id,
    warehouse_id: data.warehouse_id || null,
    product_id: data.product_id,
  };

  const existing = await prisma.inventoryBalance.findFirst({ where: balanceWhere });

  if (existing) {
    await prisma.inventoryBalance.update({
      where: { id: existing.id },
      data: { quantity: { increment: data.quantity } },
    });
  } else {
    await prisma.inventoryBalance.create({
      data: {
        branch_id: data.branch_id,
        warehouse_id: data.warehouse_id || null,
        product_id: data.product_id,
        quantity: data.quantity,
      },
    });
  }

  audit('create_stock_movement', 'stock_movement', movement.id, {
    branch_id: data.branch_id,
    user_id: data.created_by,
    metadata: { type: data.type, quantity: data.quantity, product_id: data.product_id, notes: data.notes },
  });

  return movement;
};

export const deleteStockMovement = async (id, userId) => {
  const movement = await prisma.stockMovement.findFirst({ where: { id, deleted_at: null } });
  if (!movement) throw new AppError('الحركة غير موجودة', 404);

  const balanceWhere = {
    branch_id: movement.branch_id,
    warehouse_id: movement.warehouse_id || null,
    product_id: movement.product_id,
  };

  await prisma.inventoryBalance.updateMany({
    where: balanceWhere,
    data: { quantity: { increment: -movement.quantity } },
  });

  await prisma.stockMovement.update({
    where: { id },
    data: { deleted_at: new Date() },
  });

  audit('delete_stock_movement', 'stock_movement', id, {
    branch_id: movement.branch_id,
    user_id: userId,
    metadata: { type: movement.type, quantity: movement.quantity, product_id: movement.product_id },
  });
};

// ─── Stock Counts ────────────────────────────────────

export const getStockCounts = async ({ branch_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = { deleted_at: null, ...(branch_id && { branch_id }) };

  const [counts, total] = await Promise.all([
    prisma.stockCount.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        warehouse: { select: { id: true, name: true, name_ar: true } },
        items: { include: { product: { select: { id: true, name: true, name_ar: true, barcode: true } } } },
      },
      orderBy: { counted_at: 'desc' },
      skip,
      take,
    }),
    prisma.stockCount.count({ where }),
  ]);

  return {
    data: counts,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const createStockCount = async (data) => {
  const { items, ...countData } = data;

  const result = await prisma.stockCount.create({
    data: {
      ...countData,
      items: {
        create: items.map((item) => ({
          product_id: item.product_id,
          expected_qty: item.expected_qty,
          actual_qty: item.actual_qty,
          difference: item.actual_qty - item.expected_qty,
        })),
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true, name_ar: true } },
      items: {
        include: { product: { select: { id: true, name: true, name_ar: true, barcode: true } } },
      },
    },
  });

  audit('create_stock_count', 'stock_count', result.id, {
    branch_id: countData.branch_id,
    user_id: countData.user_id,
    metadata: { warehouse_id: countData.warehouse_id, items_count: items.length },
  });

  return result;
};

export const approveStockCount = async (id, userId) => {
  const count = await prisma.stockCount.findFirst({
    where: { id, deleted_at: null },
    include: { items: true },
  });
  if (!count) throw new AppError('الجرد غير موجود', 404);

  const result = await prisma.$transaction(async (tx) => {
    const changedItems = count.items.filter((i) => i.difference !== 0);
    if (changedItems.length > 0) {
      await tx.stockMovement.createMany({
        data: changedItems.map((item) => ({
          branch_id: count.branch_id,
          product_id: item.product_id,
          type: 'adjustment',
          quantity: item.difference,
          reference_id: count.id,
          reference_type: 'stock_count',
          notes: `تسوية جرد: الفرق ${item.difference > 0 ? '+' : ''}${item.difference}`,
        })),
      });
      await Promise.all(changedItems.map((item) =>
        tx.inventoryBalance.updateMany({
          where: { branch_id: count.branch_id, product_id: item.product_id },
          data: { quantity: { increment: item.difference } },
        })
      ));
    }

    return tx.stockCount.update({
      where: { id },
      data: { notes: `${count.notes || ''} | ✅ تم الاعتماد`.trim() },
    });
  });

  audit('approve_stock_count', 'stock_count', id, {
    branch_id: count.branch_id,
    user_id: userId,
    metadata: { items_count: count.items.length, differences: count.items.filter((i) => i.difference !== 0).length },
  });

  return result;
};

// ─── Stock Transfers ────────────────────────────────

export const getStockTransfers = async ({ from_branch_id, to_branch_id, status, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(from_branch_id && { from_branch_id }),
    ...(to_branch_id && { to_branch_id }),
    ...(status && { status }),
  };

  const [transfers, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      include: {
        from_branch: { select: { id: true, name: true, name_ar: true } },
        to_branch: { select: { id: true, name: true, name_ar: true } },
        items: {
          include: { product: { select: { id: true, name: true, name_ar: true, barcode: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.stockTransfer.count({ where }),
  ]);

  return {
    data: transfers,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const getStockTransferById = async (id) => {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id, deleted_at: null },
    include: {
      from_branch: { select: { id: true, name: true, name_ar: true } },
      to_branch: { select: { id: true, name: true, name_ar: true } },
      items: {
        include: { product: { select: { id: true, name: true, name_ar: true, barcode: true, cost_price: true } } },
      },
    },
  });
  if (!transfer) throw new AppError('التحويل غير موجود', 404);
  return transfer;
};

export const createStockTransfer = async (data) => {
  const { items, created_by, ...transferData } = data;

  const itemsNeedingCost = items.filter((i) => !i.cost_price);
  let costPriceMap = {};
  if (itemsNeedingCost.length > 0) {
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        branch_id: data.from_branch_id,
        product_id: { in: itemsNeedingCost.map((i) => i.product_id) },
      },
      include: { product: { select: { cost_price: true } } },
    });
    costPriceMap = Object.fromEntries(
      balances.map((b) => [b.product_id, b.product?.cost_price || 0])
    );
  }
  const itemsWithCost = items.map((item) => ({
    ...item,
    cost_price: item.cost_price || costPriceMap[item.product_id] || 0,
  }));

  const result = await prisma.stockTransfer.create({
    data: {
      ...transferData,
      created_by,
      items: { create: itemsWithCost },
    },
    include: {
      from_branch: { select: { id: true, name: true, name_ar: true } },
      to_branch: { select: { id: true, name: true, name_ar: true } },
      items: {
        include: { product: { select: { id: true, name: true, name_ar: true, barcode: true } } },
      },
    },
  });

  audit('create_stock_transfer', 'stock_transfer', result.id, {
    branch_id: data.from_branch_id,
    user_id: created_by,
    metadata: { from_branch: data.from_branch_id, to_branch: data.to_branch_id, items_count: items.length },
  });

  return result;
};

export const approveStockTransfer = async (id, userId) => {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id, deleted_at: null, status: 'pending' },
    include: { items: true },
  });
  if (!transfer) throw new AppError('التحويل غير موجود أو تمت معالجته مسبقاً', 404);

  await prisma.$transaction(async (tx) => {
    const productIds = transfer.items.map((i) => i.product_id);

    const fromBalances = await tx.inventoryBalance.findMany({
      where: {
        branch_id: transfer.from_branch_id,
        product_id: { in: productIds },
        warehouse_id: transfer.from_warehouse_id || null,
      },
    });
    const fromBalanceMap = Object.fromEntries(fromBalances.map((b) => [b.product_id, b]));

    const toBalances = await tx.inventoryBalance.findMany({
      where: {
        branch_id: transfer.to_branch_id,
        product_id: { in: productIds },
        warehouse_id: transfer.to_warehouse_id || null,
      },
    });
    const toBalanceMap = Object.fromEntries(toBalances.map((b) => [b.product_id, b]));

    const insufficient = transfer.items.filter((item) => {
      const balance = fromBalanceMap[item.product_id];
      return !balance || balance.quantity < item.quantity;
    });
    if (insufficient.length > 0) {
      const products = await tx.product.findMany({
        where: { id: { in: insufficient.map((i) => i.product_id) } },
        select: { id: true, name_ar: true },
      });
      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
      throw new AppError(`الرصيد غير كافٍ للمنتج: ${productMap[insufficient[0].product_id]?.name_ar || insufficient[0].product_id}`, 400);
    }

    const stockMovementsOut = [];
    const stockMovementsIn = [];
    const balanceUpdates = [];

    for (const item of transfer.items) {
      const fromB = fromBalanceMap[item.product_id];
      stockMovementsOut.push({
        branch_id: transfer.from_branch_id,
        product_id: item.product_id,
        warehouse_id: transfer.from_warehouse_id,
        type: 'transfer',
        quantity: -item.quantity,
        reference_id: transfer.id,
        reference_type: 'stock_transfer_out',
        notes: `تحويل مخزون إلى ${transfer.to_branch_id}`,
      });

      balanceUpdates.push(tx.inventoryBalance.update({
        where: { id: fromB.id },
        data: { quantity: { increment: -item.quantity } },
      }));

      const toB = toBalanceMap[item.product_id];
      if (toB) {
        balanceUpdates.push(tx.inventoryBalance.update({
          where: { id: toB.id },
          data: { quantity: { increment: item.quantity } },
        }));
      } else {
        balanceUpdates.push(tx.inventoryBalance.create({
          data: {
            branch_id: transfer.to_branch_id,
            product_id: item.product_id,
            warehouse_id: transfer.to_warehouse_id || null,
            quantity: item.quantity,
          },
        }));
      }

      stockMovementsIn.push({
        branch_id: transfer.to_branch_id,
        product_id: item.product_id,
        warehouse_id: transfer.to_warehouse_id,
        type: 'transfer',
        quantity: item.quantity,
        reference_id: transfer.id,
        reference_type: 'stock_transfer_in',
        notes: `استلام تحويل مخزون من ${transfer.from_branch_id}`,
      });
    }

    await tx.stockMovement.createMany({ data: stockMovementsOut });
    await tx.stockMovement.createMany({ data: stockMovementsIn });
    await Promise.all(balanceUpdates);

    await tx.stockTransfer.update({
      where: { id },
      data: {
        status: 'completed',
        approved_by: userId,
        approved_at: new Date(),
        completed_by: userId,
        completed_at: new Date(),
      },
    });
  });

  const result = await prisma.stockTransfer.findFirst({
    where: { id },
    include: {
      from_branch: { select: { id: true, name: true, name_ar: true } },
      to_branch: { select: { id: true, name: true, name_ar: true } },
      items: { include: { product: { select: { id: true, name: true, name_ar: true } } } },
    },
  });

  audit('approve_stock_transfer', 'stock_transfer', id, {
    branch_id: transfer.from_branch_id,
    user_id: userId,
    metadata: { from_branch: transfer.from_branch_id, to_branch: transfer.to_branch_id, items_count: transfer.items.length },
  });

  return result;
};

export const cancelStockTransfer = async (id, userId) => {
  const transfer = await prisma.stockTransfer.findFirst({
    where: { id, deleted_at: null, status: 'pending' },
  });
  if (!transfer) throw new AppError('التحويل غير موجود أو تمت معالجته مسبقاً', 404);

  const result = await prisma.stockTransfer.update({
    where: { id },
    data: { status: 'cancelled', deleted_at: new Date() },
  });

  audit('cancel_stock_transfer', 'stock_transfer', id, {
    branch_id: transfer.from_branch_id,
    user_id: userId,
    metadata: { from_branch: transfer.from_branch_id, to_branch: transfer.to_branch_id },
  });

  return result;
};

// ─── Wastage / Missing ──────────────────────────────

export const getWastageMovements = async ({ branch_id, reference_type, product_id, warehouse_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    type: 'adjustment',
    reference_type: { in: ['wastage', 'missing'] },
    ...(branch_id && { branch_id }),
    ...(reference_type && { reference_type }),
    ...(product_id && { product_id }),
    ...(warehouse_id && { warehouse_id }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, name_ar: true, barcode: true } },
        warehouse: { select: { id: true, name: true, name_ar: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: movements,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const createWastage = async (data) => {
  const quantity = -Math.abs(data.quantity);
  const movement = await prisma.stockMovement.create({
    data: {
      branch_id: data.branch_id,
      warehouse_id: data.warehouse_id || null,
      product_id: data.product_id,
      type: 'adjustment',
      quantity,
      reference_type: data.wastage_type,
      reference_id: data.reference_id || null,
      notes: `${data.notes || ''} [${data.wastage_type === 'wastage' ? 'تالف' : 'مفقود'}]`,
    },
  });

  const balanceWhere = {
    branch_id: data.branch_id,
    warehouse_id: data.warehouse_id || null,
    product_id: data.product_id,
  };

  const existing = await prisma.inventoryBalance.findFirst({ where: balanceWhere });
  if (existing) {
    if (existing.quantity < Math.abs(quantity)) {
      await prisma.stockMovement.update({ where: { id: movement.id }, data: { deleted_at: new Date() } });
      throw new AppError('الرصيد غير كافٍ للتالف/المفقود', 400);
    }
    await prisma.inventoryBalance.update({
      where: { id: existing.id },
      data: { quantity: { increment: quantity } },
    });
  } else {
    await prisma.stockMovement.update({ where: { id: movement.id }, data: { deleted_at: new Date() } });
    throw new AppError('لا يوجد رصيد لهذا المنتج', 400);
  }

  audit('create_wastage', 'stock_movement', movement.id, {
    branch_id: data.branch_id,
    user_id: data.created_by,
    metadata: { wastage_type: data.wastage_type, quantity, product_id: data.product_id, notes: data.notes },
  });

  return movement;
};

export const getLowStockProducts = async (branch_id) => {
  const branchFilter = branch_id ? { branch_id } : {};

  const products = await prisma.product.findMany({
    where: { deleted_at: null, is_active: true, min_stock: { gt: 0 }, ...branchFilter },
    select: {
      id: true, name: true, name_ar: true, barcode: true, min_stock: true,
      inventory_balances: { select: { id: true, quantity: true, warehouse: { select: { id: true, name: true, name_ar: true } } } },
    },
  });

  const result = products
    .map((p) => {
      const totalStock = p.inventory_balances.reduce((s, b) => s + b.quantity, 0);
      const warehouses = p.inventory_balances.map((b) => b.warehouse).filter(Boolean);
      return {
        id: p.id, name: p.name, name_ar: p.name_ar, barcode: p.barcode,
        min_stock: p.min_stock, current_stock: totalStock,
        warehouses: [...new Map(warehouses.map((w) => [w.id, w])).values()],
      };
    })
    .filter((p) => p.current_stock <= p.min_stock)
    .sort((a, b) => a.current_stock - b.current_stock);

  return {
    data: result,
    meta: {
      total: result.length,
      low_stock: result.filter((p) => p.current_stock > 0).length,
      out_of_stock: result.filter((p) => p.current_stock === 0).length,
    },
  };
};
