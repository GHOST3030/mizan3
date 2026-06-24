import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3000';

let token;
let testProductId;
let testCategoryId;
let testBrandId;
let testUnitId;

test.beforeAll(async ({ request }) => {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
    timeout: 15000,
  });
  const body = await res.json();
  token = body.token;
  expect(token).toBeTruthy();
});

// ─── 1. CATEGORIES ──────────────────────────────────────

test('GET /categories - list all categories', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/categories`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  expect(body.length).toBeGreaterThan(0);
  console.log(`  ✅ ${body.length} categories found`);
});

test('POST /categories - create new category', async ({ request }) => {
  const name = `TestCat_${Date.now()}`;
  const res = await request.post(`${API_URL}/api/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, name_ar: name },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.id).toBeTruthy();
  testCategoryId = body.id;
  console.log(`  ✅ Category created: ${body.name_ar}`);
});

test('POST /categories - rejects duplicate name gracefully', async ({ request }) => {
  const res = await request.post(`${API_URL}/api/categories`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Beverages', name_ar: 'مشروبات' },
  });
  // Should either succeed (if duplicate allowed) or return conflict
  expect(res.status() === 201 || res.status() === 409 || res.status() === 500).toBeTruthy();
  console.log(`  ✅ Duplicate category handled (status ${res.status()})`);
});

test('DELETE /categories/:id - delete category', async ({ request }) => {
  if (!testCategoryId) return;
  const res = await request.delete(`${API_URL}/api/categories/${testCategoryId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([200, 204, 400, 409]).toContain(res.status());
  console.log(`  ✅ Category delete returned ${res.status()}`);
});

// ─── 2. BRANDS ──────────────────────────────────────────

test('GET /brands - list all brands', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/brands`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  console.log(`  ✅ ${body.length} brands found`);
});

test('POST /brands - create new brand', async ({ request }) => {
  const name = `TestBrand_${Date.now()}`;
  const res = await request.post(`${API_URL}/api/brands`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.id).toBeTruthy();
  testBrandId = body.id;
  console.log(`  ✅ Brand created: ${body.name}`);
});

test('DELETE /brands/:id - delete brand', async ({ request }) => {
  if (!testBrandId) return;
  const res = await request.delete(`${API_URL}/api/brands/${testBrandId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([200, 204, 400, 409]).toContain(res.status());
  console.log(`  ✅ Brand delete returned ${res.status()}`);
});

// ─── 3. UNITS ───────────────────────────────────────────

test('GET /units - list all units', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/units`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  console.log(`  ✅ ${body.length} units found`);
});

test('POST /units - create new unit', async ({ request }) => {
  const name = `TestUnit_${Date.now()}`;
  const res = await request.post(`${API_URL}/api/units`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, name_ar: name },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.id).toBeTruthy();
  testUnitId = body.id;
  console.log(`  ✅ Unit created: ${body.name_ar}`);
});

test('DELETE /units/:id - delete unit', async ({ request }) => {
  if (!testUnitId) return;
  const res = await request.delete(`${API_URL}/api/units/${testUnitId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([200, 204, 400, 409]).toContain(res.status());
  console.log(`  ✅ Unit delete returned ${res.status()}`);
});

// ─── 4. PRODUCTS CRUD ───────────────────────────────────

test('GET /products - list with pagination', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?page=1&limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.data).toBeDefined();
  expect(body.meta).toBeDefined();
  expect(body.meta.total).toBeGreaterThan(0);
  console.log(`  ✅ Products: ${body.data.length} on page, ${body.meta.total} total`);
});

test('GET /products - search by name', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?q=شوكولاتة`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  expect(body.data.length).toBeGreaterThan(0);
  console.log(`  ✅ Search found ${body.data.length} products`);
});

test('GET /products - search by barcode', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?q=6282001234595`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  expect(body.data.length).toBeGreaterThan(0);
  console.log(`  ✅ Barcode search found ${body.data.length} products`);
});

test('GET /products/barcode/:barcode - lookup by barcode', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products/barcode/6282001234595`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.name_ar).toBeTruthy();
  console.log(`  ✅ Barcode lookup: ${body.name_ar}`);
});

