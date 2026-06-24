# تقرير تدقيق لوحات القيادة - Dashboard Audit Report
## Mizan POS
**التاريخ:** 2026-06-10

---

## ملخص التنفيذ

| البيان | العدد |
|---|---|
| إجمالي لوحات القيادة | 5 (نشطة) + 3 (شيفرة ميتة) |
| لوحات نشطة | ExecutiveDashboard, CashierDashboard, InventoryDashboard, AuditorDashboard + DashboardPage (موجه) |
| لوحات ميتة | AdminDashboard, ManagerDashboard, AccountantDashboard (غير مستوردة) |
| نقاط API للوحة القيادة | 9 |

---

## أولاً: لوحة القيادة التنفيذية (Executive Dashboard)

### 1.1 نقاط API

| المسار (Endpoint) | الوظيفة | الصلاحية | يعمل؟ |
|---|---|---|---|
| `GET /api/executive-dashboard` | لوحة كاملة | `dashboard:view_executive_dashboard` | ✅ |
| `GET /api/executive-dashboard/today` | بطاقات اليوم | `dashboard:view_executive_dashboard` | ✅ |
| `GET /api/executive-dashboard/month` | بطاقات الشهر | `dashboard:view_executive_dashboard` | ✅ |
| `GET /api/executive-dashboard/inventory` | بطاقات المخزون | `dashboard:view_inventory_value` | ✅ |
| `GET /api/executive-dashboard/finance` | بطاقات المالية | `dashboard:view_financial_summary` | ✅ |
| `GET /api/executive-dashboard/top-products` | أفضل المنتجات | `dashboard:view_executive_dashboard` | ✅ |
| `GET /api/executive-dashboard/top-customers` | أفضل العملاء | `dashboard:view_executive_dashboard` | ✅ |
| `GET /api/executive-dashboard/top-suppliers` | أفضل الموردين | `dashboard:view_executive_dashboard` | ✅ |
| `GET /api/executive-dashboard/alerts` | التنبيهات | `dashboard:view_executive_dashboard` | ✅ |

### 1.2 المكونات (Components)

| المكون | الوظيفة | حالة التحميل | حالة الخطأ |
|---|---|---|---|
| KPI Cards | عرض مؤشرات الأداء (مبيعات اليوم، أرباح الشهر، إلخ) | ✅ Spinner | ✅ |
| Top Products Table | أفضل المنتجات مبيعاً | ✅ | ✅ |
| Top Customers Table | أفضل العملاء | ✅ | ✅ |
| Top Suppliers Table | أفضل الموردين | ✅ | ✅ |
| Alerts Section | تنبيهات المخزون المنخفض | ✅ | ✅ |
| Charts | رسوم بيانية (اختياري) | ✅ | ✅ |

### 1.3 الأمان (Field Security)

- ✅ `sanitizeResponse` مطبق على جميع نقاط API
- ✅ أعمدة الربح والتكلفة محمية بـ `CanViewField`

### 1.4 عزل الفرع (Branch Isolation)

- ✅ `branchScope` مطبق
- المستخدمون non-admin يرون بيانات فرعهم فقط

### 1.5 الحسابات (Calculations)

| المقياس (KPI) | الحساب | صحيح؟ |
|---|---|---|
| مبيعات اليوم | مجموع total للمبيعات المكتملة اليوم | ✅ |
| أرباح الشهر | مجموع (selling_price - cost_price) للمبيعات هذا الشهر | ✅ |
| قيمة المخزون | مجموع (cost_price * quantity) لجميع الأرصدة | ✅ |
| عدد العملاء | عدد العملاء النشطين | ✅ |
| عدد المنتجات | عدد المنتجات النشطة | ✅ |
| المصروفات الشهر | مجموع المصروفات المعتمدة هذا الشهر | ✅ |

---

## ثانياً: لوحة قيادة الكاشير (Cashier Dashboard)

