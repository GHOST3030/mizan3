import { z } from 'zod';

export const createWarehouseSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1, 'الاسم مطلوب'),
  name_ar: z.string().min(1, 'الاسم بالعربي مطلوب'),
  is_active: z.boolean().default(true),
});

export const updateWarehouseSchema = createWarehouseSchema.partial();

export const searchBalanceSchema = z.object({
  branch_id: z.string().uuid().optional(),
  warehouse_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  q: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

export const searchMovementSchema = z.object({
  product_id: z.string().uuid().optional(),
  type: z.enum(['purchase', 'sale', 'return_sale', 'return_purchase', 'adjustment', 'transfer']).optional(),
  branch_id: z.string().uuid().optional(),
  warehouse_id: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

export const createMovementSchema = z.object({
  branch_id: z.string().uuid(),
  warehouse_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid(),
  type: z.enum(['purchase', 'sale', 'return_sale', 'return_purchase', 'adjustment', 'transfer']),
  quantity: z.number().int(),
  reference_id: z.string().optional().nullable(),
  reference_type: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const searchStockCountSchema = z.object({
  branch_id: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

export const createStockCountSchema = z.object({
  branch_id: z.string().uuid(),
  warehouse_id: z.string().uuid().optional().nullable(),
  user_id: z.string().uuid(),
  counted_at: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    expected_qty: z.number().int(),
    actual_qty: z.number().int(),
  })).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

// ─── Stock Transfers ────────────────────────────────

export const createStockTransferSchema = z.object({
  from_branch_id: z.string().uuid(),
  to_branch_id: z.string().uuid(),
  from_warehouse_id: z.string().uuid().optional().nullable(),
  to_warehouse_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    cost_price: z.number().int().default(0),
  })).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

// ─── Wastage / Missing ─────────────────────────────

export const createWastageSchema = z.object({
  branch_id: z.string().uuid(),
  warehouse_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  wastage_type: z.enum(['wastage', 'missing']),
  reference_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const searchWastageSchema = z.object({
  branch_id: z.string().uuid().optional(),
  reference_type: z.enum(['wastage', 'missing']).optional(),
  product_id: z.string().uuid().optional(),
  warehouse_id: z.string().uuid().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});

export const searchStockTransferSchema = z.object({
  from_branch_id: z.string().uuid().optional(),
  to_branch_id: z.string().uuid().optional(),
  status: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
});
