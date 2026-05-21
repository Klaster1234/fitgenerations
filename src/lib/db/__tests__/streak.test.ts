import { describe, it, expect, beforeEach, vi } from 'vitest';

// `streak.ts` imports `server-only` (Next-server-only marker) - stub it so
// the module can be required from a vitest run.
vi.mock('server-only', () => ({}));

// Controlled supabase fake: `from('activity_logs').select(...).eq(...).gte(...).order(...)`
// resolves to whatever rows the test sets.
let activityRows: { log_date: string }[] = [];
let activityError: unknown = null;

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    from: () => {
      const chain = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        order: vi.fn(() => Promise.resolve({ data: activityRows, error: activityError })),
      };
      return chain;
    },
  }),
}));

import { getStreak } from '../streak';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

beforeEach(() => {
  activityRows = [];
  activityError = null;
});

describe('getStreak', () => {
  it('returns the count of consecutive days when there is no gap', async () => {
    // Today + yesterday + day-before -> 3-day streak.
    activityRows = [{ log_date: daysAgo(0) }, { log_date: daysAgo(1) }, { log_date: daysAgo(2) }];

    const streak = await getStreak('user-1');
    expect(streak).toBe(3);
  });

  it('breaks the streak at the first gap', async () => {
    // Today + day-before-yesterday (gap at "yesterday") -> streak of 1.
    activityRows = [{ log_date: daysAgo(0) }, { log_date: daysAgo(2) }];

    const streak = await getStreak('user-1');
    expect(streak).toBe(1);
  });

  it('still counts the streak when the user has not logged today yet (yesterday valid)', async () => {
    // No log for today, but yesterday + day-before -> 2-day streak preserved.
    activityRows = [{ log_date: daysAgo(1) }, { log_date: daysAgo(2) }];

    const streak = await getStreak('user-1');
    expect(streak).toBe(2);
  });

  it('returns 0 when there is no log today and no log yesterday', async () => {
    activityRows = [{ log_date: daysAgo(3) }];

    const streak = await getStreak('user-1');
    expect(streak).toBe(0);
  });

  it('returns 0 when there are no logs at all', async () => {
    activityRows = [];

    const streak = await getStreak('user-1');
    expect(streak).toBe(0);
  });
});