- **الملف:** `CashierDashboard.jsx`
- **المحتوى:** عرض بسيط لمبيعات اليوم وأهداف
- **حالة التحميل:** ✅
- **حالة الخطأ:** ✅
- **API Calls:** `getDashboard` (من `/api/reports/dashboard`)
- **الصلاحية:** cashier

---

## ثالثاً: لوحة قيادة المخزون (Inventory Dashboard)

- **الملف:** `InventoryDashboard.jsx`
- **المحتوى:** مؤشرات المخزون، المنتجات منخفضة المخزون، حركات المخزون
- **حالة التحميل:** ✅
- **حالة الخطأ:** ✅
- **API Calls:** `getDashboard`, `getLowStockProducts`
- **الصلاحية:** inventory_manager

---

## رابعاً: لوحة قيادة المراجع (Auditor Dashboard)

- **الملف:** `AuditorDashboard.jsx`
- **المحتوى:** تقارير وبيانات للتدقيق
- **حالة التحميل:** ✅
- **حالة الخطأ:** ✅
- **الصلاحية:** auditor

---

## خامساً: موجه لوحة القيادة (DashboardPage - Router)

- **الملف:** `DashboardPage.jsx`
- **الوظيفة:** يختار dashboard المناسب حسب دور المستخدم (موجود في App.jsx)
- **الأدوار المدعومة:**
  | الدور | اللوحة | الحالة |
  |---|---|---|
  | super_admin | ExecutiveDashboard | ✅ |
  | admin | ExecutiveDashboard | ✅ |
  | manager | **لن يتم توجيهه** (لا يوجد خيار) | ⚠️ |
  | accountant | **لن يتم توجيهه** (لا يوجد خيار) | ⚠️ |
  | cashier | CashierDashboard | ✅ |
  | inventory_manager | InventoryDashboard | ✅ |
  | auditor | AuditorDashboard | ✅ |

### ⚠️ مشكلة: أدوار manager و accountant بدون Dashboard

عندما يقوم مدير (manager) أو محاسب (accountant) بتسجيل الدخول، يتم توجيههم إلى `/dashboard` ولكن:
- DashboardPage لا تتعرف على دورهم
- قد تظهر شاشة بيضاء أو رسالة خطأ

---

## سادساً: شيفرة ميتة (Dead Code)

| الملف | الحجم | الاستيراد |
|---|---|---|
| `AdminDashboard.jsx` | ~200 سطر | **غير مستورد** في أي مكان |
| `ManagerDashboard.jsx` | ~150 سطر | **غير مستورد** في أي مكان |
| `AccountantDashboard.jsx` | ~150 سطر | **غير مستورد** في أي مكان |

هذه الملفات الثلاثة قد تكون لوحات قديمة أو مخطط لها ولكن لم يتم ربطها.

---

## سابعاً: مشاكل لوحة التقارير (ReportsPage Issues)

| المشكلة | الموقع | درجة الخطورة |
|---|---|---|
| قيم KPI لا تقسم على 100 في DashboardView | ReportsPage.jsx السطور 83-88 | **MEDIUM** |
| لا توجد حالة تحمين DashboardView | ReportsPage.jsx | **MEDIUM** |
| لا توجد حالة تحمين ProfitView | ReportsPage.jsx | **MEDIUM** |
| لا توجد حالة تحمين InventoryView | ReportsPage.jsx | **MEDIUM** |

---

## ثامناً: التوصيات

| # | التوصية | درجة الخطورة |
|---|---|---|
| 1 | إضافة Dashboard للمدير (manager) - يمكن استخدام ExecutiveDashboard | **MEDIUM** |
| 2 | إضافة Dashboard للمحاسب (accountant) - لوحة مالية مبسطة | **MEDIUM** |
| 3 | إصلاح قسم KPI في ReportsPage (قسمة على 100) | **MEDIUM** |
| 4 | إضافة حالات تحمين لأقسام ReportsPage | **MEDIUM** |
| 5 | إزالة الشيفرة الميتة (AdminDashboard, ManagerDashboard, AccountantDashboard) أو ربطها | **LOW** |
