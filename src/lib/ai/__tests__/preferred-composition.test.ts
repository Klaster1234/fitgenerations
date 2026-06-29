import { describe, it, expect, vi } from 'vitest';

// `preferred-composition.ts` imports `server-only`, which throws outside a
// Next.js server bundle. Vitest doesn't run Next's compiler, so stub it.
vi.mock('server-only', () => ({}));

import { resolvePreferredSelection } from '../preferred-composition';
import type { ExerciseCandidate } from '../plan-generator';

const ex = (
  slug: string,
  category: string,
  duration_minutes: number,
): ExerciseCandidate => ({
  slug,
  category,
  difficulty: 'mid',
  name: slug,
  duration_minutes,
  equipment: ['ball'],
});

const catalogue: ExerciseCandidate[] = [
  ex('fw1', 'football_warmup', 5),
  ex('fw2', 'football_warmup', 5),
  ex('fd1', 'football_drill', 10),
  ex('fd2', 'football_drill', 10),
  ex('fd3', 'football_drill', 10),
  ex('fdlong', 'football_drill', 30),
  ex('fg1', 'football_game', 15),
  ex('fg2', 'football_game', 15),
  ex('cd1', 'cooldown', 3),
];

// Canonical 5-item baseline: warmup -> drill -> drill -> game -> cooldown (43').
const baseline: ExerciseCandidate[] = [
  ex('fw1', 'football_warmup', 5),
  ex('fd1', 'football_drill', 10),
  ex('fd2', 'football_drill', 10),
  ex('fg1', 'football_game', 15),
  ex('cd1', 'cooldown', 3),
];

describe('resolvePreferredSelection', () => {
  it('applies a valid within-category swap', () => {
    const slugs = ['fw1', 'fd3', 'fd2', 'fg1', 'cd1']; // swap drill1 -> fd3
    const out = resolvePreferredSelection({ baseline, slugs, catalogue, budgetMinutes: 60 });
    expect(out.map((o) => o.slug)).toEqual(['fw1', 'fd3', 'fd2', 'fg1', 'cd1']);
    // categories and order preserved
    expect(out.map((o) => o.category)).toEqual(baseline.map((b) => b.category));
  });

  it('keeps the baseline item when the model picks an unknown slug', () => {
    const slugs = ['fw1', 'zzz', 'fd2', 'fg1', 'cd1'];
    const out = resolvePreferredSelection({ baseline, slugs, catalogue, budgetMinutes: 60 });
    expect(out[1].slug).toBe('fd1'); // fell back to baseline
  });

  it('rejects a cross-category pick (option from a different slot)', () => {
    // football_game slug offered for the warmup slot -> not a warmup option.
    const slugs = ['fg1', 'fd1', 'fd2', 'fg1', 'cd1'];
    const out = resolvePreferredSelection({ baseline, slugs, catalogue, budgetMinutes: 60 });
    expect(out[0].slug).toBe('fw1'); // kept the warmup baseline
    expect(out[0].category).toBe('football_warmup');
  });

  it('returns the baseline unchanged on a length mismatch', () => {
    const out = resolvePreferredSelection({ baseline, slugs: ['fw1', 'fd1'], catalogue, budgetMinutes: 60 });
    expect(out).toBe(baseline);
  });

  it('never produces duplicate slugs (per-slot fallback resolves a collision)', () => {
    const slugs = ['fw1', 'fd2', 'fd2', 'fg1', 'cd1']; // both drills -> fd2
    const out = resolvePreferredSelection({ baseline, slugs, catalogue, budgetMinutes: 60 });
    const outSlugs = out.map((o) => o.slug);
    expect(new Set(outSlugs).size).toBe(out.length);
    expect(out).toHaveLength(5);
    // first drill honored the swap, second resolved to a distinct drill
    expect(out[1].slug).toBe('fd2');
    expect(out[2].category).toBe('football_drill');
    expect(out[2].slug).not.toBe('fd2');
  });

  it('bails to the baseline when a swap would exceed the time budget', () => {
    const slugs = ['fw1', 'fdlong', 'fd2', 'fg1', 'cd1']; // 30' drill -> total 63'
    const out = resolvePreferredSelection({ baseline, slugs, catalogue, budgetMinutes: 50 });
    expect(out).toBe(baseline);
  });
});
