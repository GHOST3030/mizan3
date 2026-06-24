# تقرير التدقيق الأمني - Security Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| ثغرات حرجة (CRITICAL) | 2 |
| ثغرات عالية (HIGH) | 5 |
| ثغرات متوسطة (MEDIUM) | 8 |
| ثغرات منخفضة (LOW) | 5 |

---

## 🔴 أولاً: الثغرات الحرجة (CRITICAL)

### 🚨 C1: تسريب بيانات الاعتماد في المستودع (CRITICAL)
**الملف:** `backend/.env` (مرسل إلى git)
**التفاصيل:**
- JWT Secret: `aea7f51816854045e2f206c5ecb15c9abbe521411263421101a6b1104a350586`
- قاعدة بيانات Supabase: كلمة المرور `MizanPos2026!`
- رابط قاعدة البيانات مباشر مع بيانات الدخول

**التأثير:** أي شخص لديه حق الوصول إلى المستودع يمكنه:
1. تزوير توكن JWT لأي مستخدم
2. الاتصال بقاعدة بيانات PostgreSQL مباشرة

**الحل:**
1. إزالة `.env` من git باستخدام `git rm --cached backend/.env`
2. تدوير (rotate) JWT_SECRET فوراً
3. تغيير كلمة مرور قاعدة البيانات

### 🚨 C2: تجاوز التحقق من الملكية عند خطأ قاعدة البيانات (CRITICAL)
**الملف:** `middleware/ownership.js` السطور 20-22
```javascript
catch (err) { return next(); }
```
**التفاصيل:** إذا فشل استعلام قاعدة البيانات داخل ownership middleware (لأي سبب - نموذج غير موجود، اتصال مقطوع، معرف غير صالح)، فإن `catch` يمرر الطلب إلى `next()` **بدون أي تحقق من الملكية**. هذا يعني أن أي مستخدم (حتى cashier) يمكنه الوصول إلى أي sale/shift/expense إذا تسبب في خطأ في قاعدة البيانات.

**الحل:** تغيير `catch` إلى `return next(new AppError('فشل التحقق من الوصول', 403))` أو `return next(err)`

---

## 🟠 ثانياً: الثغرات العالية (HIGH)

### 🚨 H1: كلمة مرور ضعيفة (HIGH)
**الملف:** `auth.validation.js` السطر 12
```javascript
z.string().min(6, ...)
```
**التفاصيل:** الحد الأدنى 6 أحرف بدون أي متطلبات تعقيد (حروف كبيرة/صغيرة/أرقام/رموز).

**الحل:** رفع الحد الأدنى إلى 8 أحرف مع:
```javascript
z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
```

### 🚨 H2: أكثر من 25 مفتاح صلاحية غير معرف في constants (HIGH)
**الملف:** `middleware/permissions.js`
**التفاصيل:** مفاتيح مثل `sales:create`, `products:manage`, `business:manage_purchases` وغيرها تستخدم في routes ولكنها غير معرفة في `PERMISSIONS` constants.

**الحل:** إنشاء ملف constants واحد يضم جميع المفاتيح المستخدمة.

### 🚨 H3: branchScopeTransfer لا يعزل بيانات GET (HIGH)
**الملف:** `middleware/branchScope.js`
**التفاصيل:** `branchScopeTransfer` لا يضيف filter تلقائي للفرع على GET requests.

### 🚨 H4: CORS origin = '*' (HIGH)
**الملف:** `app.js` السطر 36
```javascript
origin: process.env.CORS_ORIGIN || '*'
```
**التفاصيل:** إذا لم يتم تعيين `CORS_ORIGIN` في متغيرات البيئة (وهو ليس في `.env`)، فإن أي نطاق يمكنه عمل طلبات cross-origin.

### 🚨 H5: يمكن تعيين دور super_admin عبر API (HIGH)
**الملف:** `auth.validation.js` السطر 13
**التفاصيل:** `createUserSchema` يتضمن `super_admin` في الـ enum. إذا تم اختراق حساب admin، يمكنه إنشاء super_admin إضافيين.

---

## 🟡 ثالثاً: الثغرات المتوسطة (MEDIUM)

### ⚠️ M1: لا يوجد refresh token أو token revocation
**التفاصيل:** JWT صالح لمدة 8 ساعات بدون إمكانية إلغائه. لا يوجد blacklist.

### ⚠️ M2: تسجيل تدقيق غير كامل
**التفاصيل:** عمليات CRUD على المبيعات والمشتريات والمخزون والمصروفات والعملاء والموردين **غير مسجلة** في سجل التدقيق.

### ⚠️ M3: Ownership غير مطبق على عدة نقاط في Sales و Purchases
- `POST /api/sales/:id/review-cancel` - لا يوجد ownership('sale')
- `POST /api/sales/:id/return` - لا يوجد ownership('sale')
- `PUT /api/sales/:id/status` - لا يوجد ownership('sale')
- `DELETE /api/sales/:id` - لا يوجد ownership('sale')
- `POST /api/purchases/:id/cancel` - لا يوجد ownership('purchase')
- `POST /api/purchases/:id/return` - لا يوجد ownership('purchase')

