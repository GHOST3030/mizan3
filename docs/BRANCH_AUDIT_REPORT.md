# تقرير تدقيق عزل الفروع - Branch Isolation Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| وحدات API مع branchScope | 17 من 20 |
| وحدات بدون branchScope | 3 (auth, permissions, audit) |
| ثغرات عزل الفروع المكتشفة | 3 |

---

## أولاً: آلية عزل الفروع (Branch Isolation Mechanism)

### 1. Middleware: `branchScope.js`

الوسيط `branchScope` يعمل كالتالي:
- للمستخدمين non-admin/non-manager:
  - **GET requests:** يضيف `req.query.branch_id = req.user.branchId` إجبارياً
  - **POST/PUT/PATCH/DELETE:** يتحقق من `req.body.branch_id` إذا كان موجوداً، ويتحقق من تطابقه مع فرع المستخدم
- للمستخدمين admin/manager: **تجاوز كامل** لعزل الفروع

### 2. Middleware: `branchScopeTransfer.js`

مخصص لتحويلات المخزون (`from_branch_id` / `to_branch_id`):
- يتحقق من أن `from_branch_id` و `to_branch_id` تطابق فرع المستخدم إذا كانا موجودين
- **لا يضيف** `branch_id` تلقائياً للمستخدمين non-admin (على عكس `branchScope`)

---

## ثانياً: الوحدات المطبقة عليها branchScope

| الوحدة (Module) | Middleware مطبق؟ | نوعه |
|---|---|---|
| Core (companies, branches, settings) | ✅ | branchScope (عبر `router.use`) |
| Currencies | ✅ | branchScope |
| Number Sequences | ✅ | branchScope |
| Print Templates | ✅ | branchScope |
| Products | ✅ | branchScope |
| Categories | ✅ | branchScope |
| Brands | ✅ | branchScope |
| Units | ✅ | branchScope |
| Inventory | ✅ | branchScope + branchScopeTransfer |
| Sales | ✅ | branchScope |
| Purchases | ✅ | branchScope |
| Customers | ✅ | branchScope |
| Suppliers | ✅ | branchScope |
| Finance | ✅ | branchScope |
| Reports | ✅ | branchScope |
| Safe | ✅ | branchScope |
| Audit | ✅ | branchScope |
| Executive Dashboard | ✅ | branchScope |

---

## ثالثاً: الوحدات بدون branchScope

| الوحدة (Module) | المشكلة | درجة الخطورة |
|---|---|---|
| **Auth** (`/api/auth/users`) | لا يوجد branchScope - يمكن للمدير رؤية وإنشاء وتعديل وحذف مستخدمين من أي فرع | **HIGH** |
| **Permissions** (`/api/permissions/*`) | لا يوجد branchScope - أدوار وصلاحيات عامة للنظام بأكمله | **MEDIUM** |
| **Audit** (`/api/audit`) | branchScope مطبق عبر `router.use` ولكن المديرين (managers) يتجاوزونه - يمكن للمدير رؤية سجلات تدقيق كل الفروع | **MEDIUM** |

---

## رابعاً: الثغرات المكتشفة (Branch Isolation Gaps)

### 🚨 الثغرة 1: branchScopeTransfer لا يضيف branch_id تلقائياً (HIGH)

في `branchScope.js` الأسطر 35-54، `branchScopeTransfer`:
- على GET: **لا يضيف** `from_branch_id` أو `to_branch_id` إذا لم يقدمها المستخدم
- على POST/PUT/DELETE: يتحقق فقط إذا تم توفير الحقل

**ماذا يعني هذا؟**
إذا قام موظف (cashier) بزيارة `GET /api/inventory/stock-transfers` بدون query params، فلن يتم إضافة أي filter للفرع، وقد يرى جميع تحويلات المخزون في كل الفروع.

**الحل:** إضافة auto-injection مشابه لـ `branchScope`:
```javascript
if (!['admin', 'super_admin', 'manager'].includes(req.user.role)) {
  if (!req.query.from_branch_id && !req.query.to_branch_id) {
    req.query.from_branch_id = req.user.branchId;
  }
}
```

### 🚨 الثغرة 2: Admin bypass كامل لعزل الفروع (MEDIUM)

المستخدمون من دور `admin` يتجاوزون جميع قيود الفروع. إذا تم اختراق حساب admin، فإن جميع فروع الشركة تكون مكشوفة.

**التأثير:** هذا مقصود (by design) ولكنه يمثل نقطة فشل واحدة.

### 🚨 الثغرة 3: Manager يمكنه رؤية سجلات تدقيق كل الفروع (MEDIUM)

`audit.routes.js` يطبق `branchScope` عالمياً، ولكن `audit.controller.js` يمرر `req.query` مباشرة إلى `auditService.getLogs()`. المديرون (managers) يتجاوزون `branchScope` (السطر 6 من branchScope.js)، لذا يمكنهم رؤية سجلات النشاط من جميع الفروع.

---

## خامساً: التحقق من عزل البيانات (Data Isolation Verification)

| نوع البيانات | معزول بالفرع؟ | ملاحظات |
|---|---|---|
| المنتجات (Products) | ✅ | `branch_id` مطلوب |
| المبيعات (Sales) | ✅ | `branch_id` مطلوب |
| المشتريات (Purchases) | ✅ | `branch_id` مطلوب |
| العملاء (Customers) | ✅ | `branch_id` مطلوب |
| الموردين (Suppliers) | ✅ | `branch_id` مطلوب |
| المصروفات (Expenses) | ✅ | `branch_id` مطلوب |
| الورديات (Shifts) | ✅ | `branch_id` مطلوب |
| المخزون (Inventory) | ✅ | `branch_id` مطلوب |
| الخزائن (Safe) | ✅ | `branch_id` مطلوب |
| الخزينة (Cash Register) | ✅ | `branch_id` مطلوب |
| الإعدادات (Settings) | ✅ | `branch_id` اختياري (عامة أو خاصة بفرع) |
| المستخدمون (Users) | ✅ | `branch_id` مطلوب (ولكن API بدون branchScope) |
| العملات (Currencies) | ❌ | عالمية (ليست خاصة بفرع) - مقصود |
| الأدوار (Roles) | ❌ | عالمية - مقصود |
| الصلاحيات (Permissions) | ❌ | عالمية - مقصود |
| الشركة (Company) | ❌ | عالمية - مقصود |
| قوالب الطباعة (Print Templates) | ✅ | `branch_id` اختياري |

---

## سادساً: توصيات

| # | التوصية | درجة الخطورة | الجهد المقدر |
|---|---|---|---|
| 1 | إصلاح `branchScopeTransfer` ليضيف branch_id تلقائياً | **HIGH** | 15 دقيقة |
| 2 | إضافة `branchScope` إلى نقاط auth | **HIGH** | 30 دقيقة |
| 3 | تقييد وصول المديرين لسجلات التدقيق من فروعهم فقط | **MEDIUM** | 30 دقيقة |
| 4 | إضافة `branchScope` إلى نقاط permissions | **LOW** | 15 دقيقة |
