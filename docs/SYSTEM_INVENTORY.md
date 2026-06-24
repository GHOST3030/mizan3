# جرد النظام الكامل - System Inventory
## Mizan POS
**التاريخ:** 2026-06-10

---

## 1. الواجهة الأمامية (Frontend)

### 1.1 الصفحات والمسارات (Pages & Routes)

| المسار (Route) | الصفحة (Page) | المكون (Component) | الأذونات المطلوبة |
|---|---|---|---|
| `/login` | LoginPage.jsx | LoginPage | عام (public) |
| `/dashboard` | DashboardPage.jsx | DashboardPage | مصادقة + حسب الدور |
| `/executive-dashboard` | ExecutiveDashboardPage.jsx | ExecutiveDashboard | `dashboard:view_executive_dashboard` |
| `/pos` | pos/POSPage.jsx | POSPage | `sales:create` |
| `/sales` | sales/SalesPage.jsx | SalesPage | `sales:create` |
| `/sales/return` | sales/ReturnSalePage.jsx | ReturnSalePage | `returns:create` |
| `/sales/pending-payments` | PendingPaymentsPage.jsx | PendingPaymentsPage | `sales:edit` |
| `/purchases` | purchases/PurchasesPage.jsx | PurchasesPage | `business:manage_purchases` |
| `/purchases/new` | purchases/PurchaseForm.jsx | PurchaseForm | `business:manage_purchases` (admin/manager) |
| `/products` | products/ProductsPage.jsx | ProductsPage | `products:manage` |
| `/products/new` | products/ProductForm.jsx | ProductForm | `products:manage` (admin/manager) |
| `/customers` | customers/CustomersPage.jsx | CustomersPage | `business:manage_customers` |
| `/customers/groups` | customers/CustomerGroupsPage.jsx | CustomerGroupsPage | `business:manage_customers` |
| `/customers/:id/statement` | customers/CustomerStatementPage.jsx | CustomerStatementPage | `business:manage_customers` |
| `/suppliers` | suppliers/SuppliersPage.jsx | SuppliersPage | `business:manage_suppliers` |
| `/suppliers/categories` | suppliers/SupplierCategoriesPage.jsx | SupplierCategoriesPage | `business:manage_suppliers` |
| `/suppliers/:id/statement` | suppliers/SupplierStatementPage.jsx | SupplierStatementPage | `business:manage_suppliers` |
| `/inventory` | InventoryPage.jsx | InventoryPage | `inventory:manage` |
| `/inventory/warehouses` | WarehousesPage.jsx | WarehousesPage | `inventory:manage` |
| `/inventory/stock-count` | StockCountPage.jsx | StockCountPage | `inventory:manage` |
| `/inventory/transfers` | StockTransfersPage.jsx | StockTransfersPage | `inventory:transfer` |
| `/inventory/transfers/:id` | StockTransferPage.jsx | StockTransferPage | `inventory:transfer` |
| `/inventory/wastage` | WastagePage.jsx | WastagePage | `inventory:manage` |
| `/inventory/low-stock` | LowStockPage.jsx | LowStockPage | `inventory:manage` |
| `/finance/expenses` | ExpensesPage.jsx | ExpensesPage | `expense:view` |
| `/finance/shifts` | ShiftsPage.jsx | ShiftsPage | `shift:open` |
| `/finance/cash-registers` | CashRegistersPage.jsx | CashRegistersPage | `cash_register:manage` |
| `/finance/safe` | SafeBoxPage.jsx | SafeBoxPage | `cash_register:manage` |
| `/finance/currencies` | CurrenciesPage.jsx | CurrenciesPage | `cash_register:manage` |
| `/finance/currency-exchange` | CurrencyExchangePage.jsx | CurrencyExchangePage | `currency:exchange` |
| `/reports` | ReportsPage.jsx | ReportsPage | `reporting:view_reports` |
| `/admin/users` | UsersPage.jsx | UsersPage | `admin:manage_users` |
| `/admin/roles` | admin/RolesPage.jsx | RolesPage | `admin:manage_roles` |
| `/admin/companies` | core/CompaniesPage.jsx | CompaniesPage | `admin:manage_permissions` |
| `/admin/settings` | SettingsPage.jsx | SettingsPage | `admin:manage_permissions` |
| `/admin/print-templates` | PrintTemplatesPage.jsx | PrintTemplatesPage | `reporting:view_reports` (خطأ - يجب `template:manage`) |

