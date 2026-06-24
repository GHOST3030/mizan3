import { z } from 'zod';

export const createCurrencySchema = z.object({
  code: z.string().min(2).max(5, 'الرمز يجب أن يكون بين 2 و 5 أحرف'),
  name: z.string().min(1, 'الاسم مطلوب'),
  symbol: z.string().min(1, 'الرمز المختصر مطلوب'),
  exchange_rate: z.number().int().positive('سعر الصرف يجب أن يكون رقماً موجباً'),
  is_default: z.boolean().optional().default(false),
});

export const updateCurrencySchema = createCurrencySchema.partial();