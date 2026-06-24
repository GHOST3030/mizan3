import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';

export const getProductUnits = async (product_id) => {
  return prisma.productUnit.findMany({
    where: { product_id, deleted_at: null },
    include: { unit: { select: { id: true, name: true, name_ar: true } } },
    orderBy: { is_base: 'desc' },
  });
};

export const createProductUnit = async (data) => {
  const { product_id, unit_id, is_base } = data;

  const product = await prisma.product.findFirst({
    where: { id: product_id, deleted_at: null },
  });
  if (!product) throw new AppError('المنتج غير موجود', 404);

  const existing = await prisma.productUnit.findFirst({
    where: { product_id, unit_id, deleted_at: null },
  });
  if (existing) throw new AppError('هذه الوحدة مضافة مسبقاً لهذا المنتج', 409);

  if (is_base) {
    await prisma.productUnit.updateMany({
      where: { product_id, is_base: true, deleted_at: null },
      data: { is_base: false },
    });
  }

  return prisma.productUnit.create({
    data,
    include: { unit: { select: { id: true, name: true, name_ar: true } } },
  });
};

export const updateProductUnit = async (id, data) => {
  const existing = await prisma.productUnit.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) throw new AppError('السجل غير موجود', 404);

  if (data.is_base) {
    await prisma.productUnit.updateMany({
      where: { product_id: existing.product_id, is_base: true, deleted_at: null, NOT: { id } },
      data: { is_base: false },
    });
  }

  return prisma.productUnit.update({
    where: { id },
    data,
    include: { unit: { select: { id: true, name: true, name_ar: true } } },
  });
};

export const deleteProductUnit = async (id) => {
  const existing = await prisma.productUnit.findFirst({
    where: { id, deleted_at: null },
    include: { product: { select: { id: true, unit_id: true } } },
  });
  if (!existing) throw new AppError('السجل غير موجود', 404);

  if (existing.product.unit_id === existing.unit_id) {
    throw new AppError('لا يمكن حذف الوحدة الأساسية للمنتج', 400);
  }

  return prisma.productUnit.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
};

export const bulkSetProductUnits = async (product_id, units) => {
  const product = await prisma.product.findFirst({
    where: { id: product_id, deleted_at: null },
  });
  if (!product) throw new AppError('المنتج غير موجود', 404);

  return prisma.$transaction(async (tx) => {
    await tx.productUnit.updateMany({
      where: { product_id, deleted_at: null },
      data: { deleted_at: new Date() },
    });

    const created = [];
    for (const unit of units) {
      const createdUnit = await tx.productUnit.create({
        data: {
          product_id,
          unit_id: unit.unit_id,
          conversion_factor: unit.conversion_factor,
          purchase_price: unit.purchase_price || null,
          selling_price: unit.selling_price || null,
          is_base: unit.is_base || false,
        },
        include: { unit: { select: { id: true, name: true, name_ar: true } } },
      });
      created.push(createdUnit);
    }

    const baseUnit = created.find((u) => u.is_base);
    if (baseUnit && baseUnit.unit_id !== product.unit_id) {
      await tx.product.update({
        where: { id: product_id },
        data: { unit_id: baseUnit.unit_id },
      });
    }

    return created;
  }, { timeout: 15000 });
};