### 1.2 المكونات المشتركة (Shared Components)

| المكون (Component) | الملف (File) | الوظيفة (Function) |
|---|---|---|
| Layout | components/Layout.jsx | الهيكل الرئيسي مع القائمة الجانبية |
| Can | components/Can.jsx | التحكم في عرض العناصر حسب الصلاحية |
| CanViewField | components/CanViewField.jsx | التحكم في عرض الحقول الحساسة |
| Button | components/ui/Button.jsx | زر قابل لإعادة الاستخدام |
| Input | components/ui/Input.jsx | حقل إدخال |
| Select | components/ui/Select.jsx | قائمة منسدلة |
| Modal | components/ui/Modal.jsx | نافذة منبثقة |
| Table | components/ui/Table.jsx | جدول بيانات |
| Card | components/ui/Card.jsx | بطاقة عرض |
| Badge | components/ui/Badge.jsx | شارة حالة |
| Alert | components/ui/Alert.jsx | تنبيه |
| Spinner | components/ui/Spinner.jsx | مؤشر تحميل |
| Pagination | components/ui/Pagination.jsx | ترقيم الصفحات |
| PageHeader | components/ui/PageHeader.jsx | رأس الصفحة |
| ConfirmDialog | components/ui/ConfirmDialog.jsx | مربع تأكيد |
| OpeningBalanceModal | components/OpeningBalanceModal.jsx | تعديل الرصيد الافتتاحي |

### 1.3 الزراير (Buttons Inventory)

| الصفحة | الأزرار | عددها |
|---|---|---|
| POSPage | إضافة منتج, إنهاء البيع, تعليق, سلة, دفع, إلغاء, كميات سريعة | 15+ |
| ProductsPage | إضافة, تعديل, حذف, بحث, فلترة | 6 |
| PurchasesPage | إضافة, تعديل, حذف, إرجاع, إلغاء, بحث | 8 |
| SalesPage | عرض, حذف, إرجاع, إلغاء, بحث, فلترة | 8 |
| CustomersPage | إضافة, تعديل, حذف, كشف حساب, بحث | 7 |
| SuppliersPage | إضافة, تعديل, حذف, كشف حساب, بحث | 7 |
| ExpensesPage | إضافة, تعديل, حذف, موافقة, رفض, بحث | 8 |
| ShiftsPage | فتح وردية, إغلاق, اعتماد | 4 |
| ReportsPage | تصدير Excel, فلترة, بحث | 4 |
| UsersPage | إضافة, تعديل, حذف | 4 |
| InventoryPage | بحث, فلترة | 3 |
| StockCountPage | إضافة جرد, اعتماد | 3 |
| StockTransfersPage | إضافة, اعتماد, إلغاء | 4 |
| WastagePage | إضافة تلف | 2 |
| WarehousePage | إضافة, تعديل, حذف | 4 |
| CashRegistersPage | إضافة, تعديل, حذف | 4 |
| SafeBoxPage | إضافة, تعديل, حذف, حركة | 5 |
| CurrenciesPage | إضافة, تعديل, حذف, تعيين افتراضي | 5 |
| SettingsPage | إضافة, تعديل, حذف | 4 |
| PrintTemplatesPage | إضافة, تعديل, حذف | 4 |
| RolesPage | إضافة, تعديل, حذف, صلاحيات | 5 |
| CustomerGroupsPage | إضافة, تعديل, حذف | 4 |
| SupplierCategoriesPage | إضافة, تعديل, حذف | 4 |

