import { describe, it, expect, vi } from 'vitest';

// `football-composition.ts` imports `server-only`, which throws when loaded
// outside a Next.js server bundle. Vitest doesn't go through Next's compiler,
// so we stub the module to a no-op before importing the file under test.
vi.mock('server-only', () => ({}));

import { composeFootballPlan } from '../football-composition';
import type { ExerciseCandidate } from '../plan-generator';

const catalog: ExerciseCandidate[] = [
  { slug: 'fw1', category: 'football_warmup', difficulty: 'low', name: 'Warmup 1', duration_minutes: 5, equipment: ['ball'] },
  { slug: 'fw2', category: 'football_warmup', difficulty: 'low', name: 'Warmup 2', duration_minutes: 5, equipment: ['ball'] },
  { slug: 'fd1', category: 'football_drill', difficulty: 'mid', name: 'Drill 1', duration_minutes: 10, equipment: ['ball'] },
  { slug: 'fd2', category: 'football_drill', difficulty: 'mid', name: 'Drill 2', duration_minutes: 10, equipment: ['ball'] },
  { slug: 'ft1', category: 'football_trick', difficulty: 'mid', name: 'Cruyff turn', duration_minutes: 8, equipment: ['ball'] },
  { slug: 'fg1', category: 'football_game', difficulty: 'mid', name: 'Mini-match', duration_minutes: 15, equipment: ['ball'] },
  { slug: 'cd1', category: 'cooldown', difficulty: 'low', name: 'Cooldown 1', duration_minutes: 3, equipment: [] },
  { slug: 'wu1', category: 'warmup', difficulty: 'low', name: 'Generic warmup', duration_minutes: 3, equipment: [] },
];

describe('composeFootballPlan', () => {
  it('returns 5 items in canonical order: warmup → drill → drill-or-trick → game → cooldown', () => {
    const plan = composeFootballPlan(catalog, { budgetMinutes: 60, seed: 1 });
    expect(plan).toHaveLength(5);
    expect(plan[0].category).toBe('football_warmup');
    expect(plan[1].category).toBe('football_drill');
    expect(['football_drill', 'football_trick']).toContain(plan[2].category);
    expect(plan[3].category).toBe('football_game');
    expect(plan[4].category).toBe('cooldown');
  });

  it('falls back to generic warmup when no football_warmup available', () => {
    const without = catalog.filter((e) => e.category !== 'football_warmup');
    const plan = composeFootballPlan(without, { budgetMinutes: 60, seed: 1 });
    expect(plan[0].category).toBe('warmup');
  });

  it('trims items to respect time budget', () => {
    const plan = composeFootballPlan(catalog, { budgetMinutes: 15, seed: 1 });
    const total = plan.reduce((sum, ex) => sum + ex.duration_minutes, 0);
    expect(total).toBeLessThanOrEqual(15);
    expect(plan.length).toBeGreaterThanOrEqual(2);
  });

  it('returns at least warmup + cooldown for very small budget', () => {
    const plan = composeFootballPlan(catalog, { budgetMinutes: 8, seed: 1 });
    expect(plan.length).toBeGreaterThanOrEqual(2);
    expect(plan[0].category).toMatch(/warmup/);
    expect(plan[plan.length - 1].category).toBe('cooldown');
  });

  it('picks football_trick when seed is odd', () => {
    const plan = composeFootballPlan(catalog, { budgetMinutes: 60, seed: 3 });
    expect(plan[2].category).toBe('football_trick');
    expect(plan[2].slug).toBe('ft1');
  });

  it('picks a distinct second drill when seed is even (no duplicate slug)', () => {
    const plan = composeFootballPlan(catalog, { budgetMinutes: 60, seed: 2 });
    expect(plan).toHaveLength(5);
    expect(plan[1].category).toBe('football_drill');
    expect(plan[2].category).toBe('football_drill');
    expect(plan[1].slug).not.toBe(plan[2].slug);
    const slugs = plan.map(p => p.slug);
    expect(new Set(slugs).size).toBe(5);
  });
});
