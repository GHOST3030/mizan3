import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';

test('Open login page, screenshot, check console errors', async ({ page }) => {
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push({ text: err.message });
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('form', { timeout: 10000 });

  await page.screenshot({ path: 'e2e/screenshots/login-page.png', fullPage: true });

  console.log(`Console errors: ${consoleErrors.length}`);
  for (const err of consoleErrors) {
    console.log('  ERROR:', err.text);
  }

  expect(consoleErrors.length).toBe(0);
});