### 1.4 النماذج (Forms Inventory)

| النموذج (Form) | الحقول (Fields) |
|---|---|
| LoginForm | username, password |
| ProductForm | name, name_ar, category_id, unit_id, brand_id, barcode, sku, cost_price, selling_price, min_stock |
| PurchaseForm | supplier_id, currency_id, exchange_rate, notes, items[] (product_id, quantity, unit_price) |
| CustomerForm | name, phone, email, tax_number, address, group_id, credit_limit, notes |
| SupplierForm | name, phone, email, tax_number, address, category_id, notes |
| ExpenseForm | category_id, amount, currency_id, description, expense_date, payment_source, source_id |
| ShiftForm | opening_balance (لفتح الوردية), closing_balance (للإغلاق) |
| UserForm | name, username, password, role, branch_id |
| CompanyForm | name, name_ar, tax_number, logo_url |
| BranchForm | name, name_ar, address, phone, is_active |
| SettingForm | key, value, branch_id |
| RoleForm | name, label, description |
| StockTransferForm | to_branch_id, from_warehouse_id, to_warehouse_id, items[] |

### 1.5 الحالة والمخازن (State & Stores)

| المتجر (Store) | الملف | الوظيفة |
|---|---|---|
| authStore | store/authStore.js | Zustand - يحفظ التوكن والمستخدم في localStorage |
| ThemeContext | context/ThemeContext.jsx | React Context - الوضع المظلم/الفاتح |
| useFieldPermission | hooks/useFieldPermission.js | التحقق من صلاحيات الحقول |

### 1.6 واجهة API (Frontend API Layer)

| الملف | الوظيفة |
|---|---|
| api/client.js | Axios instance - إضافة التوكن تلقائياً ومعالجة 401 |

---

## 2. الواجهة الخلفية (Backend)

### 2.1 نقاط API النهائية (All API Endpoints)

| الوحدة (Module) | المسار (Base Path) | عدد النقاط | المصادقة | التحقق من الصلاحية |
|---|---|---|---|---|
| Auth | `/api/auth` | 5 | نعم (عدا login) | نعم |
| Core | `/api/core` | 16 | نعم | نعم |
| Currencies | `/api/currencies` | 6 | نعم | نعم |
| Number Sequences | `/api/number-sequences` | 2 | نعم | نعم |
| Print Templates | `/api/print-templates` | 6 | نعم | نعم |
| Products | `/api/products` | 6 | نعم | نعم |
| Categories | `/api/categories` | 5 | نعم | نعم |
| Brands | `/api/brands` | 5 | نعم | نعم |
| Units | `/api/units` | 5 | نعم | نعم |
| Inventory | `/api/inventory` | 19 | نعم | نعم |
| Sales | `/api/sales` | 12 | نعم | نعم |
| Purchases | `/api/purchases` | 7 | نعم | نعم |
| Customers | `/api/customers` | 11 | نعم | نعم |
| Suppliers | `/api/suppliers` | 11 | نعم | نعم |
| Finance | `/api/finance` | 19 | نعم | نعم |
| Reports | `/api/reports` | 18 | نعم | نعم |
| Audit | `/api/audit` | 1 | نعم | نعم |
| Safe | `/api/safe` | 6 | نعم | نعم |
| Permissions | `/api/permissions` | 11 | نعم | نعم |
| Executive Dashboard | `/api/executive-dashboard` | 9 | نعم | نعم |
| **المجموع** | | **~180 نقطة** | | |

### 2.2 الوسائط (Middleware)

