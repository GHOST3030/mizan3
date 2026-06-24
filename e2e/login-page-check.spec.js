import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';

test('Check login page structure', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const html = await page.locator('body').innerHTML();
  console.log('=== FORM HTML (first 3000 chars) ===');
  console.log(html.substring(0, 3000));

  const text = await page.locator('body').innerText();
  console.log('\n=== VISIBLE TEXT ===');
  console.log(text);

  await page.screenshot({ path: 'e2e/screenshots/login-page-structure.png', fullPage: true });
});
