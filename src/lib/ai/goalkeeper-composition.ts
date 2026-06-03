import 'server-only';
import type { ExerciseCandidate } from './plan-generator';

type Options = {
  budgetMinutes: number;
  seed?: number;
};

/**
 * Goalkeeper-aware composition. Targets 5 items in canonical order:
 *   1. football_goalkeeper (warmup/handling) - or football_warmup fallback
 *   2. football_goalkeeper (a distinct GK exercise - handling/footwork)
 *   3. football_goalkeeper (a distinct GK exercise - diving/shot-stopping)
 *   4. football_goalkeeper (a distinct GK exercise - distribution) - or
 *      football_game fallback (a keeper challenge)
 *   5. cooldown
 *
 * Picks distinct GK slugs for slots 1-4 (no duplicate, the bug we hit on the
 * outfield track). Falls back to generic warmup/game/cooldown when the GK
 * catalogue is thin. Trims middle items to the time budget, always keeping
 * the opener and the cooldown.
 */
export function composeGoalkeeperPlan(
  catalogue: ExerciseCandidate[],
  options: Options,
): ExerciseCandidate[] {
  const { budgetMinutes, seed = Date.now() } = options;

  const gk = catalogue.filter((ex) => ex.category === 'football_goalkeeper');
  const used = new Set<string>();

  // Pick the i-th distinct GK exercise (seeded rotation), excluding already
  // chosen slugs. Returns null when the GK pool is exhausted.
  const pickGk = (offset: number): ExerciseCandidate | null => {
    const available = gk.filter((ex) => !used.has(ex.slug));
    if (available.length === 0) return null;
    const choice = available[(seed + offset) % available.length];
    used.add(choice.slug);
    return choice;
  };

  const pickGeneric = (category: string): ExerciseCandidate | null => {
    const list = catalogue.filter((ex) => ex.category === category && !used.has(ex.slug));
    if (list.length === 0) return null;
    const choice = list[seed % list.length];
    used.add(choice.slug);
    return choice;
  };

  const slot1 = pickGk(0) ?? pickGeneric('football_warmup') ?? pickGeneric('warmup');
  const slot2 = pickGk(1);
  const slot3 = pickGk(2);
  const slot4 = pickGk(3) ?? pickGeneric('football_game');
  const cooldown = pickGeneric('cooldown');

  const items = [slot1, slot2, slot3, slot4, cooldown].filter(
    (x): x is ExerciseCandidate => x !== null,
  );

  // Trim middle items (slot3, then slot2, then slot4) to fit the budget,
  // always keeping the opener and cooldown.
  let total = items.reduce((sum, ex) => sum + ex.duration_minutes, 0);
  const dropCandidates = [slot3, slot2, slot4];
  for (const candidate of dropCandidates) {
    if (total <= budgetMinutes) break;
    if (!candidate) continue;
    const idx = items.indexOf(candidate);
    if (idx !== -1) {
      total -= candidate.duration_minutes;
      items.splice(idx, 1);
    }
  }

  return items;
}
