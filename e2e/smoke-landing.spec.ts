import { test, expect } from '@playwright/test';

// Smoke test for the landing page. Verifies:
//   1. `/` redirects to a locale-prefixed URL (e.g. `/en`).
//   2. The hero heading from `messages/en.json` -> Landing.heroPart1 renders.
//   3. The primary CTA (Get started) navigates to `/plan`, which proxy.ts
//      auto-provisions an anonymous Supabase session for.
test('landing -> plan via primary CTA', async ({ page }) => {
  await page.goto('/');

  // next-intl with `localePrefix: 'always'` redirects `/` to `/<locale>`.
  await expect(page).toHaveURL(/\/(en|pl|it|uk)$/);

  // `Landing.heroPart1` = "Sport for every" (see messages/en.json). The hero
  // splits into two text spans; we match the first because the second is
  // wrapped in an <em> with a decorative SVG underline.
  await expect(page.getByRole('heading', { name: /sport for every/i })).toBeVisible();

  // `Landing.ctaPrimary` = "Get started". There are two on the page (top
  // hero + bottom CTA section) - the first one is enough for smoke.
  await page.getByRole('link', { name: /get started/i }).first().click();

  // The CTA targets `/plan`, but proxy.ts may auto-redirect a fresh
  // anonymous visitor through `/tutorial` and `/onboarding` before
  // reaching the plan. Accept any of those locale-prefixed app routes -
  // they all prove the navigation off the landing page worked.
  await expect(page).toHaveURL(/\/(en|pl|it|uk)\/(plan|tutorial|onboarding)/);
});
