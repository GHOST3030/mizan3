import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

export const getUnits = async () => {
  return prisma.unit.findMany({
    where: { deleted_at: null },
    orderBy: { name: 'asc' },
  });
};

export const getUnitById = async (id) => {
  const unit = await prisma.unit.findFirst({ where: { id, deleted_at: null } });
  if (!unit) throw new AppError('الوحدة غير موجودة', 404);
  return unit;
};

export const createUnit = async (data) => {
  const { user_id, ...dbData } = data;
  const result = await prisma.unit.create({ data: dbData });
  audit('create_unit', 'unit', result.id, {
    user_id,
    metadata: { name: result.name, name_ar: result.name_ar },
  });
  return result;
};

export const updateUnit = async (id, data) => {
  const { user_id, ...dbData } = data;
  const unit = await prisma.unit.findFirst({ where: { id, deleted_at: null } });
  if (!unit) throw new AppError('الوحدة غير موجودة', 404);
  const result = await prisma.unit.update({ where: { id }, data: dbData });
  audit('update_unit', 'unit', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteUnit = async (id, user_id) => {
  const unit = await prisma.unit.findFirst({ where: { id, deleted_at: null } });
  if (!unit) throw new AppError('الوحدة غير موجودة', 404);

  const hasProducts = await prisma.product.findFirst({
    where: { unit_id: id, deleted_at: null },
  });
  if (hasProducts) throw new AppError('لا يمكن حذف وحدة مرتبطة بمنتجات', 400);

  const result = await prisma.unit.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_unit', 'unit', id, {
    user_id,
    metadata: { name: unit.name, name_ar: unit.name_ar },
  });
  return result;
};