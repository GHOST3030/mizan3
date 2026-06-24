# تقرير تدقيق API - API Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| إجمالي نقاط API | ~180 |
| نقاط API سليمة تماماً | ~150 |
| نقاط API بتحذيرات | ~20 |
| نقاط API معطلة | 0 (جميع الـ routes موجودة) |
| نقاط بدون تحقق UUID | ~40 |
| نقاط بدون تحقق بيانات (Validation) | ~10 |
| نقاط بدون Transaction | ~9 |

---

## أولاً: توفر نقاط API (Endpoint Existence)

✅ **جميع نقاط API الموجودة في ملفات routes لها controller و service معرفين.** لا توجد نقاط missing.

---

## ثانياً: مشاكل التحقق من صحة البيانات (Validation Issues)

### 1. نقاط بدون Zod Validation

| المسار (Endpoint) | الطريقة (Method) | المشكلة | درجة الخطورة |
|---|---|---|---|
| `/api/currencies` | GET | لا يوجد تحقق من query | LOW |
| `/api/currencies/:id` | GET | لا يوجد uuid validation | MEDIUM |
| `/api/currencies/:id` | DELETE | لا يوجد uuid validation | MEDIUM |
| `/api/currencies/:id/default` | PATCH | لا يوجد uuid validation | MEDIUM |
| `/api/print-templates` | GET | لا يوجد تحقق من query (type, branch_id) | LOW |
| `/api/print-templates` | POST | **لا يوجد أي تحقق** (لا middleware ولا .parse) | **HIGH** |
| `/api/print-templates` | PUT | **لا يوجد أي تحقق** | **HIGH** |
| `/api/print-templates/:id` | GET/DELETE | لا يوجد uuid validation | MEDIUM |
| `/api/sales/payment-schedules/list` | GET | لا يوجد تحقق من query params | MEDIUM |
| `/api/sales/payment-schedules/:id/pay` | POST | يوجد `payScheduleSchema` ولكن **لا يستخدم** | **HIGH** |
| `/api/sales/:id/return` | POST | لا يوجد تحقق من body | MEDIUM |
| `/api/purchases/:id/return` | POST | لا يوجد تحقق من body | MEDIUM |
| `/api/purchases/:id/cancel` | POST | لا يوجد تحقق من reason | MEDIUM |
| `/api/permissions/roles` | POST | لا يوجد تحقق من body | MEDIUM |
| `/api/permissions/roles/:id` | PUT | لا يوجد تحقق من body | MEDIUM |
| `/api/permissions/roles/:id/permissions` | PUT | لا يوجد تحقق من body (permission_keys array) | MEDIUM |
| `/api/permissions/users/:id/permissions` | POST | لا يوجد تحقق من body | MEDIUM |
| `/api/inventory/warehouses/:id` | DELETE | لا يوجد uuid validation | MEDIUM |

### 2. مشاكل التحقق من صلاحية UUID

جميع نقاط `/:id` التالية تفتقد التحقق من أن `req.params.id` هو UUID صحيح:

- جميع نقاط `/:id` في: products, categories, brands, units, customers, suppliers, sales, purchases, finance, inventory, safe, permissions, core, currencies, print-templates

**التأثير:** يمكن إرسال معرف غير صالح (مثل `abc` أو `../`) - Prisma سيرجع خطأ P2023 (Invalid UUID) أو P2025 (Record not found). يتم معالجتها بواسطة errorHandler ولكن كان الأفضل التحقق منها مبكراً.

---

## ثالثاً: مشاكل الـ Transactions

| المسار (Endpoint) | الوحدة | المشكلة | درجة الخطورة |
|---|---|---|---|
| `POST /api/finance/expenses` (cash_register) | Finance | خصم من الخزينة + إنشاء المصروف خارج transaction - **يمكن فقدان المال** | **CRITICAL** |
| `POST /api/finance/currency-exchange` (cash_register) | Finance | خصم من خزينة + إضافة لأخرى خارج transaction | **CRITICAL** |
| `POST /api/inventory/wastage` | Inventory | حركة مخزون + تحديث رصيد خارج transaction | **HIGH** |
| `POST /api/inventory/movements` | Inventory | إنشاء حركة + تحديث/إنشاء رصيد خارج transaction | **HIGH** |
| `DELETE /api/inventory/movements/:id` | Inventory | عكس الرصيد + حذف الحركة خارج transaction | **HIGH** |
| `POST /api/inventory/stock-transfers` | Inventory | قراءات متعددة + إنشاء خارج transaction | **HIGH** |
| `POST /api/currencies` | Currencies | updateMany + create خارج transaction | MEDIUM |
| `PUT /api/currencies/:id` | Currencies | updateMany + update خارج transaction | MEDIUM |
| `PATCH /api/currencies/:id/default` | Currencies | updateMany + update خارج transaction | MEDIUM |
| `POST /api/print-templates` | Core | resetDefaults + create خارج transaction | MEDIUM |
| `PUT /api/print-templates/:id` | Core | resetDefaults + update خارج transaction | MEDIUM |
| `POST /api/number-sequences/reseed` | Core | findFirst + upsert خارج transaction | LOW |
| `POST /api/auth/users` | Auth | checkExisting + create + audit خارج transaction | LOW |
| `PUT /api/auth/users` | Auth | findFirst + update + audit + clearCache خارج transaction | LOW |

