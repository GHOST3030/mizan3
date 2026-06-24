import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sanitizeObject } from '../../src/services/fieldSecurity.service.js';

describe('Field-Level Security (Phase G2) - SanitizeObject', () => {
  const moduleFields = {
    cost_price: 'field:view_product_cost',
    profit_margin: 'field:view_profit_margin',
    inventory_value: 'field:view_inventory_value',
  };

  it('masks sensitive field when user lacks permission', () => {
    const fieldPerms = new Set();
    const data = { cost_price: 1000, name: 'Test Product' };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.cost_price).toBe('******');
    expect(result.name).toBe('Test Product');
  });

  it('preserves value when user has permission', () => {
    const fieldPerms = new Set(['field:view_product_cost']);
    const data = { cost_price: 1000, name: 'Test Product' };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.cost_price).toBe(1000);
    expect(result.name).toBe('Test Product');
  });

  it('preserves non-sensitive fields', () => {
    const fieldPerms = new Set();
    const data = { name: 'Product', barcode: '123456', is_active: true };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.name).toBe('Product');
    expect(result.barcode).toBe('123456');
    expect(result.is_active).toBe(true);
  });

  it('handles arrays of objects', () => {
    const fieldPerms = new Set();
    const data = [
      { cost_price: 1000, name: 'Product 1' },
      { cost_price: 2000, name: 'Product 2' },
    ];
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result[0].cost_price).toBe('******');
    expect(result[0].name).toBe('Product 1');
    expect(result[1].cost_price).toBe('******');
  });

  it('handles paginated response structure via sanitizeResponse-like processing', () => {
    const fieldPerms = new Set();
    const data = {
      data: [
        { cost_price: 1000, name: 'Product 1' },
      ],
      meta: { total: 1, page: 1 },
    };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.data[0].cost_price).toBe('******');
    expect(result.meta.total).toBe(1);
  });

  it('allows user with multiple field permissions', () => {
    const fieldPerms = new Set(['field:view_product_cost', 'field:view_inventory_value']);
    const data = { cost_price: 1000, inventory_value: 50000, profit_margin: 25 };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.cost_price).toBe(1000);
    expect(result.inventory_value).toBe(50000);
    expect(result.profit_margin).toBe('******');
  });

  it('handles null values for sensitive fields', () => {
    const fieldPerms = new Set();
    const data = { cost_price: null, name: 'Test' };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.cost_price).toBeNull();
    expect(result.name).toBe('Test');
  });

  it('handles undefined values for sensitive fields', () => {
    const fieldPerms = new Set();
    const data = { cost_price: undefined, name: 'Test' };
    const result = sanitizeObject(data, fieldPerms, moduleFields);
    expect(result.cost_price).toBeUndefined();
  });

  it('handles empty objects', () => {
    const fieldPerms = new Set();
    const result = sanitizeObject({}, fieldPerms, moduleFields);
    expect(result).toEqual({});
  });

  it('handles null input', () => {
    const fieldPerms = new Set();
    const result = sanitizeObject(null, fieldPerms, moduleFields);
    expect(result).toBeNull();
  });
});

describe('Field Security - Service exports', () => {
  it('exports sanitizeObject function', async () => {
    const { sanitizeObject } = await import('../../src/services/fieldSecurity.service.js');
    expect(typeof sanitizeObject).toBe('function');
  });

  it('exports getFieldPermissionsForUser function', async () => {
    const { getFieldPermissionsForUser } = await import('../../src/services/fieldSecurity.service.js');
    expect(typeof getFieldPermissionsForUser).toBe('function');
  });

  it('exports sanitizeResponse function', async () => {
    const { sanitizeResponse } = await import('../../src/services/fieldSecurity.service.js');
    expect(typeof sanitizeResponse).toBe('function');
  });

  it('exports canViewField function', async () => {
    const { canViewField } = await import('../../src/services/fieldSecurity.service.js');
    expect(typeof canViewField).toBe('function');
  });
});
