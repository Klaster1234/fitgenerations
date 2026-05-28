# Football track — Design spec

**Status:** approved, ready for writing-plans
**Date:** 2026-05-28
**Owner:** Jędrzej Błaszczak (KIS Klaster Innowacji Społecznych)
**Driver:** KP Nowy Sikornik Gliwice partnership + amateur football audience across PL/IT

## 1. Why

FGST jest dziś aplikacją intergeneracyjnego fitness. Mandat Erasmus+ Sport pozostaje, ale **mamy okazję pozyskać kluby piłkarskie jako lokalnych partnerów** (KP Nowy Sikornik Gliwice w Polsce, potencjalnie klub w Potenzy via EURO-NET) i rozszerzyć appkę o publiczność amatorskich piłkarzy bez wycofywania się z DNA projektu.

Football jest **wbudowanym dopamine hookiem** którego brakuje generycznym fitness apkom: zawodnicy chcą uczyć się sztuczek i trików (Cruyff turn, elastico, step-over). Aplikacja która ich tego uczy z bogatym kontekstem — dlaczego, jak, na co zwracać uwagę — staje się aplikacją używaną codziennie, nie raz w tygodniu.

## 2. User stories

1. **Pan Dariusz** (prezes KP Sikornik) zakłada konto trenera, tworzy grupę z kodem `SIKORNIK1` i wybiera "Sport grupy: Piłka nożna". Daje kod 15 zawodnikom klubu. Każdy z nich automatycznie dostaje football-flavored plany.

2. **Marek** (28 lat, amator, gra w sub-lidze) sam ściąga aplikację. W onboardingu wybiera "Piłka nożna" w sekcji zainteresowań. Codziennie dostaje plan: warmup z piłką → 1-2 drille techniczne → trick lub mini-gra → cooldown.

3. **Tomek** (10 lat) z dziadkiem Stanisławem (62) — w pair mode + football. AI serwuje im "10 podań w rękawicach na trawie" jako football_game pair variant. Razem z tym dostają intergeneracyjne podstawy.

4. **Marek** (z punktu 2) odkrywa `/football` Skills Library. Przegląda 12 trików, klikuje "Cruyff turn", widzi video + dlaczego stosowane przez Messiego + 4 punkty na co zwrócić uwagę + pro tip. Trenuje 5 dni. Nagrywa video samego siebie wykonującego trick — wrzuca do #SmartMoveChallenge.

5. **Luigi** (EURO-NET) testuje włoską wersję, weryfikuje terminologię piłkarską (np. "rabona" zostaje jak po włosku, "kiwki" → "finte di corpo").

## 3. Schema changes (migration `0011_football_track`)

### 3.1 `profiles`

```sql
alter table profiles
  add column interests text[] not null default '{}';

-- Allowed values (enforced via CHECK + RLS): 'football', 'fitness', 'green'
-- 'fitness' is implicit default (empty array == general fitness user)
-- Multi-select: user can have ['football', 'green']

alter table profiles
  add constraint profiles_interests_valid
  check (interests <@ array['football','fitness','green']::text[]);
```

### 3.2 `groups`

```sql
alter table groups
  add column sport text not null default 'general';

alter table groups
  add constraint groups_sport_valid
  check (sport in ('general','football'));

-- Future-proofs for: volleyball, basketball, etc.
```

### 3.3 `exercises.category` — 4 nowe kategorie

```sql
-- exercises.category is text (no enum constraint currently).
-- New values appearing in seed data:
--   'football_warmup'
--   'football_drill'
--   'football_trick'
--   'football_game'
-- No schema change needed — just new rows.
```

### 3.4 `exercises` — coaching fields

```sql
alter table exercises
  add column why_matters text,           -- nullable, only football initially
  add column key_focus text[],           -- nullable, 3-5 bullet points
  add column pro_tip text;               -- nullable, memorable insight

-- All 3 nullable so existing 39 non-football exercises don't need updates.
-- Football exercises must have all 3 populated (enforced in seed, not DB).
```

### 3.5 Auto-flag trigger on group_code join

```sql
create or replace function public.sync_interests_from_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.group_code is not null and NEW.group_code is distinct from OLD.group_code then
    -- Look up group sport, append to interests if football
    update public.profiles
       set interests = (
         select array(select distinct unnest(interests || g.sport))
         from public.groups g
         where g.code = NEW.group_code and g.sport = 'football'
       )
     where id = NEW.id
       and exists (select 1 from public.groups g
                   where g.code = NEW.group_code and g.sport = 'football');
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_sync_interests on public.profiles;
create trigger profiles_sync_interests
  before update on public.profiles
  for each row execute function public.sync_interests_from_group();
```

