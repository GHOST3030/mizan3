# تقرير إنجاز المرحلة B — أمن الملكية (Ownership Security)

## الملخص
تم تطبيق نظام ملكية البيانات (Ownership) يضمن أن المستخدم العادي لا يمكنه الوصول أو تعديل بيانات مستخدم آخر. المدير و المدير العام يستثنون من هذا القيد.

## التغييرات

### ملفات جديدة
| الملف | الغرض |
|-------|-------|
| `backend/src/middleware/ownership.js` | Middleware مصنع (factory) يتحقق من ملكية المورد |
| `backend/tests/api/ownership.test.js` | 22 اختبار تحقق من الملكية |

### ملفات معدلة
| الملف | التغيير |
|-------|---------|
| `backend/src/modules/sales/sales.routes.js` | إضافة `ownership('sale')` لـ GET/:id, POST/:id/cancel, POST/:id/resume |
| `backend/src/modules/sales/sales.validation.js` | إضافة `user_id` إلى `searchSaleSchema` |
| `backend/src/modules/sales/sales.controller.js` | حقن `user_id` للكاشير عند عرض قائمة المبيعات |
| `backend/src/modules/sales/sales.service.js` | تصفية المبيعات حسب `user_id` عند تمريره |
| `backend/src/modules/finance/finance.routes.js` | إضافة `ownership('shift')` و `ownership('expense')` |
| `backend/src/modules/finance/finance.controller.js` | حقن `user_id` للكاشير/المحاسب في قوائم الورديات والمصروفات |
| `backend/src/modules/finance/finance.validation.js` | إضافة `user_id` إلى `searchExpenseSchema` |
| `backend/src/modules/finance/finance.service.js` | تصفية المصروفات حسب `user_id` عند تمريره |
| `backend/tests/setup.js` | إضافة `createMany` و `updateMany` إلى mocks |

## آلية العمل

### `ownership(model, options?)` Middleware
```
ownership('sale') ← يتحقق من sale.user_id
ownership('shift') ← يتحقق من shift.user_id
ownership('expense') ← يتحقق من expense.user_id
```

- **admin** و **manager**: يتجاوزان التحقق (يصلون لأي بيانات)
- **cashier**, **accountant**: يتحقق من مطابقة `user_id` في المورد مع `req.user.userId`
- إذا لم يتطابق: `403` مع رسالة "ليس لديك صلاحية للوصول إلى هذه البيانات"
- إذا المورد غير موجود: يمرر للـ controller ليعالج 404

### تصفية قوائم المبيعات
- **كاشير**: `getSales` تحقن تلقائياً `user_id = req.user.userId` → يرى فقط فواتيره
- **مدير/admin**: لا تحقن → يرون كل الفواتير

### تصفية قوائم المصروفات
- **كاشير/محاسب**: `getExpenses` تحقن `user_id = req.user.userId` → يرون فقط مصروفاتهم
- **مدير/admin**: لا تحقن → يرون كل المصروفات

### المحاسب (Auditor) يبقى read-only
- يمكنه إنشاء وتعديل مصروفاته فقط (ownership يضمنه)
- لا يمكنه اعتماد أو رفض المصروفات (authorize يمنعه)
- لا يمكنه حذف المصروفات (authorize يمنعه)

## نقاط API المحمية

| المسار | آلية الحماية |
|--------|-------------|
| `GET /api/sales/:id` | `ownership('sale')` — كاشير يرى فقط فواتيره |
| `POST /api/sales/:id/cancel` | `ownership('sale')` — كاشير يلغي فقط فواتيره |
| `POST /api/sales/:id/resume` | `ownership('sale')` — كاشير يستأنف فقط فواتيره |
| `GET /api/finance/shifts/:id` | `ownership('shift')` — كاشير يرى فقط ورديته |
| `PUT /api/finance/shifts/:id/close` | `ownership('shift')` — كاشير يغلق فقط ورديته |
| `GET /api/finance/expenses/:id` | `ownership('expense')` — مستخدم يرى فقط مصروفاته |
| `PUT /api/finance/expenses/:id` | `ownership('expense')` — مستخدم يعدل فقط مصروفاته |

## نتائج الاختبارات

### إجمالي: **145 اختبار — 145 نجاح**

| مجموعة الاختبارات | العدد | النتيجة |
|------------------|-------|---------|
| اختبارات سابقة | 101 | ✅ 101/101 |
| Phase A (عزل فروع + JWT) | 22 | ✅ 22/22 |
| **Phase B (الملكية)** | **22** | **✅ 22/22** |

### سيناريوهات التحقق من الملكية (22 اختبار)

| # | السيناريو | النتيجة |
|---|-----------|---------|
| 1 | كاشير يشاهد فاتورته ← 200 | ✅ |
| 2 | كاشير يشاهد فاتورة كاشير آخر ← 403 | ✅ |
| 3 | مدير يشاهد فاتورة أي كاشير ← 200 | ✅ |
| 4 | Admin يشاهد فاتورة أي كاشير ← 200 | ✅ |
| 5 | كاشير يلغي فاتورته ← 200 | ✅ |
| 6 | كاشير يلغي فاتورة كاشير آخر ← 403 | ✅ |
| 7 | قائمة المبيعات: تحقن user_id للكاشير | ✅ |
| 8 | قائمة المبيعات: لا تحقن للمدير | ✅ |
| 9 | كاشير يشاهد ورديته ← 200 | ✅ |
| 10 | كاشير يشاهد وردية كاشير آخر ← 403 | ✅ |
| 11 | كاشير يغلق ورديته ← 200 | ✅ |
| 12 | كاشير يغلق وردية كاشير آخر ← 403 | ✅ |
| 13 | محاسب يشاهد مصروفه ← 200 | ✅ |
| 14 | محاسب يشاهد مصروف محاسب آخر ← 403 | ✅ |
| 15 | مدير يشاهد مصروف أي محاسب ← 200 | ✅ |
| 16 | محاسب يعدل مصروفه ← 200 | ✅ |
| 17 | محاسب يعدل مصروف محاسب آخر ← 403 | ✅ |
| 18 | قائمة المصروفات: تحقن user_id للكاشير | ✅ |
| 19 | قائمة المصروفات: تحقن user_id للمحاسب | ✅ |
| 20 | قائمة المصروفات: لا تحقن للمدير | ✅ |
| 21 | كاشير من فرع آخر يصل لبيانات ← 403 (branchScope) | ✅ |
| 22 | طلب بدون توكن ← 401 | ✅ |

## بناء الواجهة الأمامية
```
✓ built in 2.33s
1910 modules transformed
```

## الأمان المحقق
- **قبل**: كاشير يمكنه عرض وإلغاء فواتير أي كاشير آخر
- **بعد**: كاشير يرى ويلغي فواتيره فقط (ما لم يكن مدير أو admin)
- **قبل**: محاسب يمكنه تعديل مصروفات أي محاسب آخر  
- **بعد**: محاسب يعدل مصروفاته فقط
- **قبل**: أي مستخدم يطلع على أي وردية
- **بعد**: كاشير يرى وردياته فقط

## المخاطر المتبقية (للمرحلة C)
- Rate limiting على تسجيل الدخول
- JWT في localStorage (XSS risk)
- تدقيق IP address
- سجل تدقيق مفقود لـ 9 كيانات
- حماية مسارات الواجهة الأمامية
