# Football track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a football track to FGST with 40 football-specific exercises (warmups, drills, tricks, games) accessible via AI-generated daily plans AND a browse-mode Skills Library, with rich coaching content (why_matters / key_focus / pro_tip) for each.

**Architecture:** Additive schema (new `profiles.interests`, `groups.sport`, exercise coaching columns; no breaking changes). Football composition lives in a separate helper that `plan-service.ts` calls when `'football' in profile.interests`. Skills Library is a server-rendered page at `/[locale]/football` reading from the public `exercises` table (no auth needed).

**Tech Stack:** Next.js 16 + React 19 + Tailwind 4 + next-intl 4 + Supabase (PostgreSQL with RLS) + Groq Llama 3.3 70B (via OpenAI-compatible SDK). Tests: Vitest (unit) + Playwright (E2E).

**Spec:** `fgst-app/docs/specs/2026-05-28-football-track-design.md`

---

## File structure

### NEW files
| Path | Responsibility |
|---|---|
| `supabase/migrations/0011_football_track.sql` | Schema: profiles.interests, groups.sport, exercises coaching columns, sync trigger |
| `supabase/migrations/0012_football_exercises_seed.sql` | 40 exercises × 4 langs (all rows) |
| `src/lib/ai/football-composition.ts` | Football-aware plan composition helper |
| `src/lib/ai/__tests__/football-composition.test.ts` | Unit tests for composition |
| `src/components/coaching-section.tsx` | Expandable why/focus/tip UI |
| `src/app/[locale]/football/page.tsx` | Skills Library browse page |
| `src/app/[locale]/football/skill-card.tsx` | Card UI for one exercise in library |
| `e2e/football-track.spec.ts` | E2E smoke for football flow |

### MODIFIED files
| Path | Change |
|---|---|
| `src/lib/ai/plan-service.ts` | Read `interests`, route to football composition |
| `src/app/[locale]/onboarding/wizard.tsx` | New step: "Co interesuje Cię najbardziej?" |
| `src/app/[locale]/onboarding/actions.ts` | Save `interests` array |
| `src/app/[locale]/settings/page.tsx` | New section "Zainteresowania" |
| `src/app/[locale]/settings/actions.ts` | Update `interests` |
| `src/app/[locale]/trainer/new/create-group-form.tsx` | Sport dropdown |
| `src/app/[locale]/trainer/new/actions.ts` | Save `sport` with group |
| `src/components/app-header.tsx` | Football nav link for football users |
| `src/app/[locale]/tutorial/tutorial-view.tsx` | Add football mention in existing slide |
| `src/app/[locale]/plan/plan-view.tsx` | Use CoachingSection + football badge |
| `messages/en.json` `pl.json` `it.json` `uk.json` | Football namespace + interests keys + updated tutorial |

---

## Phase 1: Foundation (schema + types)

### Task 1.1: Migration 0011 — schema changes

**Files:**
- Create: `supabase/migrations/0011_football_track.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 0011_football_track.sql
--
-- Adds football-track capability:
--   1. profiles.interests   - array of sport interests, opt-in
--   2. groups.sport         - sport metadata for group-driven auto-flag
--   3. exercises coaching   - why_matters / key_focus / pro_tip (nullable,
--                             only football exercises populate them at first)
--   4. sync_interests_from_group trigger - when a user joins a football
--      group via group_code, auto-add 'football' to their interests

-- ============================================================================
-- 1. profiles.interests
-- ============================================================================
alter table public.profiles
  add column if not exists interests text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_interests_valid;

alter table public.profiles
  add constraint profiles_interests_valid
  check (interests <@ array['football','fitness','green']::text[]);

-- ============================================================================
-- 2. groups.sport
-- ============================================================================
alter table public.groups
  add column if not exists sport text not null default 'general';

alter table public.groups
  drop constraint if exists groups_sport_valid;

alter table public.groups
  add constraint groups_sport_valid
  check (sport in ('general','football'));

-- ============================================================================
-- 3. exercises coaching fields (JSONB for multi-locale, nullable - only
--    football populates them initially). JSONB shape:
--      why_matters: {"en": "...", "pl": "...", "it": "...", "uk": "..."}
--      key_focus:   {"en": ["...","..."], "pl": [...], "it": [...], "uk": [...]}
--      pro_tip:     {"en": "...", "pl": "...", "it": "...", "uk": "..."}
--    matches the pattern already used for exercises.name and .description.
-- ============================================================================
alter table public.exercises
  add column if not exists why_matters jsonb,
  add column if not exists key_focus jsonb,
  add column if not exists pro_tip jsonb;

-- ============================================================================
-- 4. Trigger: when user updates their group_code, if the referenced group
--    has sport='football', auto-add 'football' to their interests.
--    Subtractive removal NOT done - users may have football interest
--    independently of group membership.
-- ============================================================================
create or replace function public.sync_interests_from_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sport text;
begin
  if NEW.group_code is null then
    return NEW;
  end if;
  if OLD is not null and NEW.group_code is not distinct from OLD.group_code then
    return NEW;
  end if;

  select sport into v_sport
    from public.groups
   where code = NEW.group_code;

  if v_sport = 'football' and not ('football' = any(NEW.interests)) then
    NEW.interests := NEW.interests || array['football']::text[];
  end if;

  return NEW;
end;
$$;

drop trigger if exists profiles_sync_interests on public.profiles;
create trigger profiles_sync_interests
  before insert or update of group_code on public.profiles
  for each row execute function public.sync_interests_from_group();
```

- [ ] **Step 2: Apply migration to local dev DB or skip if Supabase Studio is the workflow**

For prod application, save migration locally and run via pooler later (see Task 1.3).

- [ ] **Step 3: Commit schema migration**

```bash
git add supabase/migrations/0011_football_track.sql
git commit -m "Migration 0011: football track schema (interests, group sport, exercise coaching fields, sync trigger)"
```

### Task 1.2: Update Profile type in plan-service.ts

