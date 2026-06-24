-- Create ExpenseCategory table
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT,
    "name" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new columns to expenses table
ALTER TABLE "expenses" ADD COLUMN "category_id" TEXT;
ALTER TABLE "expenses" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "expenses" ADD COLUMN "approved_by" TEXT;
ALTER TABLE "expenses" ADD COLUMN "approved_at" TIMESTAMPTZ;
ALTER TABLE "expenses" ADD COLUMN "rejection_reason" TEXT;
ALTER TABLE "expenses" ADD COLUMN "payment_source" TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE "expenses" ADD COLUMN "source_id" TEXT;

ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default expense categories
INSERT INTO "expense_categories" ("id", "branch_id", "name", "name_ar", "description") VALUES
  ('cat-rent', NULL, 'Rent', 'إيجار', 'إيجار المحل أو المكاتب'),
  ('cat-electricity', NULL, 'Electricity', 'كهرباء', 'فواتير الكهرباء'),
  ('cat-water', NULL, 'Water', 'مياه', 'فواتير المياه'),
  ('cat-salaries', NULL, 'Salaries', 'رواتب', 'رواتب الموظفين'),
  ('cat-maintenance', NULL, 'Maintenance', 'صيانة', 'صيانة المعدات والمباني'),
  ('cat-transport', NULL, 'Transportation', 'مواصلات', 'مصاريف النقل والمواصلات'),
  ('cat-supplies', NULL, 'Office Supplies', 'قرطاسية', 'مستلزمات مكتبية'),
  ('cat-marketing', NULL, 'Marketing', 'تسويق', 'مصاريف دعائية وإعلانية'),
  ('cat-other', NULL, 'Other', 'أخرى', 'مصروفات متنوعة');
