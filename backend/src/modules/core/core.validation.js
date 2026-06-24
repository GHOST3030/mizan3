import { z } from 'zod';

export const uuidParam = z.object({
  id: z.string().uuid('المعرف يجب أن يكون UUID صالح'),
});

export const branchIdQuery = z.object({
  branch_id: z.string().uuid().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربية مطلوب'),
  logo_url: z.string().url().optional(),
  tax_number: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const createBranchSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربية مطلوب'),
  address: z.string().optional(),
  phone: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const updateBranchSchema = createBranchSchema.partial();

export const createSettingSchema = z.object({
  branch_id: z.string().uuid().optional(),
  key: z.string().min(1, 'المفتاح مطلوب'),
  value: z.string(),
});

export const updateSettingSchema = createSettingSchema.partial();

export const reseedSequenceSchema = z.object({
  branch_id: z.string().uuid(),
  type: z.string().min(1),
});

export const nextNumberQuerySchema = z.object({
  branch_id: z.string().uuid(),
  type: z.string().min(1),
});