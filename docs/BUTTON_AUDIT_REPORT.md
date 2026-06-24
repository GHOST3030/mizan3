# تقرير تدقيق الأزرار - Button Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| إجمالي الأزرار التي تم تدقيقها | ~150 زراً |
| أزرار سليمة تماماً | ~120 |
| أزرار بها مشاكل | ~25 |
| أزرار معطلة | 2 |

---

## أنواع الأزرار وتدقيقها

### 1. أزرار الإضافة (Create Buttons)

| الزر (Button) | الصفحة (Page) | API موجود؟ | معالج النقر (Click Handler) | حالة النجاح | حالة الخطأ | الصلاحية |
|---|---|---|---|---|---|---|
| إضافة منتج | ProductsPage | ✅ POST /api/products | ✅ | ✅ | ✅ | ✅ `products:manage` |
| إضافة مشتريات | PurchasesPage | ✅ POST /api/purchases | ✅ | ✅ | ✅ | ✅ `business:manage_purchases` |
| إضافة عميل | CustomersPage | ✅ POST /api/customers | ✅ | ✅ | ✅ | ✅ `business:manage_customers` |
| إضافة مورد | SuppliersPage | ✅ POST /api/suppliers | ✅ | ✅ | ✅ | ✅ `business:manage_suppliers` |
| إضافة مصروف | ExpensesPage | ✅ POST /api/finance/expenses | ✅ | ✅ | ✅ | ✅ `expense:create` |
| إضافة مستخدم | UsersPage | ✅ POST /api/auth/users | ✅ | ✅ | ❌ | ✅ `admin:manage_users` |
| إضافة خزنة | SafeBoxPage | ✅ POST /api/safe | ✅ | ✅ | ❌ | ✅ `business:manage_expenses` |
| إضافة خزينة | CashRegistersPage | ✅ POST /api/finance/cash-registers | ✅ | ✅ | ❌ | ✅ `cash_register:manage` |
| إضافة عملة | CurrenciesPage | ✅ POST /api/currencies | ✅ | ✅ | ❌ | ✅ `currency:exchange` |
| إضافة مستودع | WarehousesPage | ✅ POST /api/inventory/warehouses | ✅ | ✅ | ❌ | ✅ `inventory:manage` |
| إضافة جرد | StockCountPage | ✅ POST /api/inventory/stock-counts | ✅ | ✅ | ❌ | ✅ `inventory:count` |
| إضافة وردية | ShiftsPage | ✅ POST /api/finance/shifts/open | ✅ | ✅ | ❌ | ✅ `shift:open` |
| إضافة شركة | CompaniesPage | ✅ POST /api/core/companies | ✅ | ✅ | ✅ | ✅ `business:manage_expenses` |
| إضافة فرع | CompaniesPage | ✅ POST /api/core/branches | ✅ | ✅ | ✅ | ✅ `business:manage_expenses` |
| إضافة إعدادات | SettingsPage | ✅ POST /api/core/settings | ✅ | ✅ | ❌ | ✅ `admin:manage_users` |
| إضافة دور | RolesPage | ✅ POST /api/permissions/roles | ✅ | ✅ | ✅ | ✅ `admin:manage_roles` |
| إضافة قالب طباعة | PrintTemplatesPage | ✅ POST /api/print-templates | ✅ | ✅ | ✅ | ❌ `VIEW_REPORTS` (خاطئة) |
| إضافة تحويل مخزون | StockTransfersPage | ✅ POST /api/inventory/stock-transfers | ✅ | ✅ | ❌ | ✅ `inventory:transfer` |
| إضافة تلف | WastagePage | ✅ POST /api/inventory/wastage | ✅ | ✅ | ✅ | ✅ `inventory:wastage` |
| إضافة مجموعة عملاء | CustomerGroupsPage | ✅ POST /api/customers/groups | ✅ | ✅ | ❌ | ✅ `business:manage_customers` |
| إضافة فئة موردين | SupplierCategoriesPage | ✅ POST /api/suppliers/categories | ✅ | ✅ | ❌ | ✅ `business:manage_suppliers` |
| **تم البيع** | POSPage | ✅ POST /api/sales | ✅ | ✅ | ✅ | ✅ `sales:create` |

### 2. أزرار التعديل (Edit Buttons)

