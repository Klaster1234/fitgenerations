# Goalkeeper track — Design spec

**Status:** approved (user picked "full, ~14 exercises"), building
**Date:** 2026-06-03
**Builds on:** football track (migrations 0011-0024)

## Why

Every football team has a goalkeeper, but the 40 football exercises are all
outfield (dribbling, tricks, shooting, passing). A keeper who opts into
football gets a plan with zero keeper-relevant content. KP Nowy Sikornik
Gliwice (the partner club) has goalkeepers. This closes the team: keepers get
handling, diving, shot-stopping, footwork and distribution work.

## Schema (migration 0025)

```sql
alter table public.profiles
  add column if not exists is_goalkeeper boolean not null default false;
-- New exercises.category value: 'football_goalkeeper' (no schema change, just rows)
```

A goalkeeper is still a football player: `interests` includes `'football'`
AND `is_goalkeeper = true`. Keepers still do outfield warmups and some ball
work, but their plan is GK-centric.

## Opt-in

- **Onboarding:** in the interests step, when `'football'` is selected, show
  an extra checkbox "I'm a goalkeeper" -> sets `is_goalkeeper`.
- **Settings:** same toggle, visible when football interest is active.

Both write `profiles.is_goalkeeper`. Editing it drops today's plan so it
regenerates (same pattern as interests, already in saveOnboarding /
updateInterests).

## Plan composition (`composeGoalkeeperPlan`)

When `profile.is_goalkeeper && interests.includes('football')`, use a
GK-specific composition (separate helper, same shape as composeFootballPlan):

1. `football_goalkeeper` warmup-ish (handling/footwork) OR `football_warmup` fallback
2. `football_goalkeeper` (handling / catching)
3. `football_goalkeeper` (diving / shot-stopping)
4. `football_goalkeeper` (distribution) OR `football_game` (keeper challenge)
5. `cooldown`

Trims to time budget, always keeps opening + cooldown. Deterministic seed =
Date.parse(today). Distinct slugs (no duplicates, the bug we already hit).

`plan-service` routes: `is_goalkeeper` -> composeGoalkeeperPlan; else football
-> composeFootballPlan; else general. Equipment filter: keepers implicitly
have a ball AND gloves (no onboarding option for either), so add both to
userEquip when keeper.

## Content (~14 football_goalkeeper exercises × 4 locales)

| slug | difficulty | focus |
|---|---|---|
| gk-handling-basics | low | catching technique, W-shape hands |
| gk-low-dive-save | mid | diving low left/right |
| gk-high-catch | mid | high ball claiming |
| gk-footwork-ladder | low | set position footwork |
| gk-shot-stopping-reactions | mid | reaction saves |
| gk-1v1-closing-down | high | spreading, narrowing the angle |
| gk-cross-claiming | high | timing the jump, punch vs catch |
| gk-distribution-throwing | low | roll / javelin throw accuracy |
| gk-distribution-kicking | mid | goal kicks, half-volley clearance |
| gk-weak-foot-kicking | mid | distribution with weaker foot |
| gk-reflex-wall-rebound | mid | close-range reflex off a wall |
| gk-positioning-angles | mid | starting position, narrowing angles |
| gk-warmup-handling | low | keeper-specific warmup |
| gk-recovery-save | high | second save, scrambling recovery |

Each: name, description, instructions, why_matters, key_focus[], pro_tip in
EN/PL/IT/UK (JSONB, same shape as football). Generated via Groq Llama, then
native review (PL by user, IT by Luigi, UK later). min_age = 8 (kids keep
goal too), equipment = ['ball'] (gloves are implicit, not a filter blocker -
handled in plan-service like ball). Videos sourced by WebSearch + oEmbed
verification (reputable GK channels: Pro GK Academy, ARS Goalkeeping, Just
Keepers, etc.).

## UI

- `/football` library: new "Goalkeeper training" section (visible to everyone,
  GK content is interesting to outfielders too).
- Onboarding interests step: conditional keeper checkbox.
- Settings: keeper toggle in the interests section.
- Plan badge: keeper users see "🧤 Goalkeeper" alongside the football badge.
- i18n: new `Football.sectionGoalkeeper`, `Interests.goalkeeper*`,
  `Plan.goalkeeperMode`, `Coaching` reused.

## Out of scope

- Outfield position-specific tracks (defender/midfielder/striker) - deferred.
- Pro reference clips - separate future feature.
- GK-specific badges - future.

## Implementation order

1. Migration 0025 (schema)
2. Profile type + plan-service: is_goalkeeper, gloves/ball implicit, route to GK composition
3. composeGoalkeeperPlan + TDD tests
4. Onboarding + settings keeper toggle + i18n
5. /football goalkeeper section + plan badge
6. Content: migration 0026 (14 GK exercises via Groq)
7. Videos: migration 0027 (WebSearch + oEmbed verified)
8. Verify + ship