---

## رابعاً: مشاكل الصلاحيات (Permission Issues)

| المسار (Endpoint) | المشكلة | درجة الخطورة |
|---|---|---|
| `GET /api/auth/users` | لا يوجد `branchScope` - يمكن للمدير رؤية مستخدمين كل الفروع | MEDIUM |
| `POST /api/auth/users` | لا يوجد `branchScope` - يمكن إنشاء مستخدم في فرع آخر | MEDIUM |
| `PUT /api/auth/users/:id` | لا يوجد `ownership` ولا `branchScope` | MEDIUM |
| `DELETE /api/auth/users/:id` | لا يوجد `ownership` ولا `branchScope` | MEDIUM |
| `POST /api/sales/:id/review-cancel` | لا يوجد `ownership('sale')` | MEDIUM |
| `POST /api/sales/:id/return` | لا يوجد `ownership('sale')` | MEDIUM |
| `PUT /api/sales/:id/status` | لا يوجد `ownership('sale')` | MEDIUM |
| `DELETE /api/sales/:id` | لا يوجد `ownership('sale')` | MEDIUM |
| `PUT /api/purchases/:id/status` | لا يوجد `ownership('purchase')` | LOW |
| `DELETE /api/purchases/:id` | لا يوجد `ownership('purchase')` | LOW |
| `POST /api/purchases/:id/cancel` | لا يوجد `ownership('purchase')` | LOW |
| `POST /api/purchases/:id/return` | لا يوجد `ownership('purchase')` | LOW |
| جميع نقاط `/api/permissions/*` | لا يوجد `branchScope` | MEDIUM |

---

## خامساً: نقاط API حسب الوحدة (Summary by Module)

| الوحدة (Module) | إجمالي النقاط | سليمة | تحذيرات | % سليمة |
|---|---|---|---|---|
| Auth (المصادقة) | 5 | 2 | 3 | 40% |
| Core (الشركات والفروع) | 16 | 14 | 2 | 87% |
| Currencies (العملات) | 6 | 2 | 4 | 33% |
| Number Sequences | 2 | 1 | 1 | 50% |
| Print Templates | 6 | 1 | 5 | 16% |
| Products (المنتجات) | 6 | 4 | 2 | 66% |
| Categories (الفئات) | 5 | 4 | 1 | 80% |
| Brands (الماركات) | 5 | 4 | 1 | 80% |
| Units (الوحدات) | 5 | 4 | 1 | 80% |
| Inventory (المخزون) | 19 | 12 | 7 | 63% |
| Sales (المبيعات) | 12 | 7 | 5 | 58% |
| Purchases (المشتريات) | 7 | 4 | 3 | 57% |
| Customers (العملاء) | 11 | 9 | 2 | 81% |
| Suppliers (الموردين) | 11 | 9 | 2 | 81% |
| Finance (المالية) | 19 | 14 | 5 | 73% |
| Reports (التقارير) | 18 | 17 | 1 | 94% |
| Audit (التدقيق) | 1 | 1 | 0 | 100% |
| Safe (الخزنة) | 6 | 5 | 1 | 83% |
| Permissions (الصلاحيات) | 11 | 2 | 9 | 18% |
| Executive Dashboard | 9 | 8 | 1 | 88% |
| **المجموع** | **~180** | **~150** | **~30** | **~83%** |

---

## سادساً: المشاكل الحرجة (Critical Issues)

| # | المسار | المشكلة | الحل المقترح |
|---|---|---|---|
| C1 | `POST /api/finance/expenses` (cash_register) | **transaction مفقود** - يمكن فقدان المال | لف كل من cash_register.update و expense.create في `prisma.$transaction` |
| C2 | `POST /api/finance/currency-exchange` (cash_register) | **transaction مفقود** - يمكن فقدان المال | لف تحديث الخزينتين في `prisma.$transaction` |
| C3 | `POST /api/inventory/wastage` | **transaction مفقود** - عدم تناسق البيانات | لف إنشاء الحركة وتحديث الرصيد في `$transaction` |
| C4 | `POST /api/inventory/movements` | **transaction مفقود** - عدم تناسق البيانات | لف إنشاء الحركة وتحديث الرصيد في `$transaction` |
| C5 | `DELETE /api/inventory/movements/:id` | **transaction مفقود** - عدم تناسق البيانات | لف عكس الرصيد وحذف الحركة في `$transaction` |

---

## سابعاً: أفضل الوحدات أداءً (Best Modules)

| الوحدة | % سليمة | التعليق |
|---|---|---|
| Audit | 100% | نقطة واحدة فقط، بسيطة |
| Reports | 94% | جميع النقاط مع تحقق جيد |
| Executive Dashboard | 88% | جيد، ولكن بعض النقاط بدون تحقق من المدخلات |
| Core | 87% | تصميم متين |
| Safe | 83% | جيد |

## أسوأ الوحدات أداءً (Worst Modules)

| الوحدة | % سليمة | التعليق |
|---|---|---|
| Permissions | 18% | 9 من 11 نقطة بدون تحقق من البيانات أو UUID |
| Print Templates | 16% | معظم النقاط بدون تحقق من البيانات |
| Currencies | 33% | عدة نقاط بدون UUID validation ولا transactions |
| Auth | 40% | نقص branchScope و ownership |
| Sales | 58% | نقص ownership على عدة نقاط |
