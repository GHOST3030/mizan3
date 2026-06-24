import { z } from 'zod';

export const createCustomerGroupSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

export const updateCustomerGroupSchema = createCustomerGroupSchema.partial();

export const createCustomerSchema = z.object({
  branch_id: z.string().uuid('branch_id غير صالح'),
  customer_group_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().optional().nullable(),
  email: z.string().email('البريد غير صالح').optional().nullable(),
  tax_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  balance: z.number().int().default(0),
  credit_limit: z.number().int().default(0),
  opening_balance: z.number().int().default(0),
  opening_balance_date: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const setOpeningBalanceSchema = z.object({
  opening_balance: z.number().int(),
  opening_balance_date: z.string().optional().nullable(),
});

export const searchCustomerSchema = z.object({
  q: z.string().optional(),
  group_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});
