import { z } from 'zod';

export const createSupplierCategorySchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  description: z.string().optional().nullable(),
});

export const updateSupplierCategorySchema = createSupplierCategorySchema.partial();

export const createSupplierSchema = z.object({
  branch_id: z.string().uuid('branch_id غير صالح'),
  supplier_category_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  tax_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  balance: z.number().default(0),
  opening_balance: z.number().default(0),
  opening_balance_date: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const setOpeningBalanceSchema = z.object({
  opening_balance: z.number(),
  opening_balance_date: z.string().optional().nullable(),
});

export const searchSupplierSchema = z.object({
  q: z.string().optional(),
  category_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});
