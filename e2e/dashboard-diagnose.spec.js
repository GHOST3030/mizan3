import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3000';

test('Diagnose dashboard failure', async ({ page, request }) => {
  // 1. Check auth
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
    timeout: 10000,
  });
  console.log(`Login status: ${loginRes.status()}`);
  const body = await loginRes.json();
  console.log(`Login response keys: ${Object.keys(body).join(', ')}`);
  const token = body.token || body.access_token;
  if (!token) {
    console.log('Login failed:', JSON.stringify(body));
    return;
  }

  // 2. Test API endpoints directly
  for (const ep of ['/api/executive-dashboard', '/api/executive-dashboard/today', '/api/executive-dashboard/month', '/api/executive-dashboard/inventory', '/api/executive-dashboard/finance', '/api/executive-dashboard/alerts', '/api/reports/dashboard']) {
    try {
      const res = await request.get(ep, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000,
      });
      console.log(`${ep}: status=${res.status()}, ok=${res.ok()}`);
      if (!res.ok()) {
        const text = await res.text();
        console.log(`  Response: ${text.substring(0, 200)}`);
      }
    } catch (e) {
      console.log(`${ep}: ERROR - ${e.message}`);
    }
  }

  // 3. Check frontend rendering
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`  [CONSOLE ERROR] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`  [PAGE ERROR] ${err.message}`));

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  console.log(`Login page loaded: ${await page.title()}`);

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(3000);
  console.log(`After login URL: ${page.url()}`);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(5000);
  console.log(`Dashboard URL: ${page.url()}`);
  
  const bodyText = await page.locator('body').innerText();
  const lines = bodyText.split('\n').filter(l => l.trim());
  console.log(`\n=== Page content (${lines.length} lines) ===`);
  console.log(lines.slice(0, 50).join('\n'));

  await page.screenshot({ path: 'e2e/screenshots/dashboard-diagnose.png', fullPage: true });
});