Remove on unset of group_code is NOT done — user might have football interest independently. Subtractive logic surprises users.

## 4. Entry points

| Mechanizm | Gdzie | Trigger |
|---|---|---|
| Onboarding step | `wizard.tsx` po fitnessQuestion, przed location | User explicit pick |
| Settings toggle | `/settings` nowa sekcja "Zainteresowania" | User explicit pick |
| Group code join | profile.group_code update | Trigger 3.5 auto-flags football |
| Trainer creates football group | `/trainer/new` form, nowy dropdown "Sport grupy" | Trener decyduje |

Multi-select w UI: chips "Ogólny fitness / Piłka nożna / Sport w naturze" — user może wybrać 1-3.

## 5. Content seed (~40 exercises × 4 locales)

### 5.1 Quantities

| Kategoria | Liczba | Notes |
|---|---|---|
| `football_warmup` | 8 | FIFA 11+ adaptacje, dynamic warmup z piłką |
| `football_drill` | 12 | Passing, shooting, ball control, weak foot, 1v1 defense |
| `football_trick` | 12 | Cruyff turn, step-over, scissors, elastico, rabona, rainbow flick, Maradona spin, fake shot, body feint, drag-back, La Croqueta, no-look pass |
| `football_game` | 8 | 1v1/2v2/3v3, rondo, intergeneracyjne mini-mecze |
| **Total** | **40** | |

### 5.2 Per-exercise content (each of 40 × each of 4 langs)

| Pole | Typ | Long-form example (Cruyff turn — PL) |
|---|---|---|
| `slug` | text PK | `cruyff-turn` |
| `category` | text | `football_trick` |
| `level` | text | `mid` |
| `duration_minutes` | int | 5 |
| `equipment` | text[] | `['ball']` (optional cones/wall) |
| `video_url` | text | YouTube link (Coerver Coaching / UEFA Grassroots / public domain) |
| `title` (per locale) | text | "Zwód Cruyffa" |
| `description` (per locale) | text | "Klasyczny zwód piłkarski — pozwala zmienić kierunek o 180° bez utraty kontroli nad piłką." |
| `instructions` (per locale) | text | "1. Ustaw się jak do podania prostą nogą. 2. Zamiast uderzyć, przeprowadź piłkę wewnętrzną stroną stopy za stopę podporową. 3. Obróć ciało razem z piłką. 4. Eksploduj w nowym kierunku." |
| `why_matters` (per locale) | text | "Klasyk Johana Cruyffa — używany przez Messiego, Iniestę, Modrića żeby wyminąć obrońcę w 1v1. Działa na każdej pozycji boiska." |
| `key_focus` (per locale, array) | text[] | `['Spójrz w stronę gdzie udajesz że podasz', 'Wewnętrznym podbiciem przeprowadź piłkę za stopę podporową', 'Obróć ciało razem z piłką (nie po niej)', 'Pierwszy krok po obrocie ma być eksplozją']` |
| `pro_tip` (per locale) | text | "Sprzedaj zwód korpusem ZANIM dotkniesz piłki. Jeśli obrońca nie kupił udawania podania — trick nie wypali. Wzrok i barki kłamią, stopa zdradza prawdę." |

### 5.3 Localization plan

- **EN** — primary, generuję ja (Claude Opus) z research z public football coaching sources
- **PL** — Jędrzej (user) reviewuje, korekta terminologii (np. "zwód" nie "fake")
- **IT** — Luigi (EURO-NET) reviewuje, korekta terminologii (np. "finta" zachowuje, "tunnel" zamiast "nutmeg")
- **UK** — auto-translation z PL/EN przez DeepL, light review (idealnie native, fallback: machine)

Każdy lang osobno bo terminologia piłkarska jest **silnie lokalna** — calque z angielskiego zawodzi.

## 6. Skills Library page (`/[locale]/football`)

### 6.1 Route

`src/app/[locale]/football/page.tsx` — server component (statyczne renderowanie, RLS-friendly bo wszystkie exercises są publiczne)

### 6.2 Layout

