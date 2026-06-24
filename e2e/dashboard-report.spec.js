import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3000';

test('Login and report dashboard data', async ({ page, request }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  // Pre-warm dashboard cache via API
  const loginRes = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  const { token } = await loginRes.json();

  console.log('Warming dashboard cache...');
  await request.get(`${API_URL}/api/executive-dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
  console.log('Cache warmed.');

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' });
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(3000);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('text=إجمالي المبيعات', { timeout: 30000 });
  await page.waitForTimeout(1000);

  const text = await page.locator('body').innerText();
  const lines = text.split('\n').filter(l => l.trim());

  const todayIdx = lines.findIndex(l => l.includes('اليوم'));
  const displayLines = lines.slice(todayIdx, todayIdx + 40);

  console.log('\n═══════════════════════════════════');
  console.log('     📊 تقرير لوحة التحكم');
  console.log('═══════════════════════════════════\n');
  displayLines.forEach(l => console.log(`  ${l}`));

  if (errors.length > 0) {
    console.log(`\n❌ أخطاء (${errors.length}):`, errors.join(' | '));
  } else {
    console.log('\n✅ لا توجد أخطاء في الكونسول');
  }

  await page.screenshot({ path: 'e2e/screenshots/dashboard-final.png', fullPage: true });
  console.log('\n📸 لقطة الشاشة: e2e/screenshots/dashboard-final.png');
});
