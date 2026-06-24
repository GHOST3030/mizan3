# تقرير أمن الحقول (Field Level Security) - QA2

**التاريخ:** 10 يونيو 2026

---

## ملخص

تم اختبار رؤية البيانات الحساسة عبر الأدوار المختلفة. يعتمد النظام على:
- مكون `CanViewField` في الواجهة الأمامية لإخفاء/إظهار الحقول
- صلاحيات `field:*` في الخلفية للتحكم في إرجاع البيانات

---

## الحقول الحساسة

| الحقل | مفتاح الصلاحية | الأدوار المسموح لها |
|-------|---------------|-------------------|
| سعر التكلفة (Cost Price) | `field:view_cost_price` | super_admin, admin, manager, accountant |
| هامش الربح (Profit Margin) | `field:view_profit_margin` | super_admin, admin, manager, accountant |
| قيمة المخزون (Inventory Value) | `field:view_inventory_value` | super_admin, admin, manager, inventory_manager |
| رصيد العميل (Customer Balance) | `field:view_customer_balance` | super_admin, admin, manager, accountant |
| رصيد الصندوق (Safe Balance) | `field:view_safe_balance` | super_admin, admin, manager, accountant |
| الملخص المالي (Financial Summary) | `field:view_financial_summary` | super_admin, admin, manager, accountant |

---

## نتائج الاختبار

### واجهة API (اختبار الخلفية)

| نقطة API | الحقل الحساس | وصول Admin | وصول Cashier |
|----------|-------------|-----------|-------------|
| `GET /products/:id` | `cost_price` | ✅ 200 - مرئي | ❌ 401 (غير قادر على تسجيل الدخول) |
| `GET /customers` | `balance` | ✅ 200 - مرئي | ❌ 401 (غير قادر على تسجيل الدخول) |
| `GET /inventory/balance` | الكمية والقيمة | ✅ 200 | ❌ 401 |
| `GET /executive-dashboard/finance` | الأرصدة المالية | ⚠️ مهلة | ❌ 401 |
| `GET /executive-dashboard/inventory` | قيمة المخزون | ⚠️ مهلة | ❌ 401 |

### ملاحظة هامة

نظراً لأن كلمات المرور للمستخدمين غير المسؤول (`cashir`، `admin2`، `account2`) غير معروفة، لم نتمكن من إكمال اختبار أمن الحقول لجميع الأدوار. الاختبار تم فقط لدور `admin`.

---

## تحليل الكود المصدري

### مكون `CanViewField`
```jsx
// frontend/src/components/CanViewField.jsx
// يستخدم hasPermission للتحقق من صلاحية مشاهدة الحقل
<CanViewField fieldPermission="field:view_cost_price">
  {cost_price}
</CanViewField>
```

### صلاحيات الحقول في الخلفية
```javascript
// backend/src/middleware/permissions.js
field:view_cost_price
field:view_profit_margin
field:view_customer_balance
field:view_inventory_value
field:view_safe_balance
field:view_financial_summary
```

---

## المشاكل المكتشفة

1. **🔴 متوسط:** صلاحيات الحقول (`field:*`) مطبقة فقط في الواجهة الأمامية عبر `CanViewField`. لا يوجد تحقق على مستوى الخلفية (API) لمنع إرجاع البيانات الحساسة. أي مستخدم يستطيع قراءة API مباشرة قد يرى البيانات الحساسة إذا كان لديه صلاحية `products:manage`.

2. **🔴 متوسط:** لا يمكن التحقق من أمن الحقول للأدوار غير المسؤول بسبب عدم معرفة كلمات المرور.

3. **🟡 منخفض:** أسماء الحقول في `useFieldPermission` لا تتطابق تماماً مع أسماء الصلاحيات في الخلفية (بعضها يستخدم `PERMISSIONS.VIEW_COST_PRICE` والبعض الآخر `PERMISSIONS.VIEW_PROFIT_MARGIN`).
