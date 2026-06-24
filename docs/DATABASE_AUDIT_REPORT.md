# تقرير تدقيق قاعدة البيانات - Database Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| إجمالي النماذج (Models) | 30 |
| إجمالي التعدادات (Enums) | 5 |
| إجمالي الترحيلات (Migrations) | 12 |
| مشاكل حرجة (HIGH) | 6 |
| مشاكل متوسطة (MEDIUM) | 7 |
| مشاكل بسيطة (LOW) | 5 |

---

## أولاً: سلامة النموذج (Schema Integrity)

### 1.1 جميع العلاقات (Relations)
✅ جميع النماذج الـ 30 لها علاقات معرفة بشكل صحيح. لا توجد مراجع يتيمة (orphaned references).

### 1.2 تسمية الحقول (Naming Convention)
- ✅ `created_at`, `updated_at`, `deleted_at` موجودة في جميع النماذج القابلة للحذف الناعم
- ✅ `name`, `name_ar` للنصوص ثنائية اللغة
- ✅ `@@map("snake_case")` لأسماء الجداول

### 1.3 أنواع البيانات (Data Types)
- ⚠️ `Currency.exchange_rate` من نوع `Int` - لا يدعم الكسور العشرية (مشكلة للعملات ذات الأسعار الكسرية)
- ✅ جميع القيم المالية من نوع `Int` (مخزنة بأصغر وحدة نقدية)

---

## ثانياً: تناسق الترحيلات (Migration Consistency) - 🔴 HIGH

### 🚨 المشكلة 1: 6 جداول مفقودة من الترحيلات (HIGH)

الجداول التالية موجودة في `schema.prisma` ولكنها **غير موجودة في أي من الترحيلات الـ 12**:

| الجدول | معرف في schema | في أي ترحيل؟ |
|---|---|---|
| `roles` | الأسطر 847-860 | **❌ لا** |
| `permissions` | الأسطر 862-875 | **❌ لا** |
| `role_permissions` | الأسطر 877-886 | **❌ لا** |
| `branch_assignments` | الأسطر 888-902 | **❌ لا** |
| `user_permissions` | الأسطر 904-917 | **❌ لا** |
| `print_templates` | الأسطر 824-843 | **❌ لا** |

### 🚨 المشكلة 2: 7+ أعمدة مفقودة من الترحيلات (HIGH)

| الجدول | الأعمدة المفقودة |
|---|---|
| `stock_movements` | `warehouse_id` |
| `stock_counts` | `warehouse_id` |
| `customers` | `customer_group_id`, `email`, `tax_number`, `address`, `credit_limit` |
| `suppliers` | `supplier_category_id`, `email`, `tax_number`, `address` |

### 🚨 المشكلة 3: قيم تعداد مفقودة (HIGH)

| التعداد | القيم المفقودة |
|---|---|
| `UserRole` | **`super_admin`** و **`auditor`** (فقط admin, manager, cashier, accountant, inventory_manager موجودة في DB) |

**التأثير:** أي كود يشير إلى `super_admin` أو `auditor` أو يستخدم RBAC سيفشل في وقت التشغيل.

### ⚠️ المشكلة 4: تناقض نوع TIMESTAMP (MEDIUM)

الترحيلات 1-6 تستخدم `TIMESTAMP(3)` (بدون منطقة زمنية)، بينما الترحيلات 7-12 تستخدم `TIMESTAMPTZ` (مع منطقة زمنية).

---

## ثالثاً: المفاتيح الخارجية (Foreign Keys)

### 🚨 المشكلة 5: مفاتيح خارجية مفقودة (HIGH)

الحقول التالية تشير إلى `User.id` ولكنها **تفتقد قيود المفتاح الخارجي**:

| النموذج | الحقل (الحقول) |
|---|---|
| `Shift` | `approved_by` |
| `StockTransfer` | `created_by`, `approved_by`, `completed_by` |
| `Expense` | `approved_by` |
| `Sale` | `cancelled_by`, `cancellation_reviewed_by` |
| `SafeMovement` | `created_by` |

**التأثير:** يمكن حذف مستخدم وتبقى هذه المراجع يتيمة (orphaned).

---

## رابعاً: الفهارس (Indexes)

### ✅ فهارس جيدة موجودة

| نمط الاستعلام (Query Pattern) | مفهرس؟ |
|---|---|
| المبيعات حسب الفرع + التاريخ | ✅ `[branch_id, status, created_at, deleted_at]` |
| المبيعات حسب العميل | ✅ `[customer_id, status]` |
| حركات المخزون حسب المنتج | ✅ `[branch_id, product_id, deleted_at]`, `[product_id, branch_id, created_at]` |
| سجلات التدقيق حسب الكيان | ✅ `[branch_id, entity, entity_id, created_at]` |
| المنتجات حسب الباركود | ✅ (unique index) |

### ⚠️ فهارس مفقودة

| الجدول | الفهرس المفقود |
|---|---|
| `products` | `name`, `name_ar` (بحث بالاسم) |
| `products` | `sku` (بحث برقم المخزن) |
| `suppliers` | `name` (بحث بالاسم) |
| `currencies` | `code` (فقط indexed, ليس unique) |
| `expenses` | `expense_date` (بحث بالتاريخ) |

