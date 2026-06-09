import { test, expect } from '@playwright/test';

test('football library page renders all sections with content (PL)', async ({ page }) => {
  await page.goto('/pl/football');
  // Page title is an h1; section titles are h2. Scope the section assertions to
  // level 2 so they don't collide with exercise-name overlays (h3 on each video
  // poster, e.g. "Program do rozgrzewki FIFA 11+" also contains "rozgrzewki").
  await expect(page.getByRole('heading', { name: /Biblioteka piłkarska/i, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Triki i kiwki', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drille techniczne', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rozgrzewki', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gry małoobszarowe', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trening bramkarski', level: 2 })).toBeVisible();
  // At least one trick visible (Cruyff from seed)
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
  // Summary in PL: "<N> ćwiczeń · <M> trików · od amatorów po pro".
  // Match the count pattern, not a hard-coded number, so adding exercises
  // (e.g. the goalkeeper track: 40 -> 54) doesn't break the smoke test.
  await expect(page.getByText(/\d+ ćwiczeń.*\d+ trików/)).toBeVisible();
});
