import { test, expect } from '@playwright/test';

test('football library page renders 4 sections with content (PL)', async ({ page }) => {
  await page.goto('/pl/football');
  await expect(page.getByRole('heading', { name: /Biblioteka piłkarska/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Triki i kiwki/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Drille techniczne/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Rozgrzewki/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Gry małoobszarowe/i })).toBeVisible();
  // At least one trick visible (Cruyff or Elastico from seed)
  const tricksSection = page.getByRole('region', { name: /Triki i kiwki/i });
  await expect(tricksSection.getByText(/Cruyff/i).first()).toBeVisible();
});

test('football library accessible without login', async ({ page, context }) => {
  await context.clearCookies();
  const response = await page.goto('/en/football');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Football Skills Library/i })).toBeVisible();
});

test('football library renders in all 4 locales', async ({ page }) => {
  const titles = {
    en: /Football Skills Library/i,
    pl: /Biblioteka piłkarska/i,
    it: /Libreria di calcio/i,
    uk: /Бібліотека футболу/i,
  };
  for (const [locale, title] of Object.entries(titles)) {
    const response = await page.goto(`/${locale}/football`);
    expect(response?.status(), `${locale} should return 200`).toBe(200);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
});

test('summary shows non-zero exercise count', async ({ page }) => {
  await page.goto('/pl/football');
  // Summary in PL: "40 ćwiczeń · 12 trików · od amatorów po pro"
  await expect(page.getByText(/40 ćwiczeń/i)).toBeVisible();
  await expect(page.getByText(/12 trików/i)).toBeVisible();
});