```
┌───────────────────────────────────────────────────┐
│  ⚽ FOOTBALL SKILLS LIBRARY                        │
│  40 ćwiczeń · 12 trików · od amatorów po pro      │
│                                                    │
│  [Search bar — szukaj po nazwie/kategorii]        │
├───────────────────────────────────────────────────┤
│                                                    │
│  TRIKI I KIWKI (12) — gallery 3-col grid          │
│  ┌─────┐ ┌─────┐ ┌─────┐                          │
│  │video│ │video│ │video│                          │
│  │Cruyff│ │Step │ │Elas │                          │
│  └─────┘ └─────┘ └─────┘                          │
│  ...                                               │
│                                                    │
│  DRILLE TECHNICZNE (12) — list                    │
│  · Passing pairs · Shooting accuracy · ...        │
│                                                    │
│  ROZGRZEWKI (8) — list                            │
│  GRY MAŁOOBSZAROWE (8) — list                     │
└───────────────────────────────────────────────────┘
```

### 6.3 Detail interaction

Click na exercise card → modal/expand z:
- Video embed
- Description
- Why matters (highlighted)
- Key focus (numbered list)
- Pro tip (callout box)
- "Dodaj do dzisiejszego planu" CTA (server action: append do current daily_plan items)
- Mark as "tried" (przyszłość: tracking, na razie nope)

### 6.4 Access control

Strona dostępna dla wszystkich (nawet anonim). To samo co landing — exercises są publiczne. Jeśli user jest zalogowany i ma football w interests, link do `/football` widoczny w nawigacji obok Plan/History/Badges.

## 7. AI plan generator changes

W `src/lib/ai/plan-service.ts` / `plan-generator.ts`:

### 7.1 Composition logic

```typescript
// Pseudokod — target 5-item composition for football user
// Actual item count respects user's time budget (cap at profile.daily_minutes_target)
function composeForFootballUser(profile, catalog) {
  const target = [
    pickFrom(catalog, 'football_warmup', { fallback: 'warmup' }),
    pickFrom(catalog, 'football_drill'),
    Math.random() > 0.5
      ? pickFrom(catalog, 'football_drill')          // 50% drill #2
      : pickFrom(catalog, 'football_trick'),         // 50% trick
    pickFrom(catalog, 'football_game'),
    pickFrom(catalog, 'cooldown'),
  ];
  return trimToBudget(target, profile.daily_minutes_target ?? 30);
}
```

Idea: gwarantowany "wstęp → praca → finisz" rhythm, jeden slot na ryzyko/przyjemność (trick), reszta drop'owana jeśli user ma krótki budget czasu (np. 15 min → wycina drugi drill i game).

### 7.2 Pair mode + football

Jeśli user ma `trains_with_partner=true` AND `'football' in interests`:
- 1 z 5 slotów to football_game z pair variant (intergeneracyjne mini-podania)

### 7.3 AI prompt update

System prompt do Claude dostaje dodatkowy kontekst:

```
The user is an amateur footballer (interests includes 'football').
Their plan should:
- Use football-themed exercises when available
- Include at least one football_trick or football_game item
- Match their fitness level — beginner footballers get drag-back/step-over,
  advanced get elastico/rainbow flick
```

Stable system prompt = caching friendly (per AGENTS.md AI rules).

## 8. UI changes

### 8.1 Exercise card — expandable coaching section

Aktualnie: title + duration + AI note + video.

Dodaję sekcję pod video (zwijaną):

```tsx
{exercise.why_matters && (
  <details className="mt-4">
    <summary>Co jest istotne</summary>
    <div className="mt-3 space-y-3">
      <div>💡 <strong>Dlaczego warto:</strong> {why_matters}</div>
      <div>🎯 <strong>Co jest kluczowe:</strong>
        <ol>{key_focus.map(f => <li>{f}</li>)}</ol>
      </div>
      <div>🥇 <strong>Pro tip:</strong> {pro_tip}</div>
    </div>
  </details>
)}
```

Domyślnie zwinięte. Dla football user (interests.includes('football')) — auto-rozwinięte (zapisać preferencję w localStorage albo profile.show_coaching=true).

### 8.2 Plan page badge

Jeśli `'football' in interests`, mały chip nad planem: `⚽ Football mode`. Identyczny pattern jak istniejący `👫 Tryb pary`.

### 8.3 Tutorial slide

Modyfikacja slide 3 (lub nowy slide 5):

