import { prisma } from '../../lib/prisma.js';
import { log } from '../audit/audit.service.js';
import { AppError } from '../../utils/AppError.js';

const audit = async (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

// ─── Safe Boxes ───────────────────────────────────────

export const getSafeBoxes = async (branch_id) => {
  return prisma.safeBox.findMany({
    where: { deleted_at: null, ...(branch_id && { branch_id }) },
    include: { currency: { select: { id: true, code: true, symbol: true, name: true } } },
    orderBy: { name: 'asc' },
  });
};

export const createSafeBox = async (data) => {
  const result = await prisma.safeBox.create({
    data,
    include: { currency: { select: { id: true, code: true, symbol: true } } },
  });
  audit('create_safe_box', 'safe_box', result.id, {
    branch_id: data.branch_id, user_id: data.created_by,
    metadata: { name: result.name_ar, currency_id: data.currency_id },
  });
  return result;
};

export const updateSafeBox = async (id, data) => {
  const safe = await prisma.safeBox.findFirst({ where: { id, deleted_at: null } });
  if (!safe) throw new AppError('الخزنة غير موجودة', 404);
  const result = await prisma.safeBox.update({ where: { id }, data });
  audit('update_safe_box', 'safe_box', id, {
    branch_id: safe.branch_id, user_id: data.updated_by,
    metadata: { name: result.name_ar },
  });
  return result;
};

export const deleteSafeBox = async (id, userId) => {
  const safe = await prisma.safeBox.findFirst({ where: { id, deleted_at: null } });
  if (!safe) throw new AppError('الخزنة غير موجودة', 404);
  const hasMovements = await prisma.safeMovement.findFirst({ where: { safe_id: id, deleted_at: null } });
  if (hasMovements) throw new AppError('لا يمكن حذف خزنة مرتبطة بحركات', 400);
  await prisma.safeBox.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_safe_box', 'safe_box', id, {
    branch_id: safe.branch_id, user_id: userId,
    metadata: { name: safe.name_ar },
  });
};

// ─── Safe Movements ───────────────────────────────────

export const getSafeMovements = async ({ safe_id, branch_id, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(safe_id && { safe_id }),
    ...(branch_id && {
      safe: { branch_id },
    }),
  };

  const [movements, total] = await Promise.all([
    prisma.safeMovement.findMany({
      where,
      include: {
        safe: { select: { id: true, name: true, name_ar: true } },
        currency: { select: { id: true, code: true, symbol: true } },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take,
    }),
    prisma.safeMovement.count({ where }),
  ]);

  return {
    data: movements,
    meta: { total, page: parseInt(page), limit: take, pages: Math.ceil(total / take) },
  };
};

export const createSafeMovement = async (data) => {
  const safe = await prisma.safeBox.findFirst({ where: { id: data.safe_id, deleted_at: null } });
  if (!safe) throw new AppError('الخزنة غير موجودة', 404);

  if (data.type === 'cash_out' && safe.balance < data.amount) {
    throw new AppError('رصيد الخزنة غير كافٍ', 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    const movement = await tx.safeMovement.create({ data });

    const increment = data.type === 'cash_in' || data.type === 'transfer_from_register'
      ? data.amount : -data.amount;

    await tx.safeBox.update({
      where: { id: data.safe_id },
      data: { balance: { increment } },
    });

    return movement;
  });

  audit('create_safe_movement', 'safe_movement', result.id, {
    branch_id: safe.branch_id, user_id: data.created_by,
    metadata: { type: data.type, amount: data.amount, safe_id: data.safe_id, notes: data.notes },
  });

  return result;
};