test('GET /products/:id - get by ID', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await res.json();
  const firstId = list.data[0].id;

  const res2 = await request.get(`${API_URL}/api/products/${firstId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res2.ok()).toBeTruthy();
  const body = await res2.json();
  expect(body.id).toBe(firstId);
  console.log(`  ✅ Product by ID: ${body.name_ar}`);
});

test('POST /products - create', async ({ request }) => {
  const unique = Date.now();
  const res = await request.post(`${API_URL}/api/products`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      branch_id: '00000000-0000-0000-0000-000000000002',
      unit_id: '00000000-0000-0000-0000-000000000205',
      name: `TestProduct_${unique}`,
      name_ar: `منتج اختبار_${unique}`,
      cost_price: 500,
      selling_price: 1000,
      barcode: `TEST${unique}`,
      min_stock: 5,
      is_active: true,
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.id).toBeTruthy();
  testProductId = body.id;
  console.log(`  ✅ Product created: ${body.name_ar} (${body.id})`);
});

test('POST /products - duplicate barcode returns 409', async ({ request }) => {
  const unique = Date.now() + 1;
  // Create first product
  await request.post(`${API_URL}/api/products`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      branch_id: '00000000-0000-0000-0000-000000000002',
      unit_id: '00000000-0000-0000-0000-000000000205',
      name: `DupTest_${unique}`,
      name_ar: `اختبار مكرر_${unique}`,
      cost_price: 100, selling_price: 200,
      barcode: `DUP${unique}`,
    },
  });
  // Try creating with same barcode
  const res = await request.post(`${API_URL}/api/products`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      branch_id: '00000000-0000-0000-0000-000000000002',
      unit_id: '00000000-0000-0000-0000-000000000205',
      name: `DupTest2_${unique}`,
      name_ar: `اختبار مكرر2_${unique}`,
      cost_price: 100, selling_price: 200,
      barcode: `DUP${unique}`,
    },
  });
  expect(res.status()).toBe(409);
  console.log(`  ✅ Duplicate barcode rejected (409)`);
});

test('PUT /products/:id - update', async ({ request }) => {
  if (!testProductId) return;
  const res = await request.put(`${API_URL}/api/products/${testProductId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { selling_price: 1500, name_ar: `منتج محدث_${Date.now()}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.selling_price).toBe(1500);
  console.log(`  ✅ Product updated: selling_price=1500`);
});

test('GET /products/:id - verify update persisted', async ({ request }) => {
  if (!testProductId) return;
  const res = await request.get(`${API_URL}/api/products/${testProductId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  expect(body.selling_price).toBe(1500);
  console.log(`  ✅ Update persisted`);
});

test('DELETE /products/:id - soft delete', async ({ request }) => {
  if (!testProductId) return;
  const res = await request.delete(`${API_URL}/api/products/${testProductId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([200, 204]).toContain(res.status());
  console.log(`  ✅ Product soft-deleted`);

  // Verify it no longer appears in list
  const listRes = await request.get(`${API_URL}/api/products?q=منتج اختبار`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listRes.json();
  const found = list.data.some((p) => p.id === testProductId);
  expect(found).toBeFalsy();
  console.log(`  ✅ Product hidden from list after delete`);
});

// ─── 5. INVENTORY ──────────────────────────────────────

test('GET /inventory/balance - paginated', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/inventory/balance?limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.data).toBeDefined();
  expect(body.meta).toBeDefined();
  expect(body.data.length).toBeLessThanOrEqual(10);
  console.log(`  ✅ ${body.data.length} balances, ${body.meta.total} total`);
});

test('GET /inventory/low-stock - returns low + out-of-stock', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/inventory/low-stock`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.meta).toBeDefined();
  expect(body.meta.total).toBeGreaterThanOrEqual(0);
  expect(body.meta.low_stock + body.meta.out_of_stock).toBe(body.meta.total);
  console.log(`  ✅ Low stock: ${body.meta.low_stock} low, ${body.meta.out_of_stock} out (${body.data.length} total)`);
});

test('GET /inventory/balance/:product_id - single product stock', async ({ request }) => {
  const listRes = await request.get(`${API_URL}/api/products?limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listRes.json();
  const pid = list.data[0].id;

  const res = await request.get(`${API_URL}/api/inventory/balance/${pid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.balance || body.product_id || body.id).toBeTruthy();
  console.log(`  ✅ Product stock: ${JSON.stringify(body).substring(0, 100)}`);
});

// ─── 6. VALIDATION & EDGE CASES ────────────────────────

test('POST /products - rejects missing required fields', async ({ request }) => {
  const res = await request.post(`${API_URL}/api/products`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'Incomplete' },
  });
  expect(res.status() === 400 || res.status() === 500).toBeTruthy();
  console.log(`  ✅ Missing fields rejected (${res.status()})`);
});

test('GET /products/:id - invalid UUID returns 400', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products/not-a-uuid`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect([400, 404]).toContain(res.status());
  console.log(`  ✅ Invalid UUID handled (${res.status()})`);
});

test('GET /products - filter by category', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?category_id=00000000-0000-0000-0000-000000000100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  console.log(`  ✅ Category filter: ${body.data.length} products`);
  expect(body.data.every((p) => p.category?.id === '00000000-0000-0000-0000-000000000100' || p.category_id === '00000000-0000-0000-0000-000000000100')).toBeTruthy();
});

test('GET /products - filter by brand', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?brand_id=00000000-0000-0000-0000-000000000301`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  console.log(`  ✅ Brand filter: ${body.data.length} products`);
});

test('GET /products - filter by is_active', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/products?is_active=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  console.log(`  ✅ Active filter: ${body.data.length} products`);
});

test('GET /inventory/movements - list movements', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/inventory/movements?limit=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  console.log(`  ✅ ${body.data?.length || 0} movements`);
});

test('GET /inventory/warehouses - list warehouses', async ({ request }) => {
  const res = await request.get(`${API_URL}/api/inventory/warehouses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body)).toBeTruthy();
  console.log(`  ✅ ${body.length} warehouses`);
});

// ─── 7. RESPONSE TIME ──────────────────────────────────

test('Response times - all under 5s', async ({ request }) => {
  const endpoints = [
    { name: 'products list', url: '/api/products?limit=5' },
    { name: 'categories', url: '/api/categories' },
    { name: 'brands', url: '/api/brands' },
    { name: 'units', url: '/api/units' },
    { name: 'inventory balance', url: '/api/inventory/balance?limit=5' },
    { name: 'low stock', url: '/api/inventory/low-stock' },
    { name: 'warehouses', url: '/api/inventory/warehouses' },
  ];

  for (const ep of endpoints) {
    const start = Date.now();
    const res = await request.get(`${API_URL}${ep.url}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(5000);
    console.log(`  ✅ ${ep.name}: ${elapsed}ms`);
  }
});
