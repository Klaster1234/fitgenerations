import 'server-only';
import type { ExerciseCandidate } from './plan-generator';

type Options = {
  budgetMinutes: number;
  seed?: number;
};

/**
 * Football-aware composition. Targets 5 items in canonical order:
 *   1. football_warmup (or generic warmup as fallback)
 *   2. football_drill
 *   3. football_drill OR football_trick (50/50, seeded)
 *   4. football_game
 *   5. cooldown
 *
 * Trims items from the middle (drill #2, then drill #1) if total duration
 * exceeds the user's time budget. Always preserves warmup + cooldown so a
 * very short session still has a proper opening and closing.
 */
export function composeFootballPlan(
  catalogue: ExerciseCandidate[],
  options: Options,
): ExerciseCandidate[] {
  const { budgetMinutes, seed = Date.now() } = options;

  const pick = (category: string, fallback?: string): ExerciseCandidate | null => {
    const matching = catalogue.filter((ex) => ex.category === category);
    if (matching.length > 0) return matching[seed % matching.length];
    if (fallback) {
      const fb = catalogue.filter((ex) => ex.category === fallback);
      if (fb.length > 0) return fb[seed % fb.length];
    }
    return null;
  };

  const warmup = pick('football_warmup', 'warmup');
  const drill1 = pick('football_drill');
  const drillOrTrick = seed % 2 === 0 ? pick('football_drill') : pick('football_trick');
  const game = pick('football_game');
  const cooldown = pick('cooldown');

  const items = [warmup, drill1, drillOrTrick, game, cooldown].filter(
    (x): x is ExerciseCandidate => x !== null,
  );

  // Trim middle items to fit time budget. Drop order by reference (not index):
  // drillOrTrick, then drill1, then game. Always keep warmup + cooldown so a
  // very short session still has a proper opening and closing.
  let total = items.reduce((sum, ex) => sum + ex.duration_minutes, 0);
  const dropOrder = [drillOrTrick, drill1, game];
  for (const candidate of dropOrder) {
    if (total <= budgetMinutes) break;
    if (!candidate) continue;
    const idx = items.indexOf(candidate);
    if (idx >= 0) {
      total -= items[idx].duration_minutes;
      items.splice(idx, 1);
    }
  }

  return items;
}
