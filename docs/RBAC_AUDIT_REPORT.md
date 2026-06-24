# تقرير تدقيق الصلاحيات - RBAC Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| الأدوار (Roles) | 7 (super_admin, admin, manager, cashier, accountant, inventory_manager, auditor) |
| مفاتيح الصلاحيات (Permission Keys) | ~60 في قاعدة البيانات + 38 معرفة في الواجهة |
| أدوار RBAC في قاعدة البيانات | 7 (كلها system roles) |
| صلاحيات لكل دور | متفاوتة (super_admin: الكل, cashier: محدودة) |

---

## أولاً: هيكل الصلاحيات (Permission Architecture)

### 1. آلية التحقق (Verification Mechanism)

النظام يستخدم 3 مستويات للتحقق:

1. **`authenticate`** - التحقق من JWT (إلزامي لجميع النقاط عدا `/login` و `/health`)
2. **`authorize('admin','manager')`** - التحقق من الدور (role check)
3. **`requirePermission('permission:key')`** - التحقق من الصلاحية المحددة (fine-grained)

### 2. مستويات الصلاحية في الواجهة الأمامية (Frontend Permission Levels)

| المكون (Component) | الوظيفة |
|---|---|
| `<Can permission={...}>` | إخفاء/إظهار العناصر بناءً على الصلاحية |
| `<CanViewField module={...} field={...}>` | إخفاء الحقول الحساسة |
| `role === 'admin'` | التحقق المباشر من الدور (في بعض الصفحات) |
| `hasPermission(user, key)` | التحقق من الصلاحية المحددة |

---

## ثانياً: فجوات الصلاحيات (Permission Gaps)

### 1. مفاتيح صلاحيات غير معرفة في ملف PERMISSIONS (HIGH)

ملف `middleware/permissions.js` يعرف ~30 مفتاح صلاحية، ولكن الـ routes تستخدم مفاتيح إضافية غير معرفة هناك:

| المفتاح المستخدم | مكان الاستخدام | معرف في ملف constants؟ |
|---|---|---|
| `admin:manage_users` | auth.routes.js | ❌ |
| `admin:manage_roles` | permissions.routes.js | ❌ |
| `admin:manage_permissions` | permissions.routes.js | ❌ |
| `sales:create` | sales.routes.js | ❌ |
| `sales:edit` | sales.routes.js | ❌ |
| `sales:delete` | sales.routes.js | ❌ |
| `sales:cancel` | sales.routes.js | ❌ |
| `sales:hold` | sales.routes.js | ❌ |
| `sales:resume` | sales.routes.js | ❌ |
| `returns:create` | sales.routes.js, purchases.routes.js | ❌ |
| `products:manage` | products.routes.js | ❌ |
| `products:manage_categories` | categories.routes.js | ❌ |
| `inventory:manage` | inventory.routes.js | ❌ |
| `inventory:adjustment` | inventory.routes.js | ❌ |
| `inventory:count` | inventory.routes.js | ❌ |
| `inventory:transfer` | inventory.routes.js | ❌ |
| `business:manage_purchases` | purchases.routes.js | ❌ |
| `business:manage_customers` | customers.routes.js | ❌ |
| `business:manage_suppliers` | suppliers.routes.js | ❌ |
| `business:manage_expenses` | finance.routes.js, core.routes.js | ❌ |
| `cash_register:manage` | finance.routes.js, currencies.routes.js | ❌ |
| `reporting:view_reports` | reports.routes.js | ❌ |
| `reporting:export_reports` | reports.routes.js | ❌ |
| `audit:view_logs` | audit.routes.js | ❌ |
| `shift:open` | finance.routes.js | ❌ |
| `shift:close` | finance.routes.js | ❌ |
| `shift:approve` | finance.routes.js | ❌ |

**التأثير:** هذه المفاتيح غير معرفة في `PERMISSIONS` constants، مما يعني أنه لا يوجد مصدر واحد للحقيقة، والمطورين لا يمكنهم تدقيق الصلاحيات بسهولة.

### 2. صلاحية `super_admin` يمكن تعيينها عبر API (HIGH)

ملف `auth.validation.js` السطر 13: الـ `createUserSchema` يتضمن `super_admin` في الـ enum. بينما `POST /api/auth/users` محمي بـ `authorize('admin')`، إذا تم اختراق حساب admin يمكنه إنشاء حسابات super_admin إضافية.

### 3. كلمة مرور ضعيفة (HIGH)

الحد الأدنى لكلمة المرور هو 6 أحرف فقط بدون متطلبات تعقيد (أحرف كبيرة/صغيرة/أرقام/رموز).

### 4. ثلاثة أماكن مختلفة لصلاحية super_admin bypass (MEDIUM)

`super_admin` bypass مكرر في 3 ملفات مختلفة:
- `authenticate.js` (الأسطر 21, 29)
- `branchScope.js` (السطر 6)
- `ownership.js` (السطر 7)

إذا احتاج bypass إلى تغيير، يجب تعديل 3 أماكن.

---

## ثالثاً: توزيع الصلاحيات لكل دور (Role Permission Distribution)

