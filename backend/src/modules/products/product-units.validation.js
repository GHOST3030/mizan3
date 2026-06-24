import { z } from 'zod';

export const createProductUnitSchema = z.object({
  product_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  conversion_factor: z.number().int().min(1, 'معامل التحويل يجب أن يكون 1 أو أكثر'),
  purchase_price: z.number().int().min(0).optional().nullable(),
  selling_price: z.number().int().min(0).optional().nullable(),
  is_base: z.boolean().default(false),
});

export const updateProductUnitSchema = createProductUnitSchema.partial().omit({ product_id: true });

export const bulkSetProductUnitsSchema = z.object({
  product_id: z.string().uuid(),
  units: z.array(z.object({
    id: z.string().uuid().optional().nullable(),
    unit_id: z.string().uuid(),
    conversion_factor: z.number().int().min(1),
    purchase_price: z.number().int().min(0).optional().nullable(),
    selling_price: z.number().int().min(0).optional().nullable(),
    is_base: z.boolean().default(false),
  })).min(1),
});