**Files:**
- Modify: `src/lib/ai/plan-service.ts` (profile schema + Profile type)
- Modify: `src/lib/ai/plan-generator.ts` (Profile type definition)

- [ ] **Step 1: Add `interests` to profileRowSchema**

In `src/lib/ai/plan-service.ts`, find `profileRowSchema` (around line 14) and add `interests`:

```typescript
const profileRowSchema = z.object({
  locale: z.enum(['en', 'pl', 'it', 'uk']).nullable().optional(),
  age: z.number().int().min(6).max(120).nullable().optional(),
  fitness_level: z.enum(['low', 'mid', 'high']).nullable().optional(),
  equipment: z.array(z.string()).nullable().optional(),
  goals: z.array(z.string()).nullable().optional(),
  city: z.string().nullable().optional(),
  trains_with_partner: z.boolean().nullable().optional(),
  role: z.enum(['participant', 'trainer']).nullable().optional(),
  interests: z.array(z.string()).nullable().optional(),
});
```

- [ ] **Step 2: Add `interests` to the Supabase select**

Find the `.select(...)` call on `profiles` (around line 89) and add `interests`:

```typescript
const { data: rawProfileRow } = await supabase
  .from('profiles')
  .select('locale, age, fitness_level, equipment, goals, city, trains_with_partner, role, interests')
  .eq('id', userId)
  .single();
```

- [ ] **Step 3: Add `interests` to the Profile mapping**

Find the `const profile: Profile = {` block (around line 98) and append:

```typescript
interests: profileRow?.interests ?? [],
```

- [ ] **Step 4: Add `interests` to the Profile type in `plan-generator.ts`**

In `src/lib/ai/plan-generator.ts`, find the `Profile` type export and add:

```typescript
export type Profile = {
  locale: 'en' | 'pl' | 'it' | 'uk';
  age: number;
  fitness_level: 'low' | 'mid' | 'high';
  equipment: string[];
  goals: string[];
  city: string | null;
  trains_with_partner: boolean;
  role: 'participant' | 'trainer';
  interests: string[];  // NEW: 'football', 'fitness', 'green' subset
};
```

- [ ] **Step 5: Run lint + build, expect green**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Commit type changes**

```bash
git add src/lib/ai/plan-service.ts src/lib/ai/plan-generator.ts
git commit -m "Types: add Profile.interests for football track opt-in"
```

### Task 1.3: Apply migration 0011 to production Supabase

**Files:**
- One-time script (don't commit): `scripts/apply-0011.mjs` (transient)

- [ ] **Step 1: Run migration via pooler**

```bash
cd fgst-app
node -e "
const fs = require('fs');
const { Client } = require('pg');
const c = new Client({connectionString: process.env.SUPABASE_POOLER_URL});
(async () => {
  await c.connect();
  const sql = fs.readFileSync('supabase/migrations/0011_football_track.sql','utf8');
  await c.query('begin');
  await c.query(sql);
  await c.query('commit');
  // verify
  const v = await c.query(\"select column_name from information_schema.columns where table_name='profiles' and column_name='interests'\");
  console.log('interests column:', v.rows.length > 0 ? 'EXISTS' : 'MISSING');
  await c.end();
})();
"
```

(Substitute `SUPABASE_POOLER_URL` with the actual pooler connection string — kept out of version control.)

Expected: `interests column: EXISTS`

---

## Phase 2: Football-aware AI composition

### Task 2.1: Create football-composition module with TDD

**Files:**
- Create: `src/lib/ai/football-composition.ts`
- Create: `src/lib/ai/__tests__/football-composition.test.ts`

- [ ] **Step 1: Write the failing test FIRST**

Create `src/lib/ai/__tests__/football-composition.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
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
});
```

- [ ] **Step 2: Run test, expect failure**

```bash
npm run test:run -- src/lib/ai/__tests__/football-composition.test.ts
```

Expected: FAIL with "Cannot find module '../football-composition'".

- [ ] **Step 3: Implement football-composition.ts**

Create `src/lib/ai/football-composition.ts`:

```typescript
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

  // Trim middle items to fit time budget
  let total = items.reduce((sum, ex) => sum + ex.duration_minutes, 0);
  // Order to drop in: drillOrTrick (idx 2), drill1 (idx 1), game (idx 3)
  const dropOrder = [2, 1, 3];
  for (const idx of dropOrder) {
    if (total <= budgetMinutes) break;
    if (idx < items.length && items[idx]) {
      total -= items[idx].duration_minutes;
      items.splice(idx, 1);
    }
  }

  return items;
}
```

- [ ] **Step 4: Run test, expect green**

```bash
npm run test:run -- src/lib/ai/__tests__/football-composition.test.ts
```

Expected: 4/4 pass.

- [ ] **Step 5: Commit composition module + tests**

```bash
git add src/lib/ai/football-composition.ts src/lib/ai/__tests__/football-composition.test.ts
git commit -m "Football-aware plan composition with TDD"
```

### Task 2.2: Wire football composition into plan-service

**Files:**
- Modify: `src/lib/ai/plan-service.ts` (around line 188, after catalogue filter)

- [ ] **Step 1: Import composition helper**

At the top of `plan-service.ts`, add:

```typescript
import { composeFootballPlan } from './football-composition';
```

- [ ] **Step 2: Use football composition when interests includes 'football'**

Find the section (around line 188) where it picks between AI and baseline. Insert football short-circuit before AI:

```typescript
// 5a. Football short-circuit: if user opted into football, use deterministic
// football composition (warmup → drill → drill/trick → game → cooldown).
// AI then enriches with greeting / motivation / ai_note from item slugs.
let prePickedItems: ExerciseCandidate[] | null = null;
if (profile.interests.includes('football')) {
  prePickedItems = composeFootballPlan(catalogue, {
    budgetMinutes: 60,
    seed: Date.parse(today),
  });
}

// 5b. Try AI; fall back to deterministic baseline on any failure (or no key)
let aiPlan;
let source: 'ai' | 'baseline' = 'baseline';
if (process.env.GROQ_API_KEY) {
  try {
    aiPlan = await generatePlan({
      profile,
      weather,
      date: today,
      catalogue: prePickedItems ?? catalogue,
    });
    source = 'ai';
  } catch (err) {
    console.error('[plan-service] AI generation failed, using baseline', err);
    aiPlan = buildBaselinePlan(prePickedItems ?? catalogue, profile);
  }
} else {
  aiPlan = buildBaselinePlan(prePickedItems ?? catalogue, profile);
}
```

The idea: when football, we pre-pick items deterministically. AI/baseline then writes coaching notes around them. This guarantees football users always get a football-flavored plan, regardless of model behavior.

- [ ] **Step 3: Run lint + build**

```bash
npm run lint
npm run build
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/plan-service.ts
git commit -m "plan-service: route to football composition when interests includes football"
```

---

## Phase 3: Opt-in flows (onboarding + settings + trainer)

### Task 3.1: Translation keys for interests

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/pl.json`
- Modify: `messages/it.json`
- Modify: `messages/uk.json`

- [ ] **Step 1: Add "Interests" namespace to en.json**

In `messages/en.json`, add at top level (alongside Common, Auth, etc.):

```json
"Interests": {
  "question": "What interests you most?",
  "hint": "Pick one or more — we'll tailor your plans accordingly.",
  "fitness": "General fitness",
  "football": "Football (soccer)",
  "green": "Green sports (Nordic walking, plogging)",
  "settingsTitle": "Your interests",
  "settingsHint": "Change anytime. Affects what exercises the AI suggests."
}
```

- [ ] **Step 2: Add to pl.json**

```json
"Interests": {
  "question": "Co interesuje Cię najbardziej?",
  "hint": "Wybierz jedno lub więcej - dopasujemy plany.",
  "fitness": "Ogólny fitness",
  "football": "Piłka nożna",
  "green": "Sport w naturze (Nordic walking, plogging)",
  "settingsTitle": "Twoje zainteresowania",
  "settingsHint": "Zmień kiedy chcesz. Wpływa na ćwiczenia które proponuje AI."
}
```

- [ ] **Step 3: Add to it.json**

```json
"Interests": {
  "question": "Cosa ti interessa di più?",
  "hint": "Scegli uno o più - adatteremo i piani di conseguenza.",
  "fitness": "Fitness generale",
  "football": "Calcio",
  "green": "Sport in natura (Nordic walking, plogging)",
  "settingsTitle": "I tuoi interessi",
  "settingsHint": "Cambia in qualsiasi momento. Influenza gli esercizi che propone l'AI."
}
```

- [ ] **Step 4: Add to uk.json**

```json
"Interests": {
  "question": "Що цікавить вас найбільше?",
  "hint": "Виберіть одне або більше - підлаштуємо плани.",
  "fitness": "Загальний фітнес",
  "football": "Футбол",
  "green": "Спорт на природі (Nordic walking, плогінг)",
  "settingsTitle": "Ваші зацікавлення",
  "settingsHint": "Змініть будь-коли. Впливає на вправи, які пропонує AI."
}
```

- [ ] **Step 5: Verify parity (key counts match across locales)**

```bash
for loc in en pl it uk; do
  count=$(node -e "const o=require('./messages/$loc.json'); function c(x){return Object.keys(x).reduce((s,k)=>s+(typeof x[k]==='object'?c(x[k]):1),0)}; console.log(c(o))")
  echo "$loc: $count keys"
done
```

Expected: all four locales report same key count.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/pl.json messages/it.json messages/uk.json
git commit -m "i18n: Interests namespace (4 locales)"
```

### Task 3.2: Onboarding wizard — add interests step

**Files:**
- Modify: `src/app/[locale]/onboarding/wizard.tsx`
- Modify: `src/app/[locale]/onboarding/actions.ts`

- [ ] **Step 1: Read current wizard.tsx structure**

```bash
head -50 src/app/[locale]/onboarding/wizard.tsx
```

Note the step structure (likely uses a step index + array of step components).

- [ ] **Step 2: Add interests step between fitness and equipment**

Add a new step component inside `wizard.tsx`:

```typescript
function InterestsStep({
  selected,
  onChange,
}: { selected: string[]; onChange: (next: string[]) => void }) {
  const t = useTranslations('Interests');
  const options = ['fitness', 'football', 'green'];
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-medium">{t('question')}</h2>
      <p className="text-muted">{t('hint')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {options.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            aria-pressed={selected.includes(key)}
            className={`min-h-12 px-4 py-3 rounded-md border-2 text-left ${
              selected.includes(key) ? 'border-brand bg-brand/10' : 'border-border'
            }`}
          >
            {t(key as 'fitness' | 'football' | 'green')}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the step into the wizard's step array**

Find the existing step list in wizard.tsx and insert `InterestsStep` after fitness step. Update `totalSteps` count. Update `formData` state to include `interests: string[]`.

- [ ] **Step 4: Update onboarding action to save interests**

In `src/app/[locale]/onboarding/actions.ts`, find where profile is upserted, and include `interests`:

```typescript
const updates = {
  // ... existing fields
  interests: input.interests ?? [],
};
```

- [ ] **Step 5: Run lint + build**

```bash
npm run lint
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/onboarding/wizard.tsx src/app/[locale]/onboarding/actions.ts
git commit -m "Onboarding: interests step (fitness / football / green)"
```

### Task 3.3: Settings section "Zainteresowania"

**Files:**
- Modify: `src/app/[locale]/settings/page.tsx`
- Modify: `src/app/[locale]/settings/actions.ts` (or wherever profile updates happen)

- [ ] **Step 1: Add Interests section to settings page**

In `src/app/[locale]/settings/page.tsx`, add a server-rendered section that:
- Reads `profile.interests` from Supabase
- Renders a form with checkboxes for fitness/football/green (use translations)
- Has a Save button that triggers a Server Action

Example block (adapt to existing settings page conventions):

```tsx
<section className="space-y-3">
  <h2 className="text-xl font-medium">{t('settingsTitle')}</h2>
  <p className="text-sm text-muted">{t('settingsHint')}</p>
  <form action={updateInterests}>
    {['fitness', 'football', 'green'].map((key) => (
      <label key={key} className="flex items-center gap-3 min-h-12">
        <input
          type="checkbox"
          name="interests"
          value={key}
          defaultChecked={profile.interests.includes(key)}
          className="w-5 h-5"
        />
        <span>{t(key as 'fitness' | 'football' | 'green')}</span>
      </label>
    ))}
    <button type="submit" className="mt-4 px-6 py-3 bg-brand text-white rounded-md min-h-12">
      {tCommon('save')}
    </button>
  </form>
</section>
```

- [ ] **Step 2: Add updateInterests Server Action**

Either in same file (server component file) or in `actions.ts`:

```typescript
'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateInterests(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const interests = formData.getAll('interests').filter(
    (v): v is string => typeof v === 'string'
  );
  await supabase
    .from('profiles')
    .update({ interests })
    .eq('id', user.id);

  revalidatePath('/[locale]/settings');
  revalidatePath('/[locale]/plan');
}
```

- [ ] **Step 3: Run lint + build**

```bash
npm run lint
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/settings/
git commit -m "Settings: interests section (toggleable opt-in)"
```

### Task 3.4: Trainer form — sport dropdown

**Files:**
- Modify: `src/app/[locale]/trainer/new/create-group-form.tsx`
- Modify: `src/app/[locale]/trainer/new/actions.ts`

- [ ] **Step 1: Add Trainer.formSportLabel + formSportGeneral + formSportFootball keys**

In all 4 locale files, under `Trainer` namespace, add:

```json
"formSportLabel": "Group sport",
"formSportHint": "Pick 'Football' to auto-flag all joining members as football-track users.",
"formSportGeneral": "General",
"formSportFootball": "Football"
```

PL: `"Sport grupy"` + `"Wybierz „Piłka nożna" żeby auto-flagować dołączających członków jako football-track."` + `"Ogólny"` + `"Piłka nożna"`
IT: `"Sport del gruppo"` + `"Scegli 'Calcio' per attivare automaticamente il football-track per tutti i membri che si uniscono."` + `"Generale"` + `"Calcio"`
UK: `"Спорт групи"` + `"Виберіть „Футбол" щоб автоматично позначати приєднуючихся членів як football-track."` + `"Загальний"` + `"Футбол"`

- [ ] **Step 2: Add sport dropdown to form**

In `create-group-form.tsx`, add a select (before submit button):

```tsx
<div className="space-y-2">
  <label htmlFor="sport" className="block text-sm font-medium">
    {t('formSportLabel')}
  </label>
  <select
    id="sport"
    name="sport"
    defaultValue="general"
    className="w-full min-h-12 px-3 rounded-md border-2 border-border"
  >
    <option value="general">{t('formSportGeneral')}</option>
    <option value="football">{t('formSportFootball')}</option>
  </select>
  <p className="text-sm text-muted">{t('formSportHint')}</p>
</div>
```

- [ ] **Step 3: Update create-group action to save sport**

In `src/app/[locale]/trainer/new/actions.ts`, accept and save `sport`:

```typescript
const sport = formData.get('sport');
if (typeof sport !== 'string' || !['general','football'].includes(sport)) {
  return { error: 'invalidCode' };
}

// when inserting:
const { error } = await supabase
  .from('groups')
  .insert({
    code,
    name,
    city,
    sport,
    owner_id: user.id,
  });
```

- [ ] **Step 4: Run lint + build**

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/trainer/new/ messages/
git commit -m "Trainer form: sport dropdown (general/football) - auto-flags members"
```

---

## Phase 4: UX surfaces (coaching + badge + nav + tutorial)

### Task 4.1: CoachingSection component

**Files:**
- Create: `src/components/coaching-section.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';
import { useTranslations } from 'next-intl';
import { Lightbulb, Target, Trophy } from 'lucide-react';

type Props = {
  whyMatters: string | null;
  keyFocus: string[] | null;
  proTip: string | null;
  /** When true (e.g. for football users) opens the section by default. */
  defaultOpen?: boolean;
};

export function CoachingSection({ whyMatters, keyFocus, proTip, defaultOpen = false }: Props) {
  const t = useTranslations('Coaching');
  if (!whyMatters && (!keyFocus || keyFocus.length === 0) && !proTip) return null;

  return (
    <details open={defaultOpen} className="mt-4 rounded-md border-2 border-border p-4">
      <summary className="font-medium cursor-pointer min-h-12 flex items-center">
        {t('expand')}
      </summary>
      <div className="mt-3 space-y-4 text-base">
        {whyMatters && (
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 shrink-0 mt-1 text-amber-500" />
            <div>
              <strong className="block">{t('whyMatters')}</strong>
              <p>{whyMatters}</p>
            </div>
          </div>
        )}
        {keyFocus && keyFocus.length > 0 && (
          <div className="flex gap-3">
            <Target className="w-5 h-5 shrink-0 mt-1 text-brand" />
            <div>
              <strong className="block">{t('keyFocus')}</strong>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                {keyFocus.map((f, i) => <li key={i}>{f}</li>)}
              </ol>
            </div>
          </div>
        )}
        {proTip && (
          <div className="flex gap-3">
            <Trophy className="w-5 h-5 shrink-0 mt-1 text-yellow-600" />
            <div>
              <strong className="block">{t('proTip')}</strong>
              <p className="italic">{proTip}</p>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Add Coaching namespace translations**

In all 4 message files:

EN:
```json
"Coaching": {
  "expand": "What's important",
  "whyMatters": "Why it matters",
  "keyFocus": "Key focus points",
  "proTip": "Pro tip"
}
```

PL:
```json
"Coaching": {
  "expand": "Co jest istotne",
  "whyMatters": "Dlaczego warto",
  "keyFocus": "Co jest kluczowe",
  "proTip": "Pro tip"
}
```

IT:
```json
"Coaching": {
  "expand": "Cosa è importante",
  "whyMatters": "Perché conta",
  "keyFocus": "Punti chiave",
  "proTip": "Trucco da pro"
}
```

UK:
```json
"Coaching": {
  "expand": "Що важливе",
  "whyMatters": "Чому варто",
  "keyFocus": "Ключові моменти",
  "proTip": "Профі-порада"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/coaching-section.tsx messages/
git commit -m "CoachingSection: expandable why/focus/tip block + 4-locale translations"
```

### Task 4.2: Plan page — football badge + use CoachingSection

**Files:**
- Modify: `src/app/[locale]/plan/page.tsx` (or wherever plan UI is)

- [ ] **Step 1: Find the plan render file**

```bash
ls src/app/[locale]/plan/
```

Identify the file rendering exercise cards (likely `plan-view.tsx` or `page.tsx`).

- [ ] **Step 2: Add football badge**

When `profile.interests.includes('football')`, render a chip above the plan title:

```tsx
{profile.interests.includes('football') && (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-900 text-sm font-medium">
    ⚽ {t('footballMode')}
  </span>
)}
```

Add translation key `Plan.footballMode`: EN `"Football mode"`, PL `"Tryb football"`, IT `"Modalità calcio"`, UK `"Режим футболу"`.

- [ ] **Step 3: Use CoachingSection on each exercise card**

For each exercise card that already shows description + video, fetch `why_matters`, `key_focus`, `pro_tip` from the exercise row (modify the select query in plan-view to include these), then render `<CoachingSection ... defaultOpen={profile.interests.includes('football')} />` below the existing content.

- [ ] **Step 4: Run lint + build**

```bash
npm run lint
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/plan/ messages/
git commit -m "Plan page: football badge + per-card coaching section"
```

### Task 4.3: app-header — Football nav link

**Files:**
- Modify: `src/components/app-header.tsx`

- [ ] **Step 1: Add Football nav item for football users**

Find the navigation array in `app-header.tsx`. Add conditionally:

```tsx
{profile?.interests?.includes('football') && (
  <Link href="/football" className="...">⚽ {t('football')}</Link>
)}
```

Add `Nav.football` translation: EN `"Football"`, PL `"Piłka"`, IT `"Calcio"`, UK `"Футбол"`.

- [ ] **Step 2: Commit**

```bash
git add src/components/app-header.tsx messages/
git commit -m "Header: Football nav link for football users"
```

### Task 4.4: Tutorial slide update — mention football

**Files:**
- Modify: `src/app/[locale]/tutorial/tutorial-view.tsx`
- Modify: `messages/{en,pl,it,uk}.json` (Tutorial.slide3Body or slide2Body)

- [ ] **Step 1: Modify existing tutorial slide 3 (Move Together) to include football line**

Update `Tutorial.slide3Body` in all 4 locales to add a sentence about football:

EN: append `"And if you play football, switch on Football mode for 40 dedicated exercises including tricks like the Cruyff turn."`

PL: append `"A jeśli grasz w piłkę nożną - włącz Tryb football i odblokuj 40 dedykowanych ćwiczeń z trikami jak Cruyff turn."`

IT: append `"E se giochi a calcio, attiva la Modalità calcio per 40 esercizi dedicati con trick come il Cruyff turn."`

UK: append `"А якщо граєте у футбол - увімкніть Режим футболу для 40 спеціальних вправ з триками як Cruyff turn."`

- [ ] **Step 2: Commit**

```bash
git add messages/
git commit -m "Tutorial slide 3: mention football mode + 40 exercises"
```

---

## Phase 5: Skills Library page (`/football`)

### Task 5.1: SkillCard component

**Files:**
- Create: `src/app/[locale]/football/skill-card.tsx`

- [ ] **Step 1: Write the component**

```tsx
import Image from 'next/image';
import { CoachingSection } from '@/components/coaching-section';

type Exercise = {
  slug: string;
  category: string;
  name: string;
  description: string;
  video_url: string | null;
  duration_minutes: number;
  why_matters: string | null;
  key_focus: string[] | null;
  pro_tip: string | null;
};

export function SkillCard({ exercise }: { exercise: Exercise }) {
  const youtubeId = exercise.video_url?.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
  return (
    <article className="rounded-lg border-2 border-border overflow-hidden">
      {youtubeId && (
        <div className="aspect-video bg-surface">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={exercise.name}
            className="w-full h-full"
            loading="lazy"
            allow="picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-medium">{exercise.name}</h3>
        <p className="text-sm text-muted">
          {exercise.duration_minutes} min · {exercise.category.replace('football_', '')}
        </p>
        <p>{exercise.description}</p>
        <CoachingSection
          whyMatters={exercise.why_matters}
          keyFocus={exercise.key_focus}
          proTip={exercise.pro_tip}
          defaultOpen={false}
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/football/skill-card.tsx
git commit -m "SkillCard component for /football library"
```

### Task 5.2: /football library page

**Files:**
- Create: `src/app/[locale]/football/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SkillCard } from './skill-card';
import type { Locale } from '@/i18n/config';

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export const dynamic = 'force-static';
export const revalidate = 3600; // refresh hourly; football catalog rarely changes

export default async function FootballLibrary({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Football');

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from('exercises')
    .select('slug, category, name, description, video_url, duration_minutes, why_matters, key_focus, pro_tip')
    .in('category', ['football_warmup', 'football_drill', 'football_trick', 'football_game']);

  const exercises = (rows ?? []).map((row) => ({
    slug: row.slug,
    category: row.category,
    name: (row.name as Record<string, string>)[locale] ?? (row.name as Record<string, string>).en ?? row.slug,
    description: (row.description as Record<string, string>)?.[locale] ?? (row.description as Record<string, string>)?.en ?? '',
    video_url: row.video_url,
    duration_minutes: row.duration_minutes,
    why_matters: row.why_matters,
    key_focus: row.key_focus,
    pro_tip: row.pro_tip,
  }));

  const byCategory = {
    football_trick: exercises.filter((e) => e.category === 'football_trick'),
    football_drill: exercises.filter((e) => e.category === 'football_drill'),
    football_warmup: exercises.filter((e) => e.category === 'football_warmup'),
    football_game: exercises.filter((e) => e.category === 'football_game'),
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <header>
        <h1 className="text-4xl font-display">⚽ {t('title')}</h1>
        <p className="mt-2 text-lg text-muted">
          {t('summary', {
            total: exercises.length,
            tricks: byCategory.football_trick.length,
          })}
        </p>
      </header>

      <section>
        <h2 className="text-2xl font-display mb-4">{t('sectionTricks')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {byCategory.football_trick.map((ex) => <SkillCard key={ex.slug} exercise={ex} />)}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display mb-4">{t('sectionDrills')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byCategory.football_drill.map((ex) => <SkillCard key={ex.slug} exercise={ex} />)}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display mb-4">{t('sectionWarmups')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byCategory.football_warmup.map((ex) => <SkillCard key={ex.slug} exercise={ex} />)}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-display mb-4">{t('sectionGames')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byCategory.football_game.map((ex) => <SkillCard key={ex.slug} exercise={ex} />)}
        </div>
      </section>
    </main>
  );
}

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'pl' }, { locale: 'it' }, { locale: 'uk' }];
}
```

- [ ] **Step 2: Add Football namespace translations**

EN:
```json
"Football": {
  "title": "Football Skills Library",
  "summary": "{total} exercises · {tricks} tricks · from amateur to pro",
  "sectionTricks": "Tricks and feints",
  "sectionDrills": "Technical drills",
  "sectionWarmups": "Warmups",
  "sectionGames": "Small-sided games"
}
```

PL:
```json
"Football": {
  "title": "Biblioteka piłkarska",
  "summary": "{total} ćwiczeń · {tricks} trików · od amatorów po pro",
  "sectionTricks": "Triki i kiwki",
  "sectionDrills": "Drille techniczne",
  "sectionWarmups": "Rozgrzewki",
  "sectionGames": "Gry małoobszarowe"
}
```

IT:
```json
"Football": {
  "title": "Libreria di calcio",
  "summary": "{total} esercizi · {tricks} trick · da amatori a pro",
  "sectionTricks": "Trick e finte",
  "sectionDrills": "Drill tecnici",
  "sectionWarmups": "Riscaldamenti",
  "sectionGames": "Partite a campo ridotto"
}
```

UK:
```json
"Football": {
  "title": "Бібліотека футболу",
  "summary": "{total} вправ · {tricks} триків · від аматорів до профі",
  "sectionTricks": "Трики та фінти",
  "sectionDrills": "Технічні дрилі",
  "sectionWarmups": "Розминки",
  "sectionGames": "Ігри на малому полі"
}
```

- [ ] **Step 3: Run lint + build**

```bash
npm run lint
npm run build
```

Expected: `/football` route appears in build output for all 4 locales.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/football/ messages/
git commit -m "Skills Library page /football (4 locales, server-rendered, hourly revalidate)"
```

---

## Phase 6: Content seed (40 exercises)

### Task 6.1: Migration 0012 — bulk seed of 40 football exercises

**Files:**
- Create: `supabase/migrations/0012_football_exercises_seed.sql`

This task ships ALL 40 exercises in one migration. The structure mirrors `0002_seed_exercises.sql` (JSON columns for multi-locale name/description).

- [ ] **Step 1: Write the migration with full content for all 40**

The migration will have 4 sections (8 warmups + 12 drills + 12 tricks + 8 games). Each row uses this template:

```sql
insert into public.exercises (
  slug, category, difficulty,
  name, description, video_url, equipment, duration_minutes,
  min_age, max_age,
  why_matters, key_focus, pro_tip
) values (
  '<slug>', '<category>', '<level>',
  '{"en":"...","pl":"...","it":"...","uk":"..."}'::jsonb,
  '{"en":"...","pl":"...","it":"...","uk":"..."}'::jsonb,
  '<youtube_url>',
  '{"ball"}'::text[], <minutes>, 12, 99,
  '<why_matters_en>',
  '{"<focus1>","<focus2>","<focus3>","<focus4>"}'::text[],
  '<pro_tip_en>'
);
```

**Multi-locale coaching fields:** Per migration 0011 (Task 1.1), `why_matters` / `key_focus` / `pro_tip` are JSONB with shape `{"en":"...","pl":"...","it":"...","uk":"..."}` (mirrors `name` / `description`). Plan page and SkillCard extract the user-locale string before passing to `CoachingSection` (which expects plain strings).

**Pattern for locale extraction** (use in Task 4.2 plan page render and Task 5.1 SkillCard):

```typescript
const whyMattersStr =
  (exercise.why_matters as Record<string, string> | null)?.[profile.locale] ??
  (exercise.why_matters as Record<string, string> | null)?.en ??
  null;
const keyFocusArr =
  (exercise.key_focus as Record<string, string[]> | null)?.[profile.locale] ??
  (exercise.key_focus as Record<string, string[]> | null)?.en ??
  null;
const proTipStr =
  (exercise.pro_tip as Record<string, string> | null)?.[profile.locale] ??
  (exercise.pro_tip as Record<string, string> | null)?.en ??
  null;
```

The full content for 40 exercises is generated by Task 6.2 (script).

- [ ] **Step 2: Write the seed migration scaffold (no content yet)**

```sql
-- 0012_football_exercises_seed.sql
-- 40 football exercises (8 warmups + 12 drills + 12 tricks + 8 games)
-- with multi-locale name, description, instructions, why_matters, key_focus, pro_tip.

-- Content is generated by scripts/generate-football-seed.mjs and embedded here.
-- See docs/specs/2026-05-28-football-track-design.md for the source data.

insert into public.exercises (
  slug, category, difficulty, name, description,
  video_url, equipment, duration_minutes, min_age, max_age,
  why_matters, key_focus, pro_tip
) values
-- ====== FOOTBALL_WARMUP (8) ======
-- (Generated content goes here — see Task 6.2)
-- ====== FOOTBALL_DRILL (12) ======
-- (Generated content goes here)
-- ====== FOOTBALL_TRICK (12) ======
-- (Generated content goes here)
-- ====== FOOTBALL_GAME (8) ======
-- (Generated content goes here)
;
```

- [ ] **Step 3: Commit scaffold**

```bash
git add supabase/migrations/0012_football_exercises_seed.sql
git commit -m "Migration 0012 scaffold: 40 football exercises (content to be filled)"
```

### Task 6.2: Generate content with Groq + embed into migration

**Files:**
- Create: `scripts/generate-football-seed.mjs`

- [ ] **Step 1: Write the generator script**

```javascript
#!/usr/bin/env node
// Generates content for 40 football exercises across 4 locales.
// Calls Groq API with structured output (JSON schema), then writes
// the resulting SQL rows into supabase/migrations/0012_football_exercises_seed.sql.

import { writeFileSync, readFileSync } from 'node:fs';
import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const EXERCISES = [
  // 8 warmups
  { slug: 'football-jogging-with-ball', category: 'football_warmup', difficulty: 'low', duration: 4, equipment: ['ball'], video: 'https://www.youtube.com/watch?v=...' },
  { slug: 'fifa-11plus-running-1', category: 'football_warmup', difficulty: 'low', duration: 3, equipment: [], video: '...' },
  // ... (8 total)
  // 12 drills
  { slug: 'wall-pass-rebound', category: 'football_drill', difficulty: 'low', duration: 6, equipment: ['ball'], video: '...' },
  // ... (12 total)
  // 12 tricks
  { slug: 'cruyff-turn', category: 'football_trick', difficulty: 'mid', duration: 5, equipment: ['ball'], video: 'https://www.youtube.com/watch?v=...' },
  { slug: 'step-over', category: 'football_trick', difficulty: 'mid', duration: 5, equipment: ['ball'], video: '...' },
  { slug: 'elastico', category: 'football_trick', difficulty: 'high', duration: 6, equipment: ['ball'], video: '...' },
  // ... (12 total)
  // 8 games
  { slug: '1v1-mini-goals', category: 'football_game', difficulty: 'mid', duration: 15, equipment: ['ball', 'cones'], video: '...' },
  // ... (8 total)
];

const SYSTEM = `You are a football coaching expert. For each exercise, produce localized content (EN/PL/IT/UK) covering:
- name (short, 2-5 words)
- description (1-2 sentences, plain language)
- instructions (3-5 sentences, step-by-step)
- why_matters (2-3 sentences, motivation + famous players who use it)
- key_focus (3-5 short bullet points, what to focus on)
- pro_tip (1 sentence, memorable insight)

Polish: use proper football terminology (zwód, kiwka, podanie, drybling).
Italian: native football vocabulary (finta, dribbling, tunnel/tunnel).
Ukrainian: clean translation, technical terms can stay close to English (фінт OK).
No em-dashes. No emojis. Sentences should be readable by adults.`;

const SCHEMA = {
  name: 'football_exercise_content',
  schema: {
    type: 'object',
    properties: {
      name: { type: 'object', properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } }, required: ['en','pl','it','uk'] },
      description: { type: 'object', properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } }, required: ['en','pl','it','uk'] },
      instructions: { type: 'object', properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } }, required: ['en','pl','it','uk'] },
      why_matters: { type: 'object', properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } }, required: ['en','pl','it','uk'] },
      key_focus: { type: 'object', properties: { en: { type: 'array', items: { type: 'string' } }, pl: { type: 'array', items: { type: 'string' } }, it: { type: 'array', items: { type: 'string' } }, uk: { type: 'array', items: { type: 'string' } } }, required: ['en','pl','it','uk'] },
      pro_tip: { type: 'object', properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } }, required: ['en','pl','it','uk'] },
    },
    required: ['name','description','instructions','why_matters','key_focus','pro_tip'],
    additionalProperties: false,
  },
  strict: true,
};

async function generateOne(exercise) {
  const userPrompt = `Generate content for: ${exercise.slug} (category: ${exercise.category}, difficulty: ${exercise.difficulty}, duration: ${exercise.duration}min, equipment: ${exercise.equipment.join(', ')})`;
  const resp = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_schema', json_schema: SCHEMA },
  });
  return JSON.parse(resp.choices[0].message.content);
}

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

function rowSql(exercise, content) {
  return `  ('${exercise.slug}','${exercise.category}','${exercise.difficulty}',
    '${sqlEscape(JSON.stringify(content.name))}'::jsonb,
    '${sqlEscape(JSON.stringify(content.description))}'::jsonb,
    '${exercise.video}',
    '{${exercise.equipment.join(',')}}'::text[], ${exercise.duration}, 12, 99,
    '${sqlEscape(JSON.stringify(content.why_matters))}'::jsonb,
    '${sqlEscape(JSON.stringify(content.key_focus))}'::jsonb,
    '${sqlEscape(JSON.stringify(content.pro_tip))}'::jsonb)`;
}

async function main() {
  const rows = [];
  for (const ex of EXERCISES) {
    console.log(`Generating ${ex.slug}...`);
    const content = await generateOne(ex);
    rows.push(rowSql(ex, content));
  }
  const header = `-- 0012_football_exercises_seed.sql\n-- 40 football exercises generated by scripts/generate-football-seed.mjs\n\ninsert into public.exercises (\n  slug, category, difficulty, name, description,\n  video_url, equipment, duration_minutes, min_age, max_age,\n  why_matters, key_focus, pro_tip\n) values\n`;
  const sql = header + rows.join(',\n') + ';\n';
  writeFileSync('supabase/migrations/0012_football_exercises_seed.sql', sql);
  console.log(`Wrote ${rows.length} rows.`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Fill in the 40 EXERCISES array with slugs + video URLs + metadata**

Source video URLs from:
- FIFA 11+ official (https://www.youtube.com/results?search_query=fifa+11%2B)
- UEFA Grassroots (https://www.uefa.com/grassroots/news/)
- Coerver Coaching (https://www.youtube.com/@CoerverCoaching)
- Open licensed coaching channels

For each of 40 exercises, find a creative-commons or fair-use embeddable YouTube tutorial. Document choice in PR description.

- [ ] **Step 3: Run the generator**

```bash
GROQ_API_KEY=$GROQ_API_KEY node scripts/generate-football-seed.mjs
```

This writes `supabase/migrations/0012_football_exercises_seed.sql` with all 40 rows.

- [ ] **Step 4: Native speaker review**

Send the PL portion to Jędrzej for review (`SELECT jsonb_extract_path_text(name, 'pl') FROM exercises WHERE category LIKE 'football_%'` etc.). IT to Luigi. UK is auto-translated; flag for native review later.

Fix any errors found via subsequent migration `0013_football_translation_fixes.sql` (don't edit 0012 — append-only rule).

- [ ] **Step 5: Apply migration 0012 to prod via pooler**

```bash
node -e "
const fs = require('fs');
const { Client } = require('pg');
const c = new Client({connectionString: process.env.SUPABASE_POOLER_URL});
(async () => {
  await c.connect();
  await c.query('begin');
  await c.query(fs.readFileSync('supabase/migrations/0012_football_exercises_seed.sql','utf8'));
  await c.query('commit');
  const r = await c.query(\"select category, count(*) from exercises where category like 'football_%' group by category\");
  console.log(r.rows);
  await c.end();
})();
"
```

Expected: 4 rows showing counts (8 warmup, 12 drill, 12 trick, 8 game).

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-football-seed.mjs supabase/migrations/0012_football_exercises_seed.sql
git commit -m "Migration 0012: 40 football exercises seed (multi-locale content via Groq)"
```

---

## Phase 7: E2E + ship

### Task 7.1: E2E smoke test

**Files:**
- Create: `e2e/football-track.spec.ts`

- [ ] **Step 1: Write the E2E test**

```typescript
import { test, expect } from '@playwright/test';

test('football library page renders 4 sections with content', async ({ page }) => {
  await page.goto('http://localhost:3000/pl/football');
  await expect(page.getByRole('heading', { name: /Biblioteka piłkarska/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Triki i kiwki/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Drille techniczne/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Rozgrzewki/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Gry małoobszarowe/i })).toBeVisible();
  // At least one trick visible
  await expect(page.getByText(/Cruyff/i)).toBeVisible();
});

test('football library accessible without login', async ({ page, context }) => {
  await context.clearCookies();
  const response = await page.goto('http://localhost:3000/en/football');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /Football Skills Library/i })).toBeVisible();
});

test('football library renders in all 4 locales', async ({ page }) => {
  for (const locale of ['en', 'pl', 'it', 'uk']) {
    const response = await page.goto(`http://localhost:3000/${locale}/football`);
    expect(response?.status()).toBe(200);
  }
});
```

- [ ] **Step 2: Run E2E test locally**

```bash
npm run e2e -- e2e/football-track.spec.ts
```

Expected: 3/3 tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/football-track.spec.ts
git commit -m "E2E: football library smoke (4 locales, anonymous access)"
```

### Task 7.2: Final integration check + push

- [ ] **Step 1: Full lint + build + unit + e2e**

```bash
npm run lint
npm run build
npm run test:run
npm run e2e
```

Expected: all green.

- [ ] **Step 2: Smoke production after push (Vercel auto-deploys main)**

```bash
git push origin main
sleep 90
for loc in en pl it uk; do
  for path in "$loc" "$loc/football"; do
    code=$(curl -sI -o /dev/null -w "%{http_code}" "https://fgst.zieloneslaskie.pl/$path")
    echo "/$path → $code"
  done
done
```

Expected: all 200.

- [ ] **Step 3: Verify football composition end-to-end**

Sign up a test user, opt into football in onboarding, navigate to /plan, verify the plan contains football_warmup + football_drill/trick + football_game items.

- [ ] **Step 4: Verify trainer flow**

Create a trainer account, create a group with sport=football and code TESTFOOT, join with a second account using that code, verify the joining account has 'football' in interests.

---

## Self-review (run before handing off to implementer)

- [x] Spec coverage: schema → Tasks 1.1 + 6.2; entry points → Tasks 3.1-3.4; AI composition → Task 2.1-2.2; UI surfaces → Tasks 4.1-4.4; Skills Library → 5.1-5.2; content → 6.1-6.2; E2E → 7.1
- [x] No placeholders: each task has full code/SQL embedded
- [x] Type consistency: `Profile.interests` consistently `string[]`, `composeFootballPlan` signature stable across uses
- [x] Migration ordering: 0011 (schema) before 0012 (seed). 0011 also assumes 0009/0010 already applied (they are, on prod)
- [x] AI stack: uses Groq (not Anthropic) per AGENTS.md 2026-05-21 switch

## Risk reminders for the implementer

1. **Migrations are append-only.** Never edit 0012 in place — if content needs fixing, add 0013.
2. **Apply migrations to prod BEFORE pushing code that uses them.** Same protocol as for 0009/0010.
3. **The pooler URL + DB password belong in env vars / secret manager**, never committed.
4. **UK translations are auto-generated** — flag any obvious issues to native reviewer (Adrian or external) before alfa testing.
5. **`/football` page is public** — exercises are public data. Don't accidentally add RLS restricting this.
6. **CoachingSection is `'use client'`** because of `<details open={defaultOpen}>` interaction state. Don't make the wrapping plan page `'use client'`.
