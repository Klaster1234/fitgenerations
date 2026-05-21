import { describe, it, expect, beforeEach, vi } from 'vitest';

// `badges.ts` imports `server-only`, which throws when loaded outside a
// Next.js server bundle. Vitest doesn't go through Next's compiler, so we
// stub the module to a no-op before importing the file under test.
vi.mock('server-only', () => ({}));

// We also stub the supabase factory used by both `badges.ts` and `streak.ts`.
// The factory returns a thenable fluent builder, so we hand back hand-rolled
// fakes whose `.select()` / `.eq()` / etc. resolve to the rows we want each
// test to see.
type ChainResult = { data: unknown; count?: number; error?: unknown };

function makeFromHandler(tableResults: Record<string, ChainResult>) {
  return (table: string) => {
    const result = tableResults[table] ?? { data: [] };
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      gte: vi.fn(() => chain),
      order: vi.fn(() => Promise.resolve(result)),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      then: (resolve: (v: ChainResult) => unknown) => resolve(result),
    };
    return chain;
  };
}

let supabaseFromMock: ReturnType<typeof makeFromHandler> = makeFromHandler({});

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({
    from: (table: string) => supabaseFromMock(table),
  }),
}));

// The `getStreak` / `getTotalLogs` helpers used by `checkAndAwardBadges`
// live in the same `lib/db` folder. Mocking them keeps this test focused
// on the criteria matrix only - `streak.test.ts` covers them directly.
vi.mock('@/lib/db/streak', () => ({
  getStreak: vi.fn(),
  getTotalLogs: vi.fn(),
}));

import { checkAndAwardBadges } from '../badges';
import { getStreak, getTotalLogs } from '../streak';

const USER_ID = 'user-1';

const BADGES = {
  streak3: { id: 'b-streak-3', slug: 'streak-3', criteria: { type: 'streak', min: 3 } },
  streak7: { id: 'b-streak-7', slug: 'streak-7', criteria: { type: 'streak', min: 7 } },
  logs10: { id: 'b-logs-10', slug: 'logs-10', criteria: { type: 'logs_count', min: 10 } },
  diverse3: {
    id: 'b-diverse-3',
    slug: 'diverse-3',
    criteria: { type: 'diverse_categories', min: 3 },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkAndAwardBadges criteria matrix', () => {
  it('awards a streak badge once the threshold is met (but not the higher one)', async () => {
    vi.mocked(getStreak).mockResolvedValue(5);
    vi.mocked(getTotalLogs).mockResolvedValue(0);

    supabaseFromMock = makeFromHandler({
      badges: { data: [BADGES.streak3, BADGES.streak7] },
      user_badges: { data: [] },
      activity_logs: { data: [] },
    });

    const earned = await checkAndAwardBadges(USER_ID);
    expect(earned).toEqual(['streak-3']);
  });

  it('awards a logs_count badge once total logs >= threshold', async () => {
    vi.mocked(getStreak).mockResolvedValue(0);
    vi.mocked(getTotalLogs).mockResolvedValue(10);

    supabaseFromMock = makeFromHandler({
      badges: { data: [BADGES.logs10] },
      user_badges: { data: [] },
      activity_logs: { data: [] },
    });

    const earned = await checkAndAwardBadges(USER_ID);
    expect(earned).toEqual(['logs-10']);
  });

  it('awards a diverse_categories badge when distinct exercise categories meet threshold', async () => {
    vi.mocked(getStreak).mockResolvedValue(0);
    vi.mocked(getTotalLogs).mockResolvedValue(0);

    // 3 distinct categories across 4 logs -> meets `min: 3`.
    supabaseFromMock = makeFromHandler({
      badges: { data: [BADGES.diverse3] },
      user_badges: { data: [] },
      activity_logs: {
        data: [
          { exercises: { category: 'strength' } },
          { exercises: { category: 'mobility' } },
          { exercises: { category: 'cardio' } },
          { exercises: { category: 'strength' } },
        ],
      },
    });

    const earned = await checkAndAwardBadges(USER_ID);
    expect(earned).toEqual(['diverse-3']);
  });

  it('skips badges the user already owns', async () => {
    vi.mocked(getStreak).mockResolvedValue(10);
    vi.mocked(getTotalLogs).mockResolvedValue(0);

    supabaseFromMock = makeFromHandler({
      badges: { data: [BADGES.streak3, BADGES.streak7] },
      user_badges: { data: [{ badge_id: BADGES.streak3.id }] },
      activity_logs: { data: [] },
    });

    const earned = await checkAndAwardBadges(USER_ID);
    expect(earned).toEqual(['streak-7']);
  });
});
