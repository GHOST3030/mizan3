# تقرير تدقيق المسارات - Route Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| إجمالي المسارات الأمامية (Frontend Routes) | 33 |
| مسارات سليمة (Working) | 30 |
| مسارات معطلة (Broken) | 1 |
| مسارات بها مشاكل (Issues Found) | 6 |
| إجمالي نقاط API الخلفية (Backend Endpoints) | ~180 |
| نقاط API سليمة | ~170 |
| نقاط API بها مشاكل | ~10 |

---

## أولاً: المسارات الأمامية (Frontend Routes Audit)

### 1. مسارات سليمة (✅ Working)

| المسار | الصفحة | حالة التحميل | حالة الخطأ | حالة فارغة | الملاحظات |
|---|---|---|---|---|---|
| `/login` | LoginPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/pos` | POSPage | ✅ | ✅ | N/A | يعمل بكفاءة |
| `/sales` | SalesPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/sales/return` | ReturnSalePage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/sales/pending-payments` | PendingPaymentsPage | ✅ | ❌ | ✅ | لا توجد حالة خطأ للـ mutation |
| `/purchases` | PurchasesPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/products` | ProductsPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/customers` | CustomersPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/customers/groups` | CustomerGroupsPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/suppliers` | SuppliersPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/suppliers/categories` | SupplierCategoriesPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/finance/expenses` | ExpensesPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/finance/shifts` | ShiftsPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/finance/cash-registers` | CashRegistersPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/finance/safe` | SafeBoxPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/finance/currencies` | CurrenciesPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/finance/currency-exchange` | CurrencyExchangePage | ❌ | ✅ | N/A | **لا توجد حالة تحميل** |
| `/inventory` | InventoryPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/inventory/warehouses` | WarehousesPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/inventory/stock-count` | StockCountPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/inventory/transfers` | StockTransfersPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/inventory/wastage` | WastagePage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/inventory/low-stock` | LowStockPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/reports` | ReportsPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/admin/users` | UsersPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/admin/roles` | RolesPage | ✅ | ✅ | ✅ | يعمل بكفاءة |
| `/admin/settings` | SettingsPage | ✅ | ❌ | ✅ | لا توجد معالجة لأخطاء الحذف |
| `/executive-dashboard` | ExecutiveDashboardPage | ✅ | ✅ | ✅ | يعمل بكفاءة |

### 2. مسارات معطلة (❌ Broken Pages)

| المسار | الصفحة | المشكلة | درجة الخطورة |
|---|---|---|---|
| `/purchases/new` | PurchaseForm.jsx | **وضع التعديل معطل**: المكون لا يقبل prop `purchase` ولكن PurchasesPage ترسل `purchase={editPurchase}`. يتم تجاهل prop بصمت. | **عالي HIGH** |

### 3. مسارات بها مشاكل (⚠️ Issues Found)

| المسار | المشكلة | درجة الخطورة |
|---|---|---|
| `/admin/companies` | صلاحية خاطئة: يستخدم `PERMISSIONS.MANAGE_PERMISSIONS` ولكن المسار متاح للمديرين (managers) | **متوسط MEDIUM** |
| `/admin/print-templates` | صلاحية خاطئة: يستخدم `PERMISSIONS.VIEW_REPORTS` بدلاً من `PERMISSIONS.TEMPLATE_MANAGE` | **عالي HIGH** |
| `/sales` (Return) | لا يوجد تحقق من صلاحية `returns:create` في واجهة المستخدم، فقط في الـ API | **متوسط MEDIUM** |
| جميع صفحات الحذف | 18 صفحة تستخدم `alert()/confirm()` بدلاً من ConfirmDialog | **منخفض LOW** |
| `/customers/:id/statement` | لا توجد حالة تحمين أثناء جلب البيانات | **متوسط MEDIUM** |
| `/suppliers/:id/statement` | لا توجد حالة تحميل أثناء جلب البيانات | **متوسط MEDIUM** |

---

## ثانياً: نقاط API الخلفية (Backend Endpoints Audit)

### 1. نقاط API سليمة تماماً (✅ Fully Working)

