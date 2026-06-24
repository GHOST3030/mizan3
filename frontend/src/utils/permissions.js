// Role→permission mapping matching backend/prisma/seed.js
const ROLE_PERMISSIONS_MAP = {
  super_admin: null, // null = all permissions
  admin: [
    'field:view_product_cost', 'field:view_profit_margin', 'field:view_profit_amount', 'field:view_inventory_value', 'field:view_daily_profit', 'field:view_monthly_profit', 'field:view_safe_balance', 'field:view_financial_summary', 'field:view_customer_balance', 'field:view_supplier_balance', 'field:view_purchase_costs',
    'dashboard:view_executive_dashboard', 'dashboard:view_company_profit', 'dashboard:view_branch_profit', 'dashboard:view_inventory_value', 'dashboard:view_financial_summary',
    'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
    'inventory:manage', 'inventory:adjustment', 'inventory:transfer', 'inventory:count', 'inventory:wastage',
    'sales:create', 'sales:edit', 'sales:cancel', 'sales:delete', 'sales:hold', 'sales:resume',
    'returns:create', 'returns:cancel', 'returns:delete',
    'products:manage', 'products:manage_categories',
    'business:manage_suppliers', 'business:manage_customers', 'business:manage_purchases', 'business:manage_expenses',
    'admin:manage_users', 'admin:manage_roles', 'admin:manage_permissions',
    'reporting:view_reports', 'reporting:export_reports',
    'audit:view_logs',
    'expense:view', 'expense:create', 'expense:edit', 'expense:approve', 'expense:delete', 'expense:category:manage',
    'report:financial', 'report:export',
    'shift:open', 'shift:close', 'shift:approve', 'cash_register:manage', 'currency:exchange',
    'template:manage', 'sale:cancel:review',
    'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
  ],
  manager: [
    'field:view_product_cost', 'field:view_profit_margin', 'field:view_profit_amount', 'field:view_inventory_value', 'field:view_daily_profit', 'field:view_monthly_profit', 'field:view_safe_balance', 'field:view_financial_summary', 'field:view_customer_balance', 'field:view_supplier_balance', 'field:view_purchase_costs',
    'dashboard:view_executive_dashboard', 'dashboard:view_company_profit', 'dashboard:view_branch_profit', 'dashboard:view_inventory_value', 'dashboard:view_financial_summary',
    'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
    'inventory:manage', 'inventory:adjustment', 'inventory:transfer', 'inventory:count', 'inventory:wastage',
    'sales:create', 'sales:edit', 'sales:cancel', 'sales:hold', 'sales:resume',
    'returns:create', 'returns:cancel',
    'products:manage', 'products:manage_categories',
    'business:manage_suppliers', 'business:manage_customers', 'business:manage_purchases', 'business:manage_expenses',
    'reporting:view_reports', 'reporting:export_reports',
    'expense:view', 'expense:create', 'expense:edit', 'expense:approve', 'expense:category:manage',
    'report:financial', 'report:export',
    'shift:open', 'shift:close', 'shift:approve', 'cash_register:manage', 'currency:exchange',
    'template:manage', 'sale:cancel:review',
    'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
  ],
  accountant: [
    'field:view_product_cost', 'field:view_profit_margin', 'field:view_profit_amount', 'field:view_inventory_value', 'field:view_daily_profit', 'field:view_monthly_profit', 'field:view_safe_balance', 'field:view_financial_summary', 'field:view_customer_balance', 'field:view_supplier_balance', 'field:view_purchase_costs',
    'dashboard:view_executive_dashboard', 'dashboard:view_company_profit', 'dashboard:view_financial_summary',
    'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
    'expense:view', 'expense:create',
    'report:financial', 'report:export',
    'reporting:view_reports', 'reporting:export_reports',
  ],
  inventory_manager: [
    'dashboard:view_executive_dashboard', 'dashboard:view_inventory_value',
    'inventory:manage', 'inventory:adjustment', 'inventory:transfer', 'inventory:count', 'inventory:wastage',
    'products:manage',
    'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
  ],
  cashier: [
    'sales:create', 'sales:cancel', 'sales:hold', 'sales:resume',
    'returns:create',
    'expense:view', 'shift:open', 'shift:close',
  ],
  auditor: [
    'financial:view_profit_reports', 'financial:view_financial_reports', 'financial:view_cost_reports',
    'reporting:view_reports', 'reporting:export_reports',
    'audit:view_logs',
    'report:financial', 'report:export',
    'inventory:movement:view', 'inventory:valuation:view', 'inventory:low_stock:view',
  ],
};

export function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  const perms = ROLE_PERMISSIONS_MAP[user.role];
  return perms ? perms.includes(permissionKey) : false;
}

export const PERMISSIONS = {
  // Financial
  VIEW_PROFIT_REPORTS: 'financial:view_profit_reports',
  VIEW_FINANCIAL_REPORTS: 'financial:view_financial_reports',
  VIEW_COST_REPORTS: 'financial:view_cost_reports',
  // Inventory
  MANAGE_INVENTORY: 'inventory:manage',
  INVENTORY_ADJUSTMENT: 'inventory:adjustment',
  INVENTORY_TRANSFER: 'inventory:transfer',
  INVENTORY_COUNT: 'inventory:count',
  INVENTORY_WASTAGE: 'inventory:wastage',
  // Sales
  CREATE_SALES: 'sales:create',
  EDIT_SALES: 'sales:edit',
  CANCEL_SALES: 'sales:cancel',
  DELETE_SALES: 'sales:delete',
  HOLD_SALES: 'sales:hold',
  RESUME_SALES: 'sales:resume',
  // Returns
  CREATE_RETURNS: 'returns:create',
  CANCEL_RETURNS: 'returns:cancel',
  DELETE_RETURNS: 'returns:delete',
  // Products
  MANAGE_PRODUCTS: 'products:manage',
  MANAGE_CATEGORIES: 'products:manage_categories',
  // Business
  MANAGE_SUPPLIERS: 'business:manage_suppliers',
  MANAGE_CUSTOMERS: 'business:manage_customers',
  MANAGE_PURCHASES: 'business:manage_purchases',
  MANAGE_EXPENSES: 'business:manage_expenses',
  // Administration
  MANAGE_USERS: 'admin:manage_users',
  MANAGE_ROLES: 'admin:manage_roles',
  MANAGE_PERMISSIONS: 'admin:manage_permissions',
  // Reporting
  VIEW_REPORTS: 'reporting:view_reports',
  EXPORT_REPORTS: 'reporting:export_reports',
  // Audit
  VIEW_AUDIT_LOGS: 'audit:view_logs',
  // Shifts (legacy keys)
  SHIFT_OPEN: 'shift:open',
  SHIFT_CLOSE: 'shift:close',
  SHIFT_APPROVE: 'shift:approve',
  // Expense (legacy keys)
  EXPENSE_VIEW: 'expense:view',
  EXPENSE_CREATE: 'expense:create',
  EXPENSE_EDIT: 'expense:edit',
  EXPENSE_APPROVE: 'expense:approve',
  EXPENSE_DELETE: 'expense:delete',
  EXPENSE_CATEGORY_MANAGE: 'expense:category:manage',
  // Finance
  CASH_REGISTER_MANAGE: 'cash_register:manage',
  CURRENCY_EXCHANGE: 'currency:exchange',
  // Settings
  TEMPLATE_MANAGE: 'template:manage',
  SALE_CANCEL_REVIEW: 'sale:cancel:review',
  // Inventory extras
  INVENTORY_MOVEMENT_VIEW: 'inventory:movement:view',
  INVENTORY_VALUATION_VIEW: 'inventory:valuation:view',
  INVENTORY_LOW_STOCK_VIEW: 'inventory:low_stock:view',
  // Reports legacy
  REPORT_FINANCIAL: 'report:financial',
  REPORT_EXPORT: 'report:export',
  // Executive Dashboard
  VIEW_EXECUTIVE_DASHBOARD: 'dashboard:view_executive_dashboard',
  VIEW_COMPANY_PROFIT: 'dashboard:view_company_profit',
  VIEW_BRANCH_PROFIT: 'dashboard:view_branch_profit',
  VIEW_INVENTORY_VALUE: 'dashboard:view_inventory_value',
  VIEW_FINANCIAL_SUMMARY: 'dashboard:view_financial_summary',
  // Field-Level Security
  VIEW_PRODUCT_COST_FIELD: 'field:view_product_cost',
  VIEW_PROFIT_MARGIN_FIELD: 'field:view_profit_margin',
  VIEW_PROFIT_AMOUNT_FIELD: 'field:view_profit_amount',
  VIEW_INVENTORY_VALUE_FIELD: 'field:view_inventory_value',
  VIEW_DAILY_PROFIT_FIELD: 'field:view_daily_profit',
  VIEW_MONTHLY_PROFIT_FIELD: 'field:view_monthly_profit',
  VIEW_SAFE_BALANCE_FIELD: 'field:view_safe_balance',
  VIEW_FINANCIAL_SUMMARY_FIELD: 'field:view_financial_summary',
  VIEW_CUSTOMER_BALANCE_FIELD: 'field:view_customer_balance',
  VIEW_SUPPLIER_BALANCE_FIELD: 'field:view_supplier_balance',
  VIEW_PURCHASE_COSTS_FIELD: 'field:view_purchase_costs',
};

