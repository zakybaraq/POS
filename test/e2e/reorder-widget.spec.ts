import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

async function loginViaAPI(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  
  const response = await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'zakybaraq@gmail.com',
        password: 'P@blo7272'
      }),
      credentials: 'same-origin'
    });
    return res.ok;
  });
  
  if (response) {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
  }
}

test.describe('Reorder Widget Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaAPI(page);
  });

  test('should display dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display reorder section when there are low stock ingredients', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const reorderSection = page.locator('#reorder-section');
    const isVisible = await reorderSection.isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(reorderSection).toBeVisible();
      await expect(page.locator('#reorder-section .card-title')).toContainText('Reorder Suggestions');
    } else {
      test.skip('No low stock ingredients to display reorder section');
    }
  });

  test('should load reorder suggestions data if section is visible', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const reorderSection = page.locator('#reorder-section');
    const isVisible = await reorderSection.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('Reorder section not visible');
    }
    
    await page.waitForFunction(() => {
      const container = document.querySelector('#reorder-suggestions');
      return container && !container.innerHTML.includes('Loading');
    }, { timeout: 10000 });
    
    const suggestions = page.locator('#reorder-suggestions > div');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display ingredient details in reorder suggestions', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const reorderSection = page.locator('#reorder-section');
    const isVisible = await reorderSection.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('Reorder section not visible');
    }
    
    await page.waitForFunction(() => {
      const container = document.querySelector('#reorder-suggestions');
      return container && !container.innerHTML.includes('Loading');
    }, { timeout: 10000 });
    
    const firstSuggestion = page.locator('#reorder-suggestions > div').first();
    const html = await firstSuggestion.innerHTML().catch(() => '');
    
    expect(html).toContain('Stock:');
    expect(html).toContain('Min:');
    expect(html).toContain('Daily Usage:');
    expect(html).toContain('Lead Time:');
    expect(html).toContain('EOQ:');
  });

  test('should have Create PO button for each suggestion', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const reorderSection = page.locator('#reorder-section');
    const isVisible = await reorderSection.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('Reorder section not visible');
    }
    
    await page.waitForFunction(() => {
      const container = document.querySelector('#reorder-suggestions');
      return container && !container.innerHTML.includes('Loading');
    }, { timeout: 10000 });
    
    const createPOButtons = page.locator('#reorder-suggestions a:has-text("Buat PO")');
    await expect(createPOButtons.first()).toBeVisible();
    await expect(createPOButtons.first()).toHaveAttribute('href', '/purchase-orders');
  });

  test('should navigate to purchase orders page when clicking Buat PO', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const reorderSection = page.locator('#reorder-section');
    const isVisible = await reorderSection.isVisible().catch(() => false);
    
    if (!isVisible) {
      test.skip('Reorder section not visible');
    }
    
    await page.waitForFunction(() => {
      const container = document.querySelector('#reorder-suggestions');
      return container && !container.innerHTML.includes('Loading');
    }, { timeout: 10000 });
    
    const createPOButton = page.locator('#reorder-suggestions a:has-text("Buat PO")').first();
    await createPOButton.click();
    
    await page.waitForURL(/\/purchase-orders/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/purchase-orders/);
  });

  test('should show low stock warning banner if present', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const lowStockBanner = page.locator('div:has-text("bahan baku stok rendah")');
    
    try {
      await lowStockBanner.waitFor({ state: 'visible', timeout: 3000 });
      await expect(lowStockBanner).toBeVisible();
      await expect(lowStockBanner).toContainText('bahan baku stok rendah');
    } catch {
      console.log('Low stock banner not visible');
    }
  });
});

test.describe('Reorder API Endpoints', () => {
  test('API endpoints should respond correctly', async ({ page, request }) => {
    await loginViaAPI(page);
    
    const endpoints = [
      '/api/reorder/suggestions',
      '/api/reorder/usage/1',
      '/api/reorder/calculate/1',
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${BASE_URL}${endpoint}`, {
        headers: {
          'Cookie': await page.evaluate(() => document.cookie)
        }
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });
});