| المسار | الطريقة (Method) | الوحدة | التحقق من الصلاحية | التحقق من البيانات (Validation) | معالجة الأخطاء |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | Auth | ✅ عام | ✅ Zod | ✅ |
| `/api/auth/users` | GET | Auth | ✅ authorize('admin','manager') | ❌ مفقود | ✅ |
| `/api/auth/users` | POST | Auth | ✅ authorize('admin') + requirePermission | ✅ Zod | ✅ |
| `/api/auth/users/:id` | PUT | Auth | ✅ authorize('admin','manager') + requirePermission | ✅ Zod | ✅ |
| `/api/auth/users/:id` | DELETE | Auth | ✅ authorize('admin') + requirePermission | ❌ مفقود | ✅ |
| `/api/products` | GET/POST | Products | ✅ requirePermission | ✅ Zod (POST) / ✅ (GET) | ✅ |
| `/api/products/:id` | GET/PUT/DELETE | Products | ✅ requirePermission + authorize | ✅ Zod (PUT) / ❌ (GET,DELETE) | ✅ |
| `/api/sales` | GET/POST | Sales | ✅ requirePermission + authorize | ✅ Zod | ✅ |
| `/api/sales/:id` | GET | Sales | ✅ ownership('sale') | ❌ مفقود | ✅ |
| `/api/sales/:id/cancel` | POST | Sales | ✅ ownership('sale') + authorize + requirePermission | ✅ Zod | ✅ |
| `/api/purchases` | GET/POST | Purchases | ✅ requirePermission + authorize | ✅ Zod | ✅ |
| `/api/purchases/:id` | GET | Purchases | ✅ ownership('purchase') | ❌ مفقود | ✅ |
| `/api/finance/shifts/open` | POST | Finance | ✅ authorize + requirePermission | ✅ Zod | ✅ |
| `/api/finance/expenses` | GET | Finance | ✅ requirePermission | ✅ Zod | ✅ |
| `/api/reports/dashboard` | GET | Reports | ✅ requirePermission | ✅ Zod | ✅ |
| `/api/executive-dashboard` | GET | Executive | ✅ requirePermission | ❌ مفقود | ✅ |
| `/api/permissions/roles` | GET/POST | Permissions | ✅ authorize('admin','super_admin') | ❌ مفقود (POST) | ✅ |

### 2. نقاط API بها مشاكل تحقق من الصلاحية (⚠️ Permission Issues)

| المسار | المشكلة | درجة الخطورة |
|---|---|---|
| `/api/finance/expenses/:id/approve` | لا يوجد تحقق من `ownership('expense')` ولكن يوجد تحقق authorize | **منخفض LOW** |
| `/api/sales/:id/review-cancel` | لا يوجد `ownership('sale')` middleware | **متوسط MEDIUM** |
| `/api/sales/:id/return` | لا يوجد `ownership('sale')` middleware | **متوسط MEDIUM** |
| `/api/purchases/:id/cancel` | لا يوجد `ownership('purchase')` | **متوسط MEDIUM** |
| `/api/purchases/:id/return` | لا يوجد `ownership('purchase')` | **متوسط MEDIUM** |
| `/api/auth/users` (GET) | لا يوجد `branchScope` middleware، يمكن للمدير رؤية مستخدمين من كل الفروع | **متوسط MEDIUM** |

### 3. نقاط API بدون تحقق من UUID (⚠️ Missing UUID Validation)

| المسار (عينة) | العدد التقريبي |
|---|---|
| جميع نقاط `/:id` بدون `uuidParam.parse(req.params)` في الـ controller | ~40 نقطة |
| أمثلة: GET/PUT/DELETE `/api/currencies/:id`, GET `/api/categories/:id`, GET `/api/brands/:id`, GET `/api/units/:id`, DELETE `/api/auth/users/:id`, GET/PUT/DELETE `/api/permissions/roles/:id`, GET `/api/products/:id`, DELETE `/api/products/:id`, GET `/api/inventory/warehouses/:id`, DELETE `/api/inventory/movements/:id` | |