### ⚠️ فهارس مكررة
- `sales`: `[branch_id, created_at]` مكرر لأنه prefix من `[branch_id, status, created_at, deleted_at]`

---

## خامساً: قيود UNIQUE (Unique Constraints)

### ✅ موجودة

| الجدول | القيد |
|---|---|
| `users` | `username` |
| `products` | `barcode` |
| `sales` | `invoice_number` |
| `number_sequences` | `[branch_id, type]` |
| `inventory_balances` | `[branch_id, warehouse_id, product_id]` |
| `roles` | `name` |
| `permissions` | `key` |
| `role_permissions` | `[role_id, permission_id]` (PK) |
| `branch_assignments` | `[user_id, branch_id]` |
| `user_permissions` | `[user_id, permission_id]` |

### ⚠️ مفقودة

| الجدول | الحقل | السبب |
|---|---|---|
| `currencies` | `code` | "USD" و "YER" يجب أن يكونا فريدين |
| `brands` | `name` | أسماء ماركات مكررة ممكنة |
| `units` | `name` | أسماء وحدات مكررة ممكنة |
| `warehouses` | `[branch_id, name]` | مستودعين بنفس الاسم في نفس الفرع |

---

## سادساً: الحذف الناعم (Soft Delete)

### ✅ نماذج مع `deleted_at` (21 نموذج)

جميع النماذج التجارية الرئيسية: Company, Branch, Currency, Setting, User, Shift, Category, Unit, Brand, Product, StockMovement, StockCount, StockCountItem, StockTransfer, StockTransferItem, PaymentSchedule, CustomerGroup, Customer, Sale, SaleItem, SalePayment, SupplierCategory, Supplier, Purchase, PurchaseItem, SafeBox, SafeMovement, CashRegister, ExpenseCategory, Expense, PrintTemplate

### ⚠️ نماذج بدون `deleted_at` (9 نماذج)

NumberSequence, InventoryBalance, ActivityLog, Role, Permission, RolePermission, BranchAssignment, UserPermission

- ✅ InventoryBalance (رصيد حالي - مناسب)
- ✅ ActivityLog (سجل غير قابل للتغيير - مناسب)
- ✅ NumberSequence (عداد - مناسب)
- ⚠️ Role, Permission (حذف صلب - يمكن كسر المراجع)

---

## سابعاً: مشاكل الـ Transactions

### 🚨 المشكلة 6: createExpense (مصدر cash_register) بدون Transaction

```javascript
// خصم من الخزينة
await prisma.cashRegister.update({
  where: { id: data.source_id },
  data: { balance: { increment: -data.amount } },
});
// ثم إنشاء المصروف - خارج الـ transaction!
const result = await prisma.expense.create({ ... });
```

**إذا فشل إنشاء المصروف بعد الخصم من الخزينة → المال يضيع!**

### 🚨 المشكلة 7: currencyExchange (مصدر cash_register) بدون Transaction

```javascript
// خصم من الخزينة المصدر
await prisma.cashRegister.update(...);
// ثم إضافة إلى الخزينة الهدف - خارج الـ transaction!
await prisma.cashRegister.update(...);
```

**إذا فشلت الإضافة إلى الخزينة الهدف → المال يختفي!**

### ⚠️ المشكلة 8: createWastage بدون Transaction

```javascript
const movement = await prisma.stockMovement.create({ ... });
const existing = await prisma.inventoryBalance.findFirst({ ... });
await prisma.inventoryBalance.update({ ... });
```
**حركة يتيمة لو فشلت الخطوات اللاحقة.**

---

## ثامناً: تقييم عام

| المجال | التقييم |
|---|---|
| تصميم النموذج | **جيد جداً** - 30 نموذج بعلاقات متكاملة |
| تناسق التسمية | **جيد** - نمط ثابت لـ created_at/updated_at/deleted_at |
| الترحيلات | **مشكلة كبيرة** - 6 جداول + 7 أعمدة + قيم تعداد مفقودة |
| الفهارس | **جيد** - ولكن ينقصها فهارس للبحث بالنص |
| قيود UNIQUE | **جيد** - ولكن ينقصها بعض القيود الأساسية |
| Transactions | **مشكلة** - 3 نقاط حرجة بدون transaction |
| المفاتيح الخارجية | **جيد** - ولكن 7 حقول مرجعية بدون FK |
| الحذف الناعم | **ممتاز** - 21 نموذج مع deleted_at |

---

## تاسعاً: التوصيات العاجلة

| # | التوصية | درجة الخطورة |
|---|---|---|
| 1 | إنشاء ترحيل جديد لإضافة جداول RBAC والـ print_templates | **HIGH** |
| 2 | إضافة قيم `super_admin` و `auditor` إلى UserRole enum | **HIGH** |
| 3 | إضافة الأعمدة المفقودة (warehouse_id, customer_group_id, إلخ) | **HIGH** |
| 4 | إصلاح `createExpense` و `currencyExchange` لاستخدام transactions | **HIGH** |
| 5 | إضافة مفاتيح خارجية لحقول user reference (approved_by, created_by, إلخ) | **HIGH** |
| 6 | إضافة فهارس على product.name, product.sku, supplier.name | **MEDIUM** |
| 7 | جعل `currencies.code` unique | **MEDIUM** |
| 8 | تغيير `Currency.exchange_rate` إلى Float أو Decimal | **MEDIUM** |
