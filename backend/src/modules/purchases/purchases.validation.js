import { z } from 'zod';

export const createPurchaseItemSchema = z.object({
  product_id: z.string().uuid(),
  unit_id: z.string().uuid().optional().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().min(0),
  total: z.number().min(0),
});

export const createPurchaseSchema = z.object({
  branch_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid(),
  status: z.enum(['draft', 'completed']).default('draft'),
  subtotal: z.number().min(0),
  discount_amount: z.number().default(0),
  currency_id: z.string().uuid(),
  exchange_rate: z.number().positive().default(1),
  notes: z.string().optional().nullable(),
  created_by: z.string().optional(),
  items: z.array(createPurchaseItemSchema).min(1),
});

export const updatePurchaseSchema = z.object({
  status: z.enum(['draft', 'completed']).optional(),
  supplier_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  user_id: z.string().optional(),
});

export const updatePurchaseStatusSchema = z.object({
  status: z.enum(['draft', 'completed']),
});

export const searchPurchaseSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['draft', 'completed', 'returned', 'cancelled']).optional(),
  supplier_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});