### 1. Super Admin
- **الصلاحية:** جميع الصلاحيات
- **bypass:** يتجاوز جميع الفحوصات (`authorize` و `requirePermission` و `branchScope` و `ownership`)
- **التحكم:** يمكنه إدارة جميع الأدوار والصلاحيات والمستخدمين

### 2. Admin
- **الصلاحية:** معظم الصلاحيات (عدا `admin:manage_permissions` و `admin:manage_roles` الأساسية)
- **bypass:** يتجاوز `branchScope` و `ownership`
- **التحكم:** يمكنه إدارة المستخدمين والشركات والفروع

### 3. Manager
- **الصلاحية:** صلاحيات تشغيلية شاملة (منتجات، مبيعات، مشتريات، عملاء، موردين، مخزون، مصروفات)
- **bypass:** يتجاوز `ownership` فقط
- **التحكم:** مقيد بفرعه عبر `branchScope`

### 4. Accountant
- **الصلاحية:** صلاحيات مالية (مصروفات - إنشاء وتعديل)، تقارير، تصدير
- **التحكم:** مقيد بفرعه، مع ownership على المصروفات

### 5. Inventory Manager
- **الصلاحية:** صلاحيات المخزون (جرد، تحويل، تلف، حركات)
- **التحكم:** مقيد بفرعه

### 6. Cashier
- **الصلاحية:** صلاحيات البيع (إنشاء مبيعات، إلغاء، تعليق)، فتح/إغلاق الوردية
- **التحكم:** مقيد بفرعه، مع ownership على مبيعاته فقط

### 7. Auditor
- **الصلاحية:** صلاحيات مشاهدة فقط (تقارير، سجلات التدقيق، لوحة القيادة)
- **التحكم:** لا يمكنه إنشاء/تعديل/حذف أي شيء

---

## رابعاً: مشاكل الواجهة الأمامية (Frontend Permission Issues)

### 1. PrintTemplatesPage - صلاحية خاطئة (HIGH)
يستخدم `PERMISSIONS.VIEW_REPORTS` ('reporting:view_reports') بدلاً من `PERMISSIONS.TEMPLATE_MANAGE` ('template:manage')

### 2. CompaniesPage - صلاحية غير متسقة (MEDIUM)
يستخدم `PERMISSIONS.MANAGE_PERMISSIONS` ('admin:manage_permissions') لـ CRUD، ولكن الـ route متاح للمديرين (managers) عبر API

### 3. تكرار التحقق من الدور والصلاحية (MEDIUM)
بعض الصفحات تتحقق من `user.role === 'admin'` و `<Can permission={...}>` في نفس الوقت - تحقق مزدوج غير متسق

---

## خامساً: أدوار RBAC في قاعدة البيانات (Database Roles)

### 1. الأدوار المعرفـة

| الدور (Role) | نظامي؟ | مستخدمون مرتبطون |
|---|---|---|
| super_admin | ✅ نعم | admin (linked in seed) |
| admin | ✅ نعم | 0 (seed يربط admin بـ admin role) |
| manager | ✅ نعم | manager (seed) |
| accountant | ✅ نعم | accountant (seed) |
| inventory_manager | ✅ نعم | 0 |
| cashier | ✅ نعم | cashier (seed) |
| auditor | ✅ نعم | 0 |

### 2. عدد الصلاحيات المسندة لكل دور (من seed)

| الدور | عدد الصلاحيات التقريبي |
|---|---|
| super_admin | جميع الصلاحيات (~60) |
| admin | ~50 |
| manager | ~35 |
| accountant | ~15 |
| inventory_manager | ~20 |
| cashier | ~10 |
| auditor | ~8 |

### 3. مشكلة: جداول RBAC غير مرحلة إلى قاعدة البيانات!

**المشكلة الأكبر في النظام:** جداول `roles` و `permissions` و `role_permissions` و `user_permissions` و `branch_assignments` **غير موجودة في أي من الترحيلات الـ 12** (انظر تقرير قاعدة البيانات للتفاصيل).

**ملاحظة:** هذا قد يكون بسبب استخدام Prisma بطريقة مختلفة (ربما `prisma db push` بدلاً من `prisma migrate`). يجب التحقق من حالة قاعدة البيانات الفعلية.

---

## سادساً: ملخص التوصيات

| # | التوصية | درجة الخطورة |
|---|---|---|
| 1 | إنشاء ملف `PERMISSIONS` constants موحد يحتوي على جميع المفاتيح المستخدمة | **HIGH** |
| 2 | منع تعيين دور `super_admin` عبر API للمستخدمين غير super_admin | **HIGH** |
| 3 | رفع الحد الأدنى لكلمة المرور إلى 8 أحرف مع متطلبات التعقيد | **HIGH** |
| 4 | تصحيح صلاحية PrintTemplatesPage | **HIGH** |
| 5 | ترحيل جداول RBAC إلى قاعدة البيانات إذا لم تكن موجودة | **HIGH** |
| 6 | توحيد منطق bypass في middleware واحد بدلاً من 3 ملفات | **MEDIUM** |
| 7 | إضافة `branchScope` إلى نقاط auth و permissions | **MEDIUM** |
| 8 | إزالة التحقق المزدوج (role + permission) في الواجهة | **LOW** |
