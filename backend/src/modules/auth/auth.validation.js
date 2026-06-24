import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const createUserSchema = z.object({
  branch_id: z.string().uuid('branch_id غير صالح'),
  name: z.string().min(1, 'الاسم مطلوب'),
  username: z.string().min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  role: z.enum(['super_admin', 'admin', 'manager', 'cashier', 'accountant', 'inventory_manager', 'auditor']),
});

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true, role: true })
  .extend({
    password: z.string().min(6).optional(),
    is_active: z.boolean().optional(),
  });