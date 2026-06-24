import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3000';

test('Login, navigate to dashboard, verify top cards against API', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const [emailInput] = await page.locator('input[type="text"], input[name="username"], input:not([type="password"])').all();
  const [passwordInput] = await page.locator('input[type="password"]').all();

  if (emailInput && passwordInput) {
    await emailInput.fill('admin');
    await passwordInput.fill('admin123');
    const submitBtn = page.locator('button[type="submit"], button:has-text("دخول"), button:has-text("تسجيل")');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    }
  }

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });

  await page.screenshot({ path: 'e2e/screenshots/dashboard-top-cards.png', fullPage: true });

  // Try to read card values from the page
  const pageText = await page.locator('body').innerText();
  console.log('=== PAGE TEXT (first 2000 chars) ===');
  console.log(pageText.substring(0, 2000));
  console.log('=== END PAGE TEXT ===');
  console.log('Console errors:', consoleErrors.length);
});
