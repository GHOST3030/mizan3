import { z } from 'zod';

// ─── Shifts ──────────────────────────────────────────

export const openShiftSchema = z.object({
  branch_id: z.string().uuid(),
  user_id: z.string().uuid(),
  opening_balance: z.number().min(0),
  notes: z.string().optional().nullable(),
});

export const closeShiftSchema = z.object({
  closing_balance: z.number().min(0),
  notes: z.string().optional().nullable(),
});

export const searchShiftSchema = z.object({
  branch_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

// ─── Cash Registers ──────────────────────────────────

export const createCashRegisterSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1, 'الاسم مطلوب'),
  balance: z.number().default(0),
  currency_id: z.string().uuid(),
});

export const updateCashRegisterSchema = createCashRegisterSchema.partial().extend({
  adjustment: z.number().optional(),
});

// ─── Expense Categories ─────────────────────────────

export const createExpenseCategorySchema = z.object({
  branch_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'الاسم بالإنجليزية مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربية مطلوب'),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

// ─── Expenses ────────────────────────────────────────

export const updateExpenseSchema = z.object({
  category: z.string().min(1, 'التصنيف مطلوب').optional(),
  category_id: z.string().optional().nullable(),
  amount: z.number().positive().optional(),
  currency_id: z.string().uuid().optional(),
  description: z.string().optional().nullable(),
  expense_date: z.string().optional(),
});

export const createExpenseSchema = z.object({
  branch_id: z.string().uuid(),
  user_id: z.string().uuid(),
  category: z.string().min(1, 'التصنيف مطلوب'),
  category_id: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency_id: z.string().uuid(),
  exchange_rate: z.number().positive().default(1),
  description: z.string().optional().nullable(),
  expense_date: z.string().optional(),
  payment_source: z.enum(['safe', 'cash_register', 'direct']).optional().default('direct'),
  source_id: z.string().uuid().optional().nullable(),
});

export const searchExpenseSchema = z.object({
  branch_id: z.string().uuid().optional(),
  category: z.string().optional(),
  category_id: z.string().optional(),
  status: z.string().optional(),
  payment_source: z.string().optional(),
  user_id: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

// ─── Currency Exchange ────────────────────────────────

export const currencyExchangeSchema = z.object({
  branch_id: z.string().uuid(),
  from_currency_id: z.string().uuid(),
  to_currency_id: z.string().uuid(),
  from_amount: z.number().positive(),
  exchange_rate: z.number().positive(),
  source: z.enum(['safe', 'cash_register']),
  source_id: z.string().uuid(),
  notes: z.string().optional().nullable(),
});
