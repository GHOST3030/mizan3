import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

export const getCategories = async () => {
  return prisma.category.findMany({
    where: { deleted_at: null },
    include: {
      children: {
        where: { deleted_at: null },
        select: { id: true, name: true, name_ar: true },
      },
    },
    orderBy: { name: 'asc' },
  });
};

export const getCategoryById = async (id) => {
  const category = await prisma.category.findFirst({
    where: { id, deleted_at: null },
    include: {
      children: { where: { deleted_at: null } },
      parent: true,
    },
  });
  if (!category) throw new AppError('التصنيف غير موجود', 404);
  return category;
};

export const createCategory = async (data) => {
  const { user_id, ...dbData } = data;
  if (dbData.parent_id) {
    const parent = await prisma.category.findFirst({
      where: { id: dbData.parent_id, deleted_at: null },
    });
    if (!parent) throw new AppError('التصنيف الأب غير موجود', 404);
  }

  const result = await prisma.category.create({ data: dbData });
  audit('create_category', 'category', result.id, {
    user_id,
    metadata: { name: result.name, name_ar: result.name_ar },
  });
  return result;
};

export const updateCategory = async (id, data) => {
  const { user_id, ...dbData } = data;
  const category = await prisma.category.findFirst({
    where: { id, deleted_at: null },
  });
  if (!category) throw new AppError('التصنيف غير موجود', 404);

  const result = await prisma.category.update({ where: { id }, data: dbData });
  audit('update_category', 'category', id, {
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteCategory = async (id, user_id) => {
  const category = await prisma.category.findFirst({
    where: { id, deleted_at: null },
  });
  if (!category) throw new AppError('التصنيف غير موجود', 404);

  const hasProducts = await prisma.product.findFirst({
    where: { category_id: id, deleted_at: null },
  });
  if (hasProducts) throw new AppError('لا يمكن حذف تصنيف مرتبط بمنتجات', 400);

  const result = await prisma.category.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
  audit('delete_category', 'category', id, {
    user_id,
    metadata: { name: category.name, name_ar: category.name_ar },
  });
  return result;
};