| الوسيط (Middleware) | الملف | الوظيفة |
|---|---|---|
| authenticate | middleware/authenticate.js | التحقق من JWT |
| authorize(...roles) | middleware/authenticate.js | التحقق من الدور |
| requirePermission(key) | middleware/authenticate.js | التحقق من الصلاحية المحددة |
| branchScope | middleware/branchScope.js | عزل بيانات الفرع |
| branchScopeTransfer | middleware/branchScope.js | عزل تحويلات المخزون |
| ownership(model) | middleware/ownership.js | التحقق من ملكية السجل |
| validate(schema) | middleware/validate.js | التحقق من صحة البيانات (Zod) |
| auditMeta | middleware/auditMeta.js | استخراج بيانات الطلب للتدقيق |
| errorLogger | middleware/errorLogger.js | تسجيل الأخطاء في قاعدة البيانات |
| errorHandler | middleware/errorHandler.js | معالجة الأخطاء المركزية |
| loginLimiter | middleware/rateLimit.js | تحديد معدل تسجيل الدخول (5/دقيقة) |
| authLimiter | middleware/rateLimit.js | تحديد معدل المصادقة (20/دقيقة) |
| apiLimiter | middleware/rateLimit.js | تحديد معدل API العام (100/دقيقة) |

### 2.3 الخدمات المشتركة (Shared Services)

| الخدمة (Service) | الملف | الوظيفة |
|---|---|---|
| permissionService | services/permission.service.js | إدارة صلاحيات المستخدمين (مع cache) |
| fieldSecurityService | services/fieldSecurity.service.js | أمن الحقول الحساسة (إخفاء البيانات) |
| auditService | modules/audit/audit.service.js | تسجيل سجل التدقيق |
| cacheService | lib/cache.js | التخزين المؤقت (NodeCache) |
| prisma | lib/prisma.js | اتصال قاعدة البيانات (Prisma Client) |

---

## 3. قاعدة البيانات (Database)

### 3.1 النماذج (Models) - 30 نموذجاً

| النموذج (Model) | الجدول (Table) | عدد الحقول | المفتاح الخارجي (FKs) |
|---|---|---|---|
| Company | companies | 7 | → Branch[] |
| Branch | branches | 9 | → Company | → 22 علاقة |
| Currency | currencies | 9 | → Sale[], Purchase[], Expense[], etc. |
| Setting | settings | 7 | → Branch? |
| NumberSequence | number_sequences | 8 | → Branch | @@unique([branch_id, type]) |
| User | users | 11 | → Branch, Role? | @unique(username) |
| Shift | shifts | 16 | → Branch, User |
| Category | categories | 7 | → Category? (self-relation) |
| Unit | units | 5 | → Product[] |
| Brand | brands | 4 | → Product[] |
| Product | products | 15 | → Branch, Category?, Unit, Brand? | @unique(barcode) |
| Warehouse | warehouses | 7 | → Branch |
| InventoryBalance | inventory_balances | 6 | → Branch, Warehouse?, Product | @@unique([branch_id, warehouse_id, product_id]) |
| StockMovement | stock_movements | 12 | → Branch, Warehouse?, Product |
| StockCount | stock_counts | 8 | → Branch, Warehouse?, User |
| StockCountItem | stock_count_items | 8 | → StockCount, Product |
| StockTransfer | stock_transfers | 14 | → Branch(from/to) |
| StockTransferItem | stock_transfer_items | 7 | → StockTransfer, Product |
| PaymentSchedule | payment_schedules | 9 | → Sale |
| CustomerGroup | customer_groups | 6 | → CustomerGroup? (self) |
| Customer | customers | 15 | → Branch, CustomerGroup? |
| Sale | sales | 24 | → Branch, Shift, Customer?, User, Currency | @unique(invoice_number) |
| SaleItem | sale_items | 8 | → Sale, Product |
| SalePayment | sale_payments | 8 | → Sale, Currency |
| SupplierCategory | supplier_categories | 5 | → Supplier[] |
| Supplier | suppliers | 14 | → Branch, SupplierCategory? |
| Purchase | purchases | 15 | → Branch, Supplier?, User, Currency |
| PurchaseItem | purchase_items | 7 | → Purchase, Product |
| SafeBox | safe_boxes | 9 | → Branch, Currency |
| SafeMovement | safe_movements | 10 | → SafeBox, Currency |
| CashRegister | cash_registers | 7 | → Branch, Currency |
| ExpenseCategory | expense_categories | 8 | → Branch? |
| Expense | expenses | 18 | → Branch, User, Currency, ExpenseCategory? |
| ActivityLog | activity_logs | 9 | → Branch?, User? |
| PrintTemplate | print_templates | 10 | → Branch? |
| Role | roles | 7 | → User[], RolePermission[] |
| Permission | permissions | 6 | → RolePermission[], UserPermission[] |
| RolePermission | role_permissions | 2 | → Role (CASCADE), Permission (CASCADE) |
| BranchAssignment | branch_assignments | 5 | → User, Branch | @@unique([user_id, branch_id]) |
| UserPermission | user_permissions | 5 | → User, Permission | @@unique([user_id, permission_id]) |

### 3.2 التعدادات (Enums)

| التعداد (Enum) | القيم (Values) |
|---|---|
| UserRole | super_admin, admin, manager, cashier, accountant, inventory_manager, auditor |
| StockMovementType | purchase, sale, return_sale, return_purchase, adjustment, transfer |
| SaleStatus | draft, completed, returned, cancelled |
| PaymentMethod | cash, card, transfer, credit |
| PurchaseStatus | draft, completed, returned, cancelled |

### 3.3 الترحيلات (Migrations)

| # | اسم الترحيل | التاريخ | المحتوى |
|---|---|---|---|
| 1 | init | 2026-06-05 | الهيكل الأساسي الكامل (20 جدول) |
| 2 | add_users_and_shifts | 2026-06-06 | إضافة inventory_manager, تحديث shifts |
| 3 | add_activity_logs | 2026-06-07 | جدول سجل النشاطات |
| 4 | add_cancelled_status | 2026-06-07 | إضافة cancelled للتعدادات |
| 5 | add_number_sequences | 2026-06-07 | جدول تسلسل الأرقام |
| 6 | add_held_at | 2026-06-07 | إضافة held_at للمبيعات |
| 7 | add_safe_boxes | 2026-06-08 | جداول الخزائن وحركاتها |
| 8 | add_shift_approval | 2026-06-08 | أعمدة اعتماد الورديات |
| 9 | add_stock_transfers | 2026-06-08 | جداول تحويل المخزون |
| 10 | add_opening_balances | 2026-06-08 | الأرصدة الافتتاحية للعملاء والموردين |
| 11 | add_payment_schedules | 2026-06-08 | جداول جداول الدفع |
| 12 | add_expense_categories | 2026-06-08 | فئات المصروفات + تحسينات المصروفات |

### 3.4 بيانات البذور (Seed Data)

| الكيان | العدد | التفاصيل |
|---|---|---|
| شركة | 1 | متجر ميزان |
| فرع | 1 | الفرع الرئيسي |
| مستخدمين | 4 | admin, manager, cashier, accountant |
| عملات | 3 | YER, USD, SAR |
| مستودع | 1 | المستودع الرئيسي |
| خزينة | 1 | الخزينة الرئيسية (500,000) |
| مجموعات عملاء | 3 | عادي, VIP, جملة |
| عملاء | 5 | |
| فئات موردين | 3 | |
| موردين | 4 | |
| وحدات قياس | 8 | |
| ماركات | 14 | |
| فئات منتجات | 9 | |
| منتجات | 54 | |
| أرصدة مخزون | 54 | |
| حركات مخزون | 54 | |
| أدوار | 7 | super_admin, admin, manager, accountant, inventory_manager, cashier, auditor |
| صلاحيات | ~60 | جميع الصلاحيات المطلوبة |
| روابط دور-صلاحية | ~150 | |