### 4. نقاط API بدون تحقق من البيانات (❌ Missing Validation)

| المسار | المشكلة | درجة الخطورة |
|---|---|---|
| `/api/sales/payment-schedules/:id/pay` | يوجد `payScheduleSchema` ولكن لا يستخدم | **عالي HIGH** |
| `/api/sales/:id/return` | لا يوجد تحقق من `req.body` | **متوسط MEDIUM** |
| `/api/purchases/:id/return` | لا يوجد تحقق من `req.body` | **متوسط MEDIUM** |
| `/api/purchases/:id/cancel` | لا يوجد تحقق من `req.body.reason` | **متوسط MEDIUM** |
| `/api/permissions/roles` (POST) | لا يوجد Zod validation | **متوسط MEDIUM** |
| `/api/permissions/roles/:id/permissions` (PUT) | لا يوجد تحقق من `req.body` | **متوسط MEDIUM** |
| `/api/print-templates` (POST/PUT) | لا يوجد Zod validation | **متوسط MEDIUM** |

### 5. نقاط API بدون معاملة (❌ Missing Transactions)

| المسار | المشكلة | درجة الخطورة |
|---|---|---|
| `/api/finance/expenses` (POST) مع cash_register | خصم من الخزينة بدون transaction - يمكن فقدان المال | **عالي HIGH** |
| `/api/finance/currency-exchange` مع cash_register | تحديث خزينتين بدون transaction | **عالي HIGH** |
| `/api/inventory/wastage` (POST) | إنشاء حركة + تحديث رصيد بدون transaction | **عالي HIGH** |
| `/api/inventory/movements` (POST) | إنشاء حركة + تحديث رصيد بدون transaction | **عالي HIGH** |
| `/api/inventory/movements/:id` (DELETE) | عكس الرصيد + حذف الحركة بدون transaction | **عالي HIGH** |
| `/api/inventory/stock-transfers` (POST) | قراءات متعددة + إنشاء بدون transaction | **متوسط MEDIUM** |
| `/api/currencies` (POST/PUT/PATCH) | تحديث متعدد بدون transaction | **منخفض LOW** |
| `/api/print-templates` (POST/PUT) | resetDefaults + create/update بدون transaction | **منخفض LOW** |
| `/api/number-sequences/reseed` (POST) | findFirst + upsert بدون transaction | **منخفض LOW** |

---

## ثالثاً: التنقل (Navigation Audit)

| عنصر التنقل | المسار المستهدف | يعمل؟ |
|---|---|---|
| القائمة الجانبية - نقاط البيع | `/pos` | ✅ |
| القائمة الجانبية - المبيعات | `/sales` | ✅ |
| القائمة الجانبية - المشتريات | `/purchases` | ✅ |
| القائمة الجانبية - المنتجات | `/products` | ✅ |
| القائمة الجانبية - العملاء | `/customers` | ✅ |
| القائمة الجانبية - الموردين | `/suppliers` | ✅ |
| القائمة الجانبية - المخزون | `/inventory` | ✅ |
| القائمة الجانبية - المالية | `/finance/expenses` | ✅ |
| القائمة الجانبية - التقارير | `/reports` | ✅ |
| القائمة الجانبية - لوحة القيادة | `/executive-dashboard` | ✅ |
| القائمة الجانبية - الإدارة | `/admin/users` | ✅ |
| زر العودة من النماذج | varies | ✅ |
| انتقال تعديل المنتج | `/products/new?edit=id` | ✅ |
| انتقال تعديل المشتريات | `/purchases/new?edit=id` | **❌ معطل (C1)** |

---

## الخلاصة

| النتيجة | العدد |
|---|---|
| إجمالي المسارات الأمامية | 33 |
| مسارات سليمة تماماً | 25 |
| مسارات معطلة | 2 (PurchaseForm edit, PrintTemplates permission) |
| مسارات تحتاج تحسين | 6 |
| إجمالي نقاط API | ~180 |
| نقاط API سليمة تماماً | ~160 |
| نقاط API بتحذيرات | ~20 |
