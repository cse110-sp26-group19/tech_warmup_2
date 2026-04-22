const { test, expect } = require('@playwright/test');

test('user can load the page', async ({ page }) => {
  await page.goto('file://' + process.cwd() + '/product/index.html');
  await expect(page.locator('h1')).toBeVisible();
});

test('user can click the hit button', async ({ page }) => {
  await page.goto('file://' + process.cwd() + '/product/index.html');

  const hitButton = page.locator('#hit-button');
  await expect(hitButton).toBeVisible();
  await hitButton.click();

  await expect(page.locator('#balance-amount')).toBeVisible();
});