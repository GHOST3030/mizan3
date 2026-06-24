# Mizan POS — ERD v1 (قاعدة البيانات العامة)

**الإصدار:** 1.0  
**التاريخ:** 2026-06-05  
**قاعدة البيانات:** PostgreSQL (عبر Supabase)  
**ORM:** Prisma

> 📌 قاعدة ثابتة: كل جدول يحتوي على `id (uuid)`, `created_at`, `updated_at`, `deleted_at`

---

## 🏢 Module: Core

### `companies`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| name | varchar | اسم الشركة |
| name_ar | varchar | الاسم بالعربي |
| logo_url | varchar? | |
| tax_number | varchar? | الرقم الضريبي |

### `branches`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| company_id | uuid FK | |
| name | varchar | |
| name_ar | varchar | |
| address | varchar? | |
| phone | varchar? | |
| is_active | boolean | |

### `currencies`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| code | varchar | YER, USD, SAR |
| name | varchar | |
| symbol | varchar | |
| exchange_rate | integer | مقابل العملة الأساسية (بالهللات) |
| is_default | boolean | |

### `settings`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK? | null = إعداد عام |
| key | varchar | |
| value | text | |

---

## 🔐 Module: Auth

### `users`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| name | varchar | |
| username | varchar UNIQUE | |
| password_hash | varchar | |
| role | enum | admin, manager, cashier, accountant |
| is_active | boolean | |

### `shifts`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| user_id | uuid FK | الكاشير |
| opened_at | timestamptz | |
| closed_at | timestamptz? | |
| opening_balance | integer | بالهللات |
| closing_balance | integer? | |
| notes | text? | |

---

## 📦 Module: Products

### `categories`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| name | varchar | |
| name_ar | varchar | |
| parent_id | uuid FK? | للتصنيفات الفرعية |

### `units`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| name | varchar | كيلو، قطعة، علبة |
| name_ar | varchar | |

### `brands`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| name | varchar | |

### `products`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| category_id | uuid FK? | |
| unit_id | uuid FK | |
| brand_id | uuid FK? | |
| name | varchar | |
| name_ar | varchar | |
| barcode | varchar? UNIQUE | |
| sku | varchar? | |
| cost_price | integer | بالهللات |
| selling_price | integer | بالهللات |
| min_stock | integer | حد التنبيه |
| is_active | boolean | |

---

## 🏭 Module: Inventory

### `stock_movements`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| product_id | uuid FK | |
| type | enum | purchase, sale, return_sale, return_purchase, adjustment, transfer |
| quantity | integer | موجب = دخول، سالب = خروج |
| reference_id | uuid? | id الفاتورة المرتبطة |
| reference_type | varchar? | sale, purchase, ... |
| notes | text? | |

### `stock_counts`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| user_id | uuid FK | من أجرى الجرد |
| counted_at | timestamptz | |
| notes | text? | |

### `stock_count_items`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| stock_count_id | uuid FK | |
| product_id | uuid FK | |
| expected_qty | integer | |
| actual_qty | integer | |
| difference | integer | computed |

---

## 🛒 Module: Sales

### `customers`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| name | varchar | |
| phone | varchar? | |
| balance | integer | رصيد الدين بالهللات |

### `sales`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| shift_id | uuid FK | |
| customer_id | uuid FK? | |
| user_id | uuid FK | الكاشير |
| invoice_number | varchar UNIQUE | |
| status | enum | draft, completed, returned |
| subtotal | integer | |
| discount_amount | integer | |
| tax_amount | integer | |
| total | integer | |
| paid_amount | integer | |
| currency_id | uuid FK | |
| exchange_rate | integer | |
| notes | text? | |

### `sale_items`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| sale_id | uuid FK | |
| product_id | uuid FK | |
| quantity | integer | |
| unit_price | integer | |
| discount | integer | |
| total | integer | |

### `sale_payments`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| sale_id | uuid FK | |
| method | enum | cash, card, transfer, credit |
| amount | integer | |
| currency_id | uuid FK | |
| exchange_rate | integer | |

---

## 🚚 Module: Purchases

### `suppliers`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| name | varchar | |
| phone | varchar? | |
| balance | integer | رصيد الدين |

### `purchases`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| supplier_id | uuid FK? | |
| user_id | uuid FK | |
| invoice_number | varchar? | |
| status | enum | draft, completed, returned |
| subtotal | integer | |
| discount_amount | integer | |
| total | integer | |
| paid_amount | integer | |
| currency_id | uuid FK | |
| exchange_rate | integer | |
| notes | text? | |

### `purchase_items`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| purchase_id | uuid FK | |
| product_id | uuid FK | |
| quantity | integer | |
| unit_price | integer | |
| total | integer | |

---

## 💰 Module: Finance

### `cash_registers`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| name | varchar | |
| balance | integer | |
| currency_id | uuid FK | |

### `expenses`
| العمود | النوع | الوصف |
|--------|-------|-------|
| id | uuid PK | |
| branch_id | uuid FK | |
| user_id | uuid FK | |
| category | varchar | |
| amount | integer | |
| currency_id | uuid FK | |
| exchange_rate | integer | |
| description | text? | |
| expense_date | date | |

---

## العلاقات الرئيسية

```
companies ──< branches ──< users
                      ──< shifts
                      ──< products
                      ──< sales ──< sale_items
                                ──< sale_payments
                      ──< purchases ──< purchase_items
                      ──< stock_movements
                      ──< expenses

products ──< stock_movements
         ──< sale_items
         ──< purchase_items
```