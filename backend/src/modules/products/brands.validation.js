import { z } from 'zod';

export const createBrandSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
});

export const updateBrandSchema = createBrandSchema.partial();