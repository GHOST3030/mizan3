import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { log } from '../audit/audit.service.js';

const audit = (action, entity, entity_id, data) => {
  log({ action, entity, entity_id, ...data }).catch(() => {});
};

export const getProducts = async ({ q, category_id, brand_id, branch_id, is_active, with_stock, page = '1', limit = '20' }) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const where = {
    deleted_at: null,
    ...(branch_id && { branch_id }),
    ...(category_id && { category_id }),
    ...(brand_id && { brand_id }),
    ...(is_active !== undefined && { is_active: is_active === 'true' }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { name_ar: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };

  const include = {
    category: { select: { id: true, name: true, name_ar: true } },
    unit: { select: { id: true, name: true, name_ar: true } },
    brand: { select: { id: true, name: true } },
    product_units: {
      where: { deleted_at: null },
      include: { unit: { select: { id: true, name: true, name_ar: true } } },
      orderBy: { is_base: 'desc' },
    },
  };

  if (with_stock === 'true' && branch_id) {
    include.inventory_balances = {
      where: { branch_id },
      select: { quantity: true },
    };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    meta: {
      total,
      page: parseInt(page),
      limit: take,
      pages: Math.ceil(total / take),
    },
  };
};

export const getProductById = async (id) => {
  const product = await prisma.product.findFirst({
    where: { id, deleted_at: null },
    include: {
      category: true,
      unit: true,
      brand: true,
      product_units: {
        where: { deleted_at: null },
        include: { unit: { select: { id: true, name: true, name_ar: true } } },
        orderBy: { is_base: 'desc' },
      },
    },
  });
  if (!product) throw new AppError('المنتج غير موجود', 404);
  return product;
};

export const getProductByBarcode = async (barcode) => {
  const product = await prisma.product.findFirst({
    where: { barcode, deleted_at: null },
    include: {
      category: { select: { id: true, name: true, name_ar: true } },
      unit: { select: { id: true, name: true, name_ar: true } },
      brand: { select: { id: true, name: true } },
      product_units: {
        where: { deleted_at: null },
        include: { unit: { select: { id: true, name: true, name_ar: true } } },
        orderBy: { is_base: 'desc' },
      },
    },
  });
  if (!product) throw new AppError('المنتج غير موجود', 404);
  return product;
};

export const createProduct = async (data) => {
  const { user_id, ...dbData } = data;
  if (dbData.barcode) {
    const existing = await prisma.product.findFirst({
      where: { barcode: dbData.barcode, deleted_at: null },
    });
    if (existing) throw new AppError('الباركود مستخدم بالفعل', 409);
  }

  const result = await prisma.product.create({
    data: dbData,
    include: {
      category: { select: { id: true, name: true, name_ar: true } },
      unit: { select: { id: true, name: true, name_ar: true } },
      brand: { select: { id: true, name: true } },
      product_units: {
        where: { deleted_at: null },
        include: { unit: { select: { id: true, name: true, name_ar: true } } },
        orderBy: { is_base: 'desc' },
      },
    },
  });
  // Auto-create base ProductUnit if none provided
  const existingUnits = await prisma.productUnit.count({
    where: { product_id: result.id, deleted_at: null },
  });
  if (existingUnits === 0) {
    await prisma.productUnit.create({
      data: {
        product_id: result.id,
        unit_id: result.unit_id,
        conversion_factor: 1,
        purchase_price: result.cost_price,
        selling_price: result.selling_price,
        is_base: true,
      },
    }).catch(() => {});
  }
  audit('create_product', 'product', result.id, {
    branch_id: result.branch_id,
    user_id,
    metadata: { name: result.name, name_ar: result.name_ar, barcode: result.barcode },
  });
  return result;
};

export const updateProduct = async (id, data) => {
  const { user_id, ...dbData } = data;
  const product = await prisma.product.findFirst({
    where: { id, deleted_at: null },
  });
  if (!product) throw new AppError('المنتج غير موجود', 404);

  if (dbData.barcode && dbData.barcode !== product.barcode) {
    const existing = await prisma.product.findFirst({
      where: { barcode: dbData.barcode, deleted_at: null, NOT: { id } },
    });
    if (existing) throw new AppError('الباركود مستخدم بالفعل', 409);
  }

  const result = await prisma.product.update({
    where: { id },
    data: dbData,
    include: {
      category: { select: { id: true, name: true, name_ar: true } },
      unit: { select: { id: true, name: true, name_ar: true } },
      brand: { select: { id: true, name: true } },
      product_units: {
        where: { deleted_at: null },
        include: { unit: { select: { id: true, name: true, name_ar: true } } },
        orderBy: { is_base: 'desc' },
      },
    },
  });
  audit('update_product', 'product', id, {
    branch_id: product.branch_id,
    user_id,
    metadata: { name: result.name, changes: Object.keys(dbData) },
  });
  return result;
};

export const deleteProduct = async (id, user_id) => {
  const product = await prisma.product.findFirst({
    where: { id, deleted_at: null },
  });
  if (!product) throw new AppError('المنتج غير موجود', 404);

  const result = await prisma.product.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
  audit('delete_product', 'product', id, {
    branch_id: product.branch_id,
    user_id,
    metadata: { name: product.name, barcode: product.barcode },
  });
  return result;
};