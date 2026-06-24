import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

export const getBrands = async () => {
  return prisma.brand.findMany({
    where: { deleted_at: null },
    orderBy: { name: 'asc' },
  });
};

export const getBrandById = async (id) => {
  const brand = await prisma.brand.findFirst({ where: { id, deleted_at: null } });
  if (!brand) throw new AppError('العلامة التجارية غير موجودة', 404);
  return brand;
};

export const createBrand = async (data) => {
  const { user_id, ...dbData } = data;
  const result = await prisma.brand.create({ data: dbData });
  audit('create_brand', 'brand', result.id, {
    user_id,
    metadata: { name: result.name },
  });
  return result;
};

export const updateBrand = async (id, data) => {
  const { user_id, ...dbData } = data;
  const brand = await prisma.brand.findFirst({ where: { id, deleted_at: null } });
  if (!brand) throw new AppError('العلامة التجارية غير موجودة', 404);
  const result = await prisma.brand.update({ where: { id }, data: dbData });
  audit('update_brand', 'brand', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteBrand = async (id, user_id) => {
  const brand = await prisma.brand.findFirst({ where: { id, deleted_at: null } });
  if (!brand) throw new AppError('العلامة التجارية غير موجودة', 404);

  const hasProducts = await prisma.product.findFirst({
    where: { brand_id: id, deleted_at: null },
  });
  if (hasProducts) throw new AppError('لا يمكن حذف علامة تجارية مرتبطة بمنتجات', 400);

  const result = await prisma.brand.update({ where: { id }, data: { deleted_at: new Date() } });
  audit('delete_brand', 'brand', id, {
    user_id,
    metadata: { name: brand.name },
  });
  return result;
};