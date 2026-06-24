import { z } from 'zod';

export const createProductSchema = z.object({
  branch_id: z.string().uuid('branch_id غير صالح'),
  category_id: z.string().uuid().optional().nullable(),
  unit_id: z.string().uuid('unit_id مطلوب'),
  brand_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربي مطلوب'),
  barcode: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  cost_price: z.number().int().min(0, 'سعر التكلفة يجب أن يكون 0 أو أكثر'),
  selling_price: z.number().int().min(0, 'سعر البيع يجب أن يكون 0 أو أكثر'),
  min_stock: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const searchProductSchema = z.object({
  q: z.string().optional(),
  category_id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  with_stock: z.enum(['true', 'false']).optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});