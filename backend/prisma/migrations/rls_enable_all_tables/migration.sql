-- Enable RLS on ALL tables

-- Core
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;

-- Auth
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Products
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Inventory
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

-- Sales
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Purchases
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- Finance
ALTER TABLE safe_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Audit
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Print Templates
ALTER TABLE print_templates ENABLE ROW LEVEL SECURITY;

-- RBAC
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Prisma
ALTER TABLE _prisma_migrations ENABLE ROW LEVEL SECURITY;

-- service_role: full access (backend connects via this role)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'companies','branches','currencies','settings','number_sequences',
      'users','shifts',
      'categories','units','product_units','brands','products',
      'warehouses','inventory_balances','stock_movements','stock_counts','stock_count_items',
      'stock_transfers','stock_transfer_items',
      'customer_groups','customers','sales','sale_items','sale_payments','payment_schedules',
      'supplier_categories','suppliers','purchases','purchase_items',
      'safe_boxes','safe_movements','cash_registers','expense_categories','expenses',
      'activity_logs',
      'print_templates',
      'roles','permissions','role_permissions','branch_assignments','user_permissions',
      '_prisma_migrations'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "service_role_full_access" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END
$$;

-- anon: no access at all
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'companies','branches','currencies','settings','number_sequences',
      'users','shifts',
      'categories','units','product_units','brands','products',
      'warehouses','inventory_balances','stock_movements','stock_counts','stock_count_items',
      'stock_transfers','stock_transfer_items',
      'customer_groups','customers','sales','sale_items','sale_payments','payment_schedules',
      'supplier_categories','suppliers','purchases','purchase_items',
      'safe_boxes','safe_movements','cash_registers','expense_categories','expenses',
      'activity_logs',
      'print_templates',
      'roles','permissions','role_permissions','branch_assignments','user_permissions',
      '_prisma_migrations'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "anon_no_access" ON %I FOR ALL TO anon USING (false) WITH CHECK (false)',
      tbl
    );
  END LOOP;
END
$$;

-- authenticated: read-only on global lookup tables
CREATE POLICY "authenticated_read_currencies" ON currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_units" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_brands" ON brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_permissions" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_customer_groups" ON customer_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_supplier_categories" ON supplier_categories FOR SELECT TO authenticated USING (true);
