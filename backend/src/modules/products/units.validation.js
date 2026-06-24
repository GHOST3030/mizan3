import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربي مطلوب'),
});

export const updateUnitSchema = createUnitSchema.partial();