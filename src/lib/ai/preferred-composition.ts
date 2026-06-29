import 'server-only';
import Groq from 'groq-sdk';
import { z } from 'zod';
import type { ExerciseCandidate, Profile } from './plan-generator';

// Same model as the plan generator so we share Groq's prompt cache warmth and
// don't introduce a second model dependency.
const MODEL_ID = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

// System prompt is constant (cache-friendly). The per-request slots + the
// user's written preference go in the user message.
const SYSTEM_PROMPT = `You tailor a football training session to a user's written preference.

You are given an ordered list of slots. Each slot has a category, the currently chosen exercise (current_slug) and a closed list of options (all of the SAME category). For every slot, return exactly one slug chosen FROM THAT SLOT'S OWN options.

Rules:
1. Return exactly one slug per slot, in the same order. Never add, drop or reorder slots.
2. Pick ONLY from the given slot's options. Never invent a slug and never use an option from a different slot.
3. Change a pick only when an option clearly fits the preference better than current_slug; otherwise return current_slug unchanged.
4. Treat injuries or body areas to spare as the strongest signal (avoid exercises that load them); likes/dislikes and focus areas come next.
5. Keep the picks distinct - do not choose the same slug for two slots.

Respond with JSON only: {"slugs": ["...", "..."]}. No prose.`;

const selectionSchema = z.object({
  slugs: z.array(z.string()).min(1).max(7),
});

/**
 * Deterministic, pure resolution of the model's per-slot slug choices against
 * the structurally-guaranteed `baseline` (output of composeFootballPlan /
 * composeGoalkeeperPlan). Exported for unit testing.
 *
 * Guarantees, regardless of what the model returned:
 *  - same number of items as the baseline,
 *  - every item is the SAME category as its baseline slot (only within-category
 *    swaps are allowed - the model can never restructure the session),
 *  - all slugs distinct,
 *  - total duration stays within the baseline's time budget.
 * Any violation falls back to the baseline item for that slot; a swap that would
 * break distinctness or the budget makes the whole function return the baseline
 * untouched. This is what preserves the "football users always get a real,
 * well-formed football session" guarantee even when the model misbehaves.
 */
export function resolvePreferredSelection(args: {
  baseline: ExerciseCandidate[];
  slugs: string[];
  catalogue: ExerciseCandidate[];
  budgetMinutes: number;
}): ExerciseCandidate[] {
  const { baseline, slugs, catalogue, budgetMinutes } = args;
  if (slugs.length !== baseline.length || baseline.length === 0) return baseline;

  // Option pools per category, restricted to the categories the baseline uses
  // so a swap can only ever be like-for-like.
  const usedCategories = new Set(baseline.map((b) => b.category));
  const byCategory = new Map<string, ExerciseCandidate[]>();
  for (const ex of catalogue) {
    if (!usedCategories.has(ex.category)) continue;
    const arr = byCategory.get(ex.category) ?? [];
    arr.push(ex);
    byCategory.set(ex.category, arr);
  }

  const used = new Set<string>();
  const result = baseline.map((slot, i) => {
    const options = byCategory.get(slot.category) ?? [];
    const picked = options.find((o) => o.slug === slugs[i]);
    // Accept the model's pick only if it's a real option for THIS slot and not
    // already taken by an earlier slot.
    if (picked && !used.has(picked.slug)) {
      used.add(picked.slug);
      return picked;
    }
    // Fallback order: the baseline pick (if still free), else any unused
    // same-category option, else the baseline pick (accept a rare collision -
    // the distinctness guard below will catch it and bail to baseline).
    if (!used.has(slot.slug)) {
      used.add(slot.slug);
      return slot;
    }
    const free = options.find((o) => !used.has(o.slug));
    if (free) {
      used.add(free.slug);
      return free;
    }
    return slot;
  });

  // Belt-and-braces: distinctness + budget. Bail to the (already valid) baseline
  // on any violation rather than serve a malformed or over-long plan.
  const resultSlugs = result.map((r) => r.slug);
  if (new Set(resultSlugs).size !== resultSlugs.length) return baseline;
  const total = result.reduce((sum, e) => sum + e.duration_minutes, 0);
  if (total > budgetMinutes) return baseline;
  return result;
}

/**
 * Preference-aware refinement of a football/goalkeeper plan. When the user has
 * written free-text training_preferences, asks the model to swap baseline items
 * for better-fitting exercises OF THE SAME CATEGORY, then resolves the answer
 * deterministically (see resolvePreferredSelection). Returns the baseline
 * unchanged when there are no preferences, the catalogue is thin, the API key
 * is missing, or anything fails - so it is always safe to call.
 */
export async function refinePlanWithPreferences(args: {
  baseline: ExerciseCandidate[];
  catalogue: ExerciseCandidate[];
  profile: Profile;
  budgetMinutes: number;
}): Promise<ExerciseCandidate[]> {
  const { baseline, catalogue, profile, budgetMinutes } = args;
  const prefs = profile.training_preferences?.trim();
  if (!prefs || baseline.length === 0 || !process.env.GROQ_API_KEY) return baseline;

  const usedCategories = new Set(baseline.map((b) => b.category));
  const optionsByCategory = new Map<string, ExerciseCandidate[]>();
  for (const ex of catalogue) {
    if (!usedCategories.has(ex.category)) continue;
    const arr = optionsByCategory.get(ex.category) ?? [];
    arr.push(ex);
    optionsByCategory.set(ex.category, arr);
  }

  // Nothing to swap if every used category has a single option.
  const hasChoice = baseline.some(
    (b) => (optionsByCategory.get(b.category)?.length ?? 0) > 1,
  );
  if (!hasChoice) return baseline;

  const payload = {
    user_preferences: prefs,
    slots: baseline.map((b) => ({
      category: b.category,
      current_slug: b.slug,
      options: (optionsByCategory.get(b.category) ?? []).map((o) => ({
        slug: o.slug,
        name: o.name,
        duration_minutes: o.duration_minutes,
      })),
    })),
  };

  try {
    const client = new Groq();
    const response = await client.chat.completions.create({
      model: MODEL_ID,
      max_tokens: 500,
      // Low temperature: this is a faithful selection task, not a creative one.
      temperature: 0.2,
      reasoning_effort: 'low',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'slot_selection',
          description: 'One chosen slug per slot, in order.',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              slugs: { type: 'array', items: { type: 'string' } },
            },
            required: ['slugs'],
          },
          strict: true,
        },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Choose one slug per slot. Respond with JSON {"slugs":[...]} only.\n\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return baseline;
    const parsed = selectionSchema.safeParse(JSON.parse(text));
    if (!parsed.success) return baseline;

    return resolvePreferredSelection({
      baseline,
      slugs: parsed.data.slugs,
      catalogue,
      budgetMinutes,
    });
  } catch (err) {
    console.error('[preferred-composition] refine failed, using baseline', err);
    return baseline;
  }
}
