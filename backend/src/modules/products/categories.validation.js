import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربي مطلوب'),
  parent_id: z.string().uuid().optional().nullable(),
});

export const updateCategorySchema = createCategorySchema.partial();