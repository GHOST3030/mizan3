import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3000';

test.describe('Mizan POS - QA2 Dashboard Smoke Tests', () => {

  let authToken;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: 'admin', password: 'admin123' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    authToken = body.token;
  });

  test('Login page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
  });

  test('Dashboard API - /api/executive-dashboard/today responds under 10s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/executive-dashboard/today`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000);
    console.log(`today: ${elapsed}ms`);
  });

  test('Dashboard API - /api/executive-dashboard responds under 15s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/executive-dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 15000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(15000);
    console.log(`full dashboard: ${elapsed}ms`);
  });

  test('Dashboard API - /api/executive-dashboard/month responds under 10s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/executive-dashboard/month`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000);
    console.log(`month: ${elapsed}ms`);
  });

  test('Dashboard API - /api/executive-dashboard/inventory responds under 10s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/executive-dashboard/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000);
    console.log(`inventory: ${elapsed}ms`);
  });

  test('Dashboard API - /api/executive-dashboard/finance responds under 10s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/executive-dashboard/finance`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000);
    console.log(`finance: ${elapsed}ms`);
  });

  test('Dashboard API - /api/executive-dashboard/alerts responds under 10s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/executive-dashboard/alerts`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(10000);
    console.log(`alerts: ${elapsed}ms`);
  });

  test('Dashboard API - /api/reports/dashboard responds under 15s', async ({ request }) => {
    const start = Date.now();
    const res = await request.get(`${API_URL}/api/reports/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 15000,
    });
    const elapsed = Date.now() - start;
    expect(res.ok()).toBeTruthy();
    expect(elapsed).toBeLessThan(15000);
    console.log(`reports dashboard: ${elapsed}ms`);
  });

  test('Dashboard today returns correct data structure', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/executive-dashboard/today`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const data = await res.json();
    expect(typeof data.total_sales).toBe('number');
    expect(typeof data.invoice_count).toBe('number');
    expect(typeof data.net_profit).toBe('number');
    expect(typeof data.active_customers).toBe('number');
  });

  test('Dashboard inventory returns low_stock_products array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/executive-dashboard/inventory`, {
      headers: { Authorization: `Bearer ${authToken}` },
      timeout: 10000,
    });
    const data = await res.json();
    expect(typeof data.total_products).toBe('number');
    expect(Array.isArray(data.low_stock_products)).toBe(true);
  });
});
