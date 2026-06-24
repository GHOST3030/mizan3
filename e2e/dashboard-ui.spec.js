import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3000';

test('Login and view dashboard top cards', async ({ page, request }) => {
  const logs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') logs.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  page.on('pageerror', (err) => logs.push(`PAGE ERROR: ${err.message}`));

  // Get API data for comparison
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { token } = await loginRes.json();

  const [todayData, inventoryData] = await Promise.all([
    request.get(`${API_URL}/api/executive-dashboard/today`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
    request.get(`${API_URL}/api/executive-dashboard/inventory`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  ]);

  console.log('API TODAY:', JSON.stringify(todayData));
  console.log('API INVENTORY:', JSON.stringify(inventoryData));

  // Login via UI
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(3000);

  console.log('URL after login:', page.url());

  // Navigate to dashboard and wait for data to render
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'load', timeout: 15000 });

  // Wait for the dashboard to finish loading (wait for a card title to appear)
  await page.waitForSelector('text=إجمالي المبيعات', { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'e2e/screenshots/dashboard-after-fix.png', fullPage: true });

  // Read UI text
  const text = await page.locator('body').innerText();
  const lines = text.split('\n').filter(l => l.trim());
  console.log('\n=== UI TEXT (first 80 lines) ===');
  lines.slice(0, 80).forEach((l, i) => console.log(`${i}: ${l}`));

  if (logs.length > 0) {
    console.log(`\nCONSOLE ERRORS (${logs.length}):`, logs.join(' | '));
  } else {
    console.log('\n✅ No console errors');
  }
});
