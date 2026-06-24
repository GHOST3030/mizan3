import { getUserPermissions } from './permission.service.js';

const FIELD_PERMISSIONS = {
  'products': {
    cost_price: 'field:view_product_cost',
    average_cost: 'field:view_product_cost',
    profit_margin: 'field:view_profit_margin',
    expected_profit: 'field:view_profit_margin',
  },
  'sales': {
    profit_amount: 'field:view_profit_amount',
    profit_margin: 'field:view_profit_margin',
    invoice_profitability: 'field:view_profit_amount',
  },
  'purchases': {
    purchase_cost: 'field:view_purchase_costs',
    unit_price: 'field:view_purchase_costs',
    total_cost: 'field:view_purchase_costs',
  },
  'inventory': {
    inventory_value: 'field:view_inventory_value',
    stock_value: 'field:view_inventory_value',
    cost_price: 'field:view_product_cost',
    warehouse_value: 'field:view_inventory_value',
  },
  'finance': {
    cash_balance: 'field:view_safe_balance',
    safe_balance: 'field:view_safe_balance',
    financial_summary: 'field:view_financial_summary',
    company_profitability: 'field:view_financial_summary',
    outstanding_receivables: 'field:view_financial_summary',
    outstanding_payables: 'field:view_financial_summary',
  },
  'customers': {
    balance: 'field:view_customer_balance',
    credit_limit: 'field:view_customer_balance',
    opening_balance: 'field:view_customer_balance',
  },
  'suppliers': {
    balance: 'field:view_supplier_balance',
    opening_balance: 'field:view_supplier_balance',
    total_purchases: 'field:view_supplier_balance',
  },
  'reports': {
    net_profit: 'field:view_daily_profit',
    gross_profit: 'field:view_monthly_profit',
    profit_margin_pct: 'field:view_profit_margin',
    cost_of_goods_sold: 'field:view_purchase_costs',
    inventory_value: 'field:view_inventory_value',
    total_cost_value: 'field:view_inventory_value',
    potential_profit: 'field:view_profit_margin',
    safe_balance: 'field:view_safe_balance',
  },
  'executive_dashboard': {
    net_profit: 'field:view_daily_profit',
    total_profit: 'field:view_monthly_profit',
    inventory_value: 'field:view_inventory_value',
    inventory_selling_value: 'field:view_inventory_value',
    safe_balance: 'field:view_safe_balance',
    cash_balance: 'field:view_safe_balance',
    outstanding_receivables: 'field:view_financial_summary',
    outstanding_payables: 'field:view_financial_summary',
  },
};

export const getFieldPermissionsForUser = async (userId) => {
  const allPerms = await getUserPermissions(userId);
  const fieldPerms = new Set();
  for (const p of allPerms) {
    if (p.startsWith('field:')) fieldPerms.add(p);
  }
  return fieldPerms;
};

export const canViewField = async (userId, module, field) => {
  const fieldPerms = FIELD_PERMISSIONS[module];
  if (!fieldPerms) return true;
  const required = fieldPerms[field];
  if (!required) return true;
  const userPerms = await getUserPermissions(userId);
  if (userId) {
    const req = FIELD_PERMISSIONS[module]?.[field];
    if (!req) return true;
  }
  return userPerms.includes(required);
};

export const sanitizeObject = (obj, fieldPerms, moduleFields, path = '') => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, fieldPerms, moduleFields, path));

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const required = moduleFields[key];
    if (required && !fieldPerms.has(required)) {
      result[key] = value !== null && value !== undefined ? '******' : value;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value, fieldPerms, moduleFields, `${path}.${key}`);
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const sanitizeResponse = async (userId, module, data) => {
  const userPerms = await getUserPermissions(userId);
  const fieldPerms = new Set();
  for (const p of userPerms) {
    if (p.startsWith('field:')) fieldPerms.add(p);
  }
  const moduleFields = FIELD_PERMISSIONS[module];
  if (!moduleFields) return data;

  if (data && typeof data === 'object' && data.data && Array.isArray(data.data) && data.meta) {
    return {
      ...data,
      data: data.data.map(item => sanitizeObject(item, fieldPerms, moduleFields)),
    };
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item, fieldPerms, moduleFields));
  }

  return sanitizeObject(data, fieldPerms, moduleFields);
};