| الزر (Button) | الصفحة | API موجود؟ | معالج النقر | النموذج يملأ بالبيانات؟ | الصلاحية |
|---|---|---|---|---|---|
| تعديل منتج | ProductsPage | ✅ PUT /api/products/:id | ✅ | ✅ | ✅ |
| تعديل مشتريات | PurchasesPage | ✅ | ✅ | **❌ PurchaseForm لا يقبل prop** | ✅ |
| تعديل عميل | CustomersPage | ✅ PUT /api/customers/:id | ✅ | ✅ | ✅ |
| تعديل مورد | SuppliersPage | ✅ PUT /api/suppliers/:id | ✅ | ✅ | ✅ |
| تعديل مصروف | ExpensesPage | ✅ PUT /api/finance/expenses/:id | ✅ | ✅ | ✅ |
| تعديل مستخدم | UsersPage | ✅ PUT /api/auth/users/:id | ✅ | ✅ | ✅ |
| تعديل شركة | CompaniesPage | ✅ PUT /api/core/companies/:id | ✅ | ✅ | ✅ |
| تعديل فرع | CompaniesPage | ✅ PUT /api/core/branches/:id | ✅ | ✅ | ✅ |
| تعديل دور | RolesPage | ✅ PUT /api/permissions/roles/:id | ✅ | ✅ | ✅ |
| تعديل خزنة | SafeBoxPage | ✅ PUT /api/safe/:id | ✅ | ✅ | ✅ |
| تعديل خزينة | CashRegistersPage | ✅ PUT /api/finance/cash-registers/:id | ✅ | ✅ | ✅ |
| تعديل عملة | CurrenciesPage | ✅ PUT /api/currencies/:id | ✅ | ✅ | ✅ |
| تعديل مستودع | WarehousesPage | ✅ PUT /api/inventory/warehouses/:id | ✅ | ✅ | ✅ |
| تعديل إعدادات | SettingsPage | ✅ PUT /api/core/settings/:id | ✅ | ✅ | ✅ |
| تعديل قالب طباعة | PrintTemplatesPage | ✅ PUT /api/print-templates/:id | ✅ | ✅ | ❌ صلاحية خاطئة |

### 3. أزرار الحذف (Delete Buttons)

| الزر (Button) | API | تأكيد الحذف | معالج الخطأ (onError) | الصلاحية |
|---|---|---|---|---|
| حذف منتج | DELETE /api/products/:id | ✅ confirm() | ❌ صامت | ✅ `products:manage` (admin) |
| حذف مشتريات | DELETE /api/purchases/:id | ✅ confirm() | ❌ صامت | ✅ `business:manage_purchases` (admin) |
| حذف عميل | DELETE /api/customers/:id | ✅ confirm() | ❌ صامت | ✅ `business:manage_customers` (admin) |
| حذف مورد | DELETE /api/suppliers/:id | ✅ confirm() | ❌ صامت | ✅ `business:manage_suppliers` (admin) |
| حذف مصروف | DELETE /api/finance/expenses/:id | ✅ confirm() | ❌ صامت | ✅ `expense:delete` (admin) |
| حذف مستخدم | DELETE /api/auth/users/:id | ✅ confirm() | ❌ صامت | ✅ `admin:manage_users` (admin) |
| حذف خزنة | DELETE /api/safe/:id | ✅ confirm() | ❌ صامت | ✅ `business:manage_expenses` (admin) |
| حذف خزينة | DELETE /api/finance/cash-registers/:id | ✅ confirm() | ❌ صامت | ✅ `cash_register:manage` (admin) |
| حذف عملة | DELETE /api/currencies/:id | ✅ confirm() | ❌ صامت | ✅ `currency:exchange` (admin) |
| حذف مستودع | DELETE /api/inventory/warehouses/:id | ✅ confirm() | ❌ صامت | ✅ `inventory:manage` (admin) |
| حذف مجموعة عملاء | DELETE /api/customers/groups/:id | ✅ confirm() | ❌ صامت | ✅ `business:manage_customers` (admin) |
| حذف فئة موردين | DELETE /api/suppliers/categories/:id | ✅ confirm() | ❌ صامت | ✅ `business:manage_suppliers` (admin) |
| حذف إعدادات | DELETE /api/core/settings/:id | ✅ confirm() | ❌ صامت | ✅ `admin:manage_users` (admin) |
| حذف دور | DELETE /api/permissions/roles/:id | ✅ confirm() | ❌ صامت | ✅ `admin:manage_permissions` (super_admin) |

**مشكلة:** جميع أزرار الحذف تستخدم `confirm()` (نافذة المتصفح) بدلاً من `ConfirmDialog`. جميعها تفتقد معالجة خطأ `onError`.

### 4. أزرار الموافقة والرفض (Approve/Reject Buttons)

| الزر (Button) | الصفحة | API | حالة النجاح | حالة الخطأ |
|---|---|---|---|---|
| الموافقة على مصروف | ExpensesPage | PUT /api/finance/expenses/:id/approve | ✅ | ✅ |
| رفض مصروف | ExpensesPage | PUT /api/finance/expenses/:id/reject | ✅ | ✅ |
| اعتماد وردية | ShiftsPage | POST /api/finance/shifts/:id/approve | ✅ | ❌ |
| اعتماد جرد | StockCountPage | POST /api/inventory/stock-counts/:id/approve | ✅ | ❌ |
| اعتماد تحويل | StockTransfersPage | POST /api/inventory/stock-transfers/:id/approve | ✅ | ❌ |
| إلغاء تحويل | StockTransfersPage | POST /api/inventory/stock-transfers/:id/cancel | ✅ | ❌ |
| مراجعة إلغاء بيع | SalesPage | POST /api/sales/:id/review-cancel | ✅ | ❌ |

### 5. أزرار الحفظ (Save Buttons)

| الزر (Button) | الصفحة | التحميل (Loading) | التعطيل (Disabled) | معالج الخطأ |
|---|---|---|---|---|
| حفظ منتج | ProductForm | ✅ `isPending` | ✅ | ✅ |
| حفظ مشتريات | PurchaseForm | ✅ `isPending` | ✅ | ✅ |
| حفظ عميل | Customer (modal) | ✅ | ✅ | ✅ |
| حفظ مورد | Supplier (modal) | ✅ | ✅ | ✅ |
| حفظ مصروف | Expense (modal) | ✅ | ✅ | ✅ |
| حفظ مستخدم | User (modal) | ✅ | ✅ | ✅ |
| حفظ إعدادات | Settings (modal) | ❌ | ❌ | ❌ |
| حفظ عملة | Currency (modal) | ❌ | ❌ | ❌ |
| حفظ وردية | Shift (modal) | ✅ | ✅ | ✅ |

### 6. أزرار الطباعة والتصدير (Print/Export Buttons)

| الزر (Button) | الصفحة | API | يعمل؟ |
|---|---|---|---|
| تصدير Excel - المنتجات | ProductsPage | ✅ | ✅ |
| تصدير Excel - التقارير | ReportsPage | ✅ GET /api/reports/export | ✅ |
| طباعة الفاتورة | POSPage | ✅ window.print() | ✅ |
| تصدير المخزون | InventoryPage | ✅ | ✅ |

### 7. أزرار البحث والفلترة (Search/Filter Buttons)

| الزر (Button) | الصفحة | Debounce | API | الصلاحية |
|---|---|---|---|---|
| بحث منتجات | ProductsPage | ❌ | GET /api/products | ✅ |
| بحث مشتريات | PurchasesPage | ❌ | GET /api/purchases | ✅ |
| بحث مبيعات | SalesPage | ❌ | GET /api/sales | ✅ |
| بحث عملاء | CustomersPage | ❌ | GET /api/customers | ✅ |
| بحث موردين | SuppliersPage | ❌ | GET /api/suppliers | ✅ |
| بحث مصروفات | ExpensesPage | ❌ | GET /api/finance/expenses | ✅ |
| بحث مخزون | InventoryPage | ❌ | GET /api/inventory/balance | ✅ |
| بحث مستخدمين | UsersPage | ❌ | GET /api/auth/users | ✅ |
| بحث فواتير مرتجعة | ReturnSalePage | ❌ | GET /api/sales | ✅ |
| بحث ورديات | ShiftsPage | ❌ | GET /api/finance/shifts | ✅ |
| بحث خزائن | SafeBoxPage | ❌ | GET /api/safe | ✅ |
| نقطة البيع | POSPage | ✅ useDebounce | GET /api/products | ✅ |

---

## ملخص المشاكل

| # | المشكلة | عدد الأزرار المتأثرة | درجة الخطورة |
|---|---|---|---|
| 1 | **PurchaseForm edit mode معطل** | 1 (تعديل مشتريات) | **عالي** |
| 2 | **PrintTemplatesPage صلاحية خاطئة** | 3 (إضافة/تعديل/حذف) | **عالي** |
| 3 | **لا يوجد onError لـ mutation** | ~18 زر حذف | **متوسط** |
| 4 | **استخدام confirm() بدلاً من ConfirmDialog** | ~39 مكان | **منخفض** |
| 5 | **لا يوجد debounce على البحث** | ~12 حقل بحث | **متوسط** |
| 6 | **لا يوجد disabled/loading على بعض الأزرار** | 4 أزرار حفظ | **منخفض** |
