import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { composeGoalkeeperPlan } from '../goalkeeper-composition';
import type { ExerciseCandidate } from '../plan-generator';

const catalog: ExerciseCandidate[] = [
  { slug: 'gk1', category: 'football_goalkeeper', difficulty: 'low', name: 'Handling', duration_minutes: 5, equipment: ['ball'] },
  { slug: 'gk2', category: 'football_goalkeeper', difficulty: 'mid', name: 'Low dive', duration_minutes: 8, equipment: ['ball'] },
  { slug: 'gk3', category: 'football_goalkeeper', difficulty: 'mid', name: 'Shot stop', duration_minutes: 8, equipment: ['ball'] },
  { slug: 'gk4', category: 'football_goalkeeper', difficulty: 'low', name: 'Distribution', duration_minutes: 6, equipment: ['ball'] },
  { slug: 'gk5', category: 'football_goalkeeper', difficulty: 'high', name: 'Reflex', duration_minutes: 6, equipment: ['ball'] },
  { slug: 'fw1', category: 'football_warmup', difficulty: 'low', name: 'Warmup', duration_minutes: 4, equipment: [] },
  { slug: 'fg1', category: 'football_game', difficulty: 'mid', name: 'Keeper game', duration_minutes: 12, equipment: ['ball'] },
  { slug: 'cd1', category: 'cooldown', difficulty: 'low', name: 'Cooldown', duration_minutes: 3, equipment: [] },
];

describe('composeGoalkeeperPlan', () => {
  it('returns goalkeeper-centric items ending in cooldown', () => {
    const plan = composeGoalkeeperPlan(catalog, { budgetMinutes: 60, seed: 1 });
    expect(plan.length).toBeGreaterThanOrEqual(4);
    // first 3 slots should be goalkeeper exercises when GK pool is deep
    expect(plan[0].category).toBe('football_goalkeeper');
    expect(plan[1].category).toBe('football_goalkeeper');
    expect(plan[2].category).toBe('football_goalkeeper');
    expect(plan[plan.length - 1].category).toBe('cooldown');
  });

  it('picks distinct slugs (no duplicate goalkeeper exercise)', () => {
    const plan = composeGoalkeeperPlan(catalog, { budgetMinutes: 60, seed: 2 });
    const slugs = plan.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('falls back to football_warmup for slot 1 when no GK warmup-suitable left, and football_game for slot 4 when GK pool thin', () => {
    const thin: ExerciseCandidate[] = [
      { slug: 'gk1', category: 'football_goalkeeper', difficulty: 'low', name: 'Handling', duration_minutes: 5, equipment: ['ball'] },
      { slug: 'fw1', category: 'football_warmup', difficulty: 'low', name: 'Warmup', duration_minutes: 4, equipment: [] },
      { slug: 'fg1', category: 'football_game', difficulty: 'mid', name: 'Keeper game', duration_minutes: 12, equipment: ['ball'] },
      { slug: 'cd1', category: 'cooldown', difficulty: 'low', name: 'Cooldown', duration_minutes: 3, equipment: [] },
    ];
    const plan = composeGoalkeeperPlan(thin, { budgetMinutes: 60, seed: 1 });
    // gk1 used for slot1, then football_game fills slot4, cooldown closes
    expect(plan.some((p) => p.category === 'football_goalkeeper')).toBe(true);
    expect(plan[plan.length - 1].category).toBe('cooldown');
    const slugs = plan.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('trims to a tight time budget but keeps opener + cooldown', () => {
    const plan = composeGoalkeeperPlan(catalog, { budgetMinutes: 12, seed: 1 });
    const total = plan.reduce((sum, ex) => sum + ex.duration_minutes, 0);
    expect(total).toBeLessThanOrEqual(12);
    expect(plan.length).toBeGreaterThanOrEqual(2);
    expect(plan[plan.length - 1].category).toBe('cooldown');
  });
});