export const permissionGroups = [
  {
    group: 'financial',
    label: 'المالية',
    permissions: [
      { key: PERMISSIONS.VIEW_PROFIT_REPORTS, label: 'عرض تقارير الأرباح' },
      { key: PERMISSIONS.VIEW_FINANCIAL_REPORTS, label: 'عرض التقارير المالية' },
      { key: PERMISSIONS.VIEW_COST_REPORTS, label: 'عرض تقارير التكاليف' },
    ],
  },
  {
    group: 'inventory',
    label: 'المخزون',
    permissions: [
      { key: PERMISSIONS.MANAGE_INVENTORY, label: 'إدارة المخزون' },
      { key: PERMISSIONS.INVENTORY_ADJUSTMENT, label: 'تسوية المخزون' },
      { key: PERMISSIONS.INVENTORY_TRANSFER, label: 'تحويل مخزون' },
      { key: PERMISSIONS.INVENTORY_COUNT, label: 'جرد المخزون' },
      { key: PERMISSIONS.INVENTORY_WASTAGE, label: 'تالف ومفقود' },
    ],
  },
  {
    group: 'sales',
    label: 'المبيعات',
    permissions: [
      { key: PERMISSIONS.CREATE_SALES, label: 'إنشاء فاتورة بيع' },
      { key: PERMISSIONS.EDIT_SALES, label: 'تعديل فاتورة بيع' },
      { key: PERMISSIONS.CANCEL_SALES, label: 'إلغاء فاتورة بيع' },
      { key: PERMISSIONS.DELETE_SALES, label: 'حذف فاتورة بيع' },
      { key: PERMISSIONS.HOLD_SALES, label: 'تعليق فاتورة بيع' },
      { key: PERMISSIONS.RESUME_SALES, label: 'استئناف فاتورة بيع' },
    ],
  },
  {
    group: 'returns',
    label: 'المرتجعات',
    permissions: [
      { key: PERMISSIONS.CREATE_RETURNS, label: 'إنشاء مرتجع' },
      { key: PERMISSIONS.CANCEL_RETURNS, label: 'إلغاء مرتجع' },
      { key: PERMISSIONS.DELETE_RETURNS, label: 'حذف مرتجع' },
    ],
  },
  {
    group: 'products',
    label: 'المنتجات',
    permissions: [
      { key: PERMISSIONS.MANAGE_PRODUCTS, label: 'إدارة المنتجات' },
      { key: PERMISSIONS.MANAGE_CATEGORIES, label: 'إدارة التصنيفات' },
    ],
  },
  {
    group: 'business',
    label: 'الأعمال',
    permissions: [
      { key: PERMISSIONS.MANAGE_SUPPLIERS, label: 'إدارة الموردين' },
      { key: PERMISSIONS.MANAGE_CUSTOMERS, label: 'إدارة العملاء' },
      { key: PERMISSIONS.MANAGE_PURCHASES, label: 'إدارة المشتريات' },
      { key: PERMISSIONS.MANAGE_EXPENSES, label: 'إدارة المصروفات' },
    ],
  },
  {
    group: 'administration',
    label: 'الإدارة',
    permissions: [
      { key: PERMISSIONS.MANAGE_USERS, label: 'إدارة المستخدمين' },
      { key: PERMISSIONS.MANAGE_ROLES, label: 'إدارة الأدوار' },
      { key: PERMISSIONS.MANAGE_PERMISSIONS, label: 'إدارة الصلاحيات' },
    ],
  },
  {
    group: 'reporting',
    label: 'التقارير',
    permissions: [
      { key: PERMISSIONS.VIEW_REPORTS, label: 'عرض التقارير' },
      { key: PERMISSIONS.EXPORT_REPORTS, label: 'تصدير التقارير' },
    ],
  },
  {
    group: 'field_security',
    label: 'أمن الحقول',
    permissions: [
      { key: PERMISSIONS.VIEW_PRODUCT_COST_FIELD, label: 'عرض تكلفة المنتج' },
      { key: PERMISSIONS.VIEW_PROFIT_MARGIN_FIELD, label: 'عرض هامش الربح' },
      { key: PERMISSIONS.VIEW_PROFIT_AMOUNT_FIELD, label: 'عرض مبلغ الربح' },
      { key: PERMISSIONS.VIEW_INVENTORY_VALUE_FIELD, label: 'عرض قيمة المخزون' },
      { key: PERMISSIONS.VIEW_DAILY_PROFIT_FIELD, label: 'عرض الربح اليومي' },
      { key: PERMISSIONS.VIEW_MONTHLY_PROFIT_FIELD, label: 'عرض الربح الشهري' },
      { key: PERMISSIONS.VIEW_SAFE_BALANCE_FIELD, label: 'عرض رصيد الخزنة' },
      { key: PERMISSIONS.VIEW_FINANCIAL_SUMMARY_FIELD, label: 'عرض الملخص المالي' },
      { key: PERMISSIONS.VIEW_CUSTOMER_BALANCE_FIELD, label: 'عرض رصيد العميل' },
      { key: PERMISSIONS.VIEW_SUPPLIER_BALANCE_FIELD, label: 'عرض رصيد المورد' },
      { key: PERMISSIONS.VIEW_PURCHASE_COSTS_FIELD, label: 'عرض تكاليف المشتريات' },
    ],
  },
  {
    group: 'audit',
    label: 'التدقيق',
    permissions: [
      { key: PERMISSIONS.VIEW_AUDIT_LOGS, label: 'عرض سجل النشاطات' },
    ],
  },
  {
    group: 'shifts',
    label: 'الورديات',
    permissions: [
      { key: PERMISSIONS.SHIFT_OPEN, label: 'فتح وردية' },
      { key: PERMISSIONS.SHIFT_CLOSE, label: 'إغلاق وردية' },
      { key: PERMISSIONS.SHIFT_APPROVE, label: 'اعتماد الورديات' },
    ],
  },
  {
    group: 'expense',
    label: 'المصروفات',
    permissions: [
      { key: PERMISSIONS.EXPENSE_VIEW, label: 'عرض المصروفات' },
      { key: PERMISSIONS.EXPENSE_CREATE, label: 'إضافة مصروف' },
      { key: PERMISSIONS.EXPENSE_EDIT, label: 'تعديل المصروفات' },
      { key: PERMISSIONS.EXPENSE_APPROVE, label: 'اعتماد المصروفات' },
      { key: PERMISSIONS.EXPENSE_DELETE, label: 'حذف المصروفات' },
      { key: PERMISSIONS.EXPENSE_CATEGORY_MANAGE, label: 'إدارة تصنيفات المصروفات' },
    ],
  },
  {
    group: 'finance',
    label: 'المالية',
    permissions: [
      { key: PERMISSIONS.CASH_REGISTER_MANAGE, label: 'إدارة الصندوق' },
      { key: PERMISSIONS.CURRENCY_EXCHANGE, label: 'تحويل العملات' },
    ],
  },
  {
    group: 'settings',
    label: 'الإعدادات',
    permissions: [
      { key: PERMISSIONS.TEMPLATE_MANAGE, label: 'إدارة قوالب الطباعة' },
      { key: PERMISSIONS.SALE_CANCEL_REVIEW, label: 'مراجعة إلغاء الفواتير' },
    ],
  },
  {
    group: 'dashboard',
    label: 'لوحة القيادة',
    permissions: [
      { key: PERMISSIONS.VIEW_EXECUTIVE_DASHBOARD, label: 'عرض لوحة القيادة التنفيذية' },
      { key: PERMISSIONS.VIEW_COMPANY_PROFIT, label: 'عرض أرباح الشركة' },
      { key: PERMISSIONS.VIEW_BRANCH_PROFIT, label: 'عرض أرباح الفرع' },
      { key: PERMISSIONS.VIEW_INVENTORY_VALUE, label: 'عرض قيمة المخزون' },
      { key: PERMISSIONS.VIEW_FINANCIAL_SUMMARY, label: 'عرض الملخص المالي' },
    ],
  },
];
