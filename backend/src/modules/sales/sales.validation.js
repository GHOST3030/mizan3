import { z } from 'zod';

export const createSaleItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1, 'الكمية يجب أن تكون 1 على الأقل'),
  unit_price: z.number().int().min(0),
  discount: z.number().int().default(0),
  total: z.number().int().min(0),
});

export const createSalePaymentSchema = z.object({
  method: z.enum(['cash', 'card', 'transfer', 'credit']),
  amount: z.number().int().min(0),
  currency_id: z.string().uuid(),
  exchange_rate: z.number().int().default(1),
});

export const createSaleSchema = z.object({
  branch_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid(),
  subtotal: z.number().int().min(0),
  discount_amount: z.number().int().default(0),
  tax_amount: z.number().int().default(0),
  currency_id: z.string().uuid(),
  exchange_rate: z.number().int().default(1),
  notes: z.string().optional().nullable(),
  created_by: z.string().optional(),
  schedule_due_date: z.string().optional().nullable(),
  schedule_notes: z.string().optional().nullable(),
  items: z.array(createSaleItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
  payments: z.array(createSalePaymentSchema).optional(),
});

export const updateSaleStatusSchema = z.object({
  status: z.enum(['draft', 'completed', 'returned']),
});

export const payScheduleSchema = z.object({
  amount: z.number().int().min(1, 'المبلغ يجب أن يكون 1 على الأقل'),
  method: z.enum(['cash', 'card', 'transfer', 'credit']).default('cash'),
  currency_id: z.string().uuid(),
  exchange_rate: z.number().int().default(1),
});

export const searchPaymentScheduleSchema = z.object({
  sale_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'partial', 'paid', 'cancelled']).optional(),
  branch_id: z.string().uuid().optional(),
});

export const searchSaleSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['draft', 'completed', 'returned', 'cancelled']).optional(),
  customer_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

export const cancelSaleSchema = z.object({
  reason: z.string().min(1, 'سبب الإلغاء مطلوب'),
  note: z.string().optional().nullable(),
  user_id: z.string().uuid(),
});

export const reviewCancelSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().optional().nullable(),
});

export const holdSaleSchema = z.object({
  branch_id: z.string().uuid(),
  shift_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  subtotal: z.number().int().min(0),
  discount_amount: z.number().int().default(0),
  tax_amount: z.number().int().default(0),
  currency_id: z.string().uuid(),
  exchange_rate: z.number().int().default(1),
  notes: z.string().optional().nullable(),
  items: z.array(createSaleItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
});