> **Trenujesz piłkę nożną?**
>
> FGST ma 40 ćwiczeń stworzonych specjalnie dla piłkarzy — od rozgrzewek z FIFA 11+ po triki jak Cruyff turn. Wybierz "Piłka nożna" w zainteresowaniach żeby plany dostosowały się do Ciebie.

### 8.4 Landing page

OPCJONALNE: dodatkowa karta wartości "04 / Piłka nożna" obok obecnych 3 (Język / Personalizacja / W realu). Decydujemy po user feedback — czy lead message ma być piłka czy intergeneracyjność. Domyślnie: intergeneracyjność lead, piłka secondary.

### 8.5 Navigation

Dla zalogowanego usera z football w interests:
- Top nav (desktop): `Plan | Historia | Odznaki | ⚽ Football | Wyzwanie | Ustawienia`
- Mobile bottom tab (4 tabs total): **NIE dodajemy 5. ikony** — 4 tabs to badaniach UX optimal touch target spacing dla seniorów. Zamiast tego: `⚽ Football` link w app-header (visible również na mobile), plus z poziomu Plan można "Otwórz Skills Library" jako mały CTA pod planem dla football users.

### 8.6 Trainer form (`/trainer/new`)

Nowy field przed submit:

```
Sport grupy: ⚪ Ogólny  ⚪ Piłka nożna
```

Po stworzeniu grupy z sport=football, wszyscy którzy wpiszą kod auto-dostają flag.

## 9. Out of scope (świadomie pomijamy w MVP)

- **Trainer push** specific football plans to club members
- **Football-specific badges** ("Pierwsza bramka", "100 podań", "Mistrz Cruyffa")
- **Trick progression / unlock system** (beginner→intermediate→advanced)
- **Pro reference clips** (Ronaldo/Messi compilation linki)
- **Match analysis** (user uploads game footage)
- **Tournament/league features**
- **E-sport / FIFA video game tie-ins**
- **Football badges** (np. "Trener Pana Dariusza" za 30 dni z rzędu w klubie)

Wszystkie powyższe to materiał na v1.1 lub v2 po realnym user feedback z alfa testerów.

## 10. Risks

| Ryzyko | Mitigacja |
|---|---|
| **Słaba jakość włoskiej terminologii** — calque z PL/EN brzmi sztucznie | Luigi review (już współpracuje) przed shipem na produkcję |
| **40 ćwiczeń × 4 langi = 960 stringów do napisania i review** = duży effort | AI-first draft (Claude), parallel review by native speakers |
| **Football może przyćmić mandat intergeneracyjny** w odbiorze Erasmusa | Landing page lead pozostaje intergeneracyjność; piłka secondary; w dokumentacji projektu (raport WP1) podkreślamy football jako "engagement layer" nie core |
| **Skills Library page = większa surface area, więcej do testowania** | E2E test (Playwright) na nowej stronie, smoke test po deployu |
| **User non-footballer może być zaskoczony Cruyff turnem w planie** | Plan dostaje football tylko jeśli interests.includes('football'). Multi-entry zapewnia opt-in |

## 11. Implementation rough order

1. **Migration `0011`** — schema (profiles.interests, groups.sport, exercises coaching fields, trigger)
2. **Seed exercises** — 40 ćwiczeń × 4 langs (najwięcej pracy)
3. **AI plan generator** football-aware composition
4. **Onboarding step** — interests question + UI
5. **Settings section** — Zainteresowania
6. **Trainer form** — sport dropdown + group_code auto-flag
7. **Plan page** — football badge + auto-expanded coaching
8. **Skills Library page** `/football`
9. **Tutorial slide** update
10. **Navigation** — football link dla football users
11. **Landing page** — optional 4. value card
12. **E2E + smoke test**

Realistic timeline (full focus): **3-5 dni roboczych**.

## 12. Open questions for spec review

- [ ] Czy quantity 40 exercises (12 trików) to wystarczająco?
- [ ] Czy chcemy dodać 4. value card na landing, czy lead pozostaje intergeneracyjność?
- [ ] UK locale — Adrian native speaker czy auto-trans z light review?
- [ ] Czy `/football` page dostępna dla anonim users (browse before signup), czy tylko zalogowani?
- [ ] Czy w MVP zostawiamy "Mark as tried" tracking dla trików, czy odkładamy do v1.1?

---

**Status:** Spec ready for user review. After approval → invoke `writing-plans` skill to produce detailed implementation plan.
