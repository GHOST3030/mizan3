import { z } from 'zod';

export const createSafeBoxSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1),
  name_ar: z.string().min(1),
  currency_id: z.string().uuid(),
  is_active: z.boolean().default(true),
});

export const updateSafeBoxSchema = createSafeBoxSchema.partial();

export const createSafeMovementSchema = z.object({
  safe_id: z.string().uuid(),
  type: z.enum(['cash_in', 'cash_out', 'transfer_from_register', 'transfer_to_register']),
  amount: z.number().int().min(1),
  currency_id: z.string().uuid(),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_by: z.string().uuid(),
});