### ⚠️ M4: Auth و Permissions بدون branchScope
- `GET /api/auth/users` - يمكن للمدير رؤية مستخدمين من كل الفروع
- جميع نقاط `/api/permissions/*` - بدون branchScope

### ⚠️ M5: حدود معدل API غير مطبقة على العمليات الحساسة
**التفاصيل:** لا يوجد rate limiting خاص على إنشاء المستخدمين أو تعديل الصلاحيات.

### ⚠️ M6: ذاكرة التخزين المؤقت للصلاحيات لا تتزامن بين العمليات
**التفاصيل:** `permission.service.js` يستخدم in-memory Map cache. في بيئة متعددة العمليات، كل عملية تحتفظ بالكاش الخاص بها.

### ⚠️ M7: خطأ Prisma P2002 يكشف أسماء الحقول
**التفاصيل:** عند حدوث خطأ unique constraint، يتم إرجاع اسم الحقل (مثل `users_username_key`) في رسالة الخطأ.

### ⚠️ M8: التحقق من البيانات (Zod validation) موزع بين الـ controllers
**التفاصيل:** معظم التحقق يتم داخل الـ controllers باستخدام `schema.parse(req.body)` بدلاً من `validate` middleware في الـ routes. هذا يجعل auditing أصعب.

---

## 🟢 رابعاً: الثغرات المنخفضة (LOW)

### ℹ️ L1: التحقق من صحة البيانات يتم فقط على `req.body`
`validate.js` لا يتحقق من `req.query` ولا `req.params`

### ℹ️ L2: إخفاء الحقول بـ '******' يكشف وجودها
`sanitizeObject` يستبدل القيم بـ `'******'` بدلاً من حذف الحقل، مما يكشف للمستخدم أن الحقل موجود

### ℹ️ L3: لا يوجد HTTPS enforcement
التطبيق لا يفرض HTTPS أو HSTS headers

### ℹ️ L4: حدود معدل login و api متداخلة
`/api/auth/login` تخضع لـ loginLimiter (5/دقيقة) + apiLimiter (100/دقيقة) - تداخل بسيط

### ℹ️ L5: دالة `canViewField` بها كود ميت
`fieldSecurity.service.js` الأسطر 75-86: تكرر التحقق من الصلاحية مرتين

---

## خامساً: ملخص الأمان حسب المجال

| المجال | التقييم | أقوى نقطة | أضعف نقطة |
|---|---|---|---|
| **JWT** | 🔴 جيد | Payload محدود (userId, role, branchId) | Secret في git، لا refresh token |
| **كلمات المرور** | 🔴 ضعيف | Bcrypt مع 10 rounds | 6 أحرف فقط بدون تعقيد |
| **RBAC** | 🟡 متوسط | 3 مستويات تحقق + field security | مفاتيح صلاحية غير موحدة |
| **عزل الفروع** | 🟡 متوسط | branchScope مطبق في معظم الوحدات | branchScopeTransfer غير مكتمل |
| **التحقق من الملكية** | 🔴 خطأ | مطبق على sale, shift, expense | Catch block يمرر بدون تحقق |
| **تسجيل التدقيق** | 🟡 متوسط | تسجيل الدخول والأخطاء 500 | CRUD غير مسجل |
| **CORS** | 🔴 مفتوح | يستخدم helmet | Origin = '*' افتراضياً |
| **التحقق من المدخلات** | 🟡 متوسط | Zod في معظم النقاط | بعض النقاط بدون تحقق |
| **Rate Limiting** | 🟢 جيد | 3 مستويات | لا يوجد للعمليات الحساسة |
| **Error Handling** | 🟡 متوسط | رسائل أخطاء آمنة للـ 500 | P2002 يكشف أسماء الحقول |

---

## سادساً: التوصيات الأمنية (مرتبة حسب الأولوية)

| # | التوصية | درجة الخطورة | الجهد |
|---|---|---|---|
| 1 | إزالة `.env` من git + تدوير جميع الأسرار | **CRITICAL** | فوري |
| 2 | إصلاح catch في ownership.js | **CRITICAL** | 5 دقائق |
| 3 | رفع متطلبات كلمة المرور إلى 8+ مع تعقيد | **HIGH** | 15 دقيقة |
| 4 | تعيين CORS_ORIGIN في البيئة الإنتاجية | **HIGH** | 5 دقائق |
| 5 | إصلاح branchScopeTransfer ليعزل GET | **HIGH** | 15 دقيقة |
| 6 | توحيد مفاتيح الصلاحيات في ملف واحد | **HIGH** | 30 دقيقة |
| 7 | إضافة audit logging لجميع عمليات CRUD | **MEDIUM** | 2 ساعة |
| 8 | إضافة ownership للساقط في Sales/Purchases | **MEDIUM** | 30 دقيقة |
| 9 | إضافة branchScope لـ Auth endpoints | **MEDIUM** | 30 دقيقة |
| 10 | إخفاء تفاصيل unique constraint في الأخطاء | **MEDIUM** | 10 دقائق |
