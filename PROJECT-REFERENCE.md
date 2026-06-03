# FGST — punkt odniesienia projektu

> Jeden dokument ze wszystkimi linkami i instrukcją wznowienia pracy z dowolnego komputera.
> Aktualny na: 2026-06-03.

## Linki

| Co | Adres |
|---|---|
| **Produkcja (live)** | https://fgst.zieloneslaskie.pl |
| **Repozytorium GitHub** | https://github.com/Klaster1234/fitgenerations |
| **Strona piłkarska** | https://fgst.zieloneslaskie.pl/pl/football |
| **Supabase (baza)** | projekt `fhvfgtekyemsyegsqnnr`, region eu-west-1 (Dublin) — dashboard: https://supabase.com/dashboard/project/fhvfgtekyemsyegsqnnr |
| **Vercel (hosting)** | auto-deploy z gałęzi `main` |

## Projekt

- **FitGenerations Smart TrAIner (FGST)** — Erasmus+ Sport, ID **101245857**, okres 01.11.2025–30.04.2027
- Aplikacja AI do treningu międzypokoleniowego, 4 języki: **en / pl / it / uk**
- Spółdzielnia Socjalna Zielone Śląskie + EURO-NET (partner włoski)

## Stack techniczny

- **Next.js 16** + Turbopack + React 19 (App Router, `src/proxy.ts` zamiast middleware)
- **Tailwind 4** (`@theme inline`, brak tailwind.config)
- **next-intl 4** (4 lokale, prefix URL zawsze widoczny)
- **Supabase** PostgreSQL z RLS na wszystkich tabelach użytkownika
- **AI: Groq Llama 3.3 70B** (przełączone z Anthropic 2026-05-21, free-tier, structured outputs)
- **Vercel** deploy
- UX senior-first: 17px, 48px touch targets, WCAG 2.1 AA

## Jak wznowić pracę na INNYM komputerze

```bash
# 1. Sklonuj repo (ma WSZYSTKO: kod, migracje, dokumenty)
git clone https://github.com/Klaster1234/fitgenerations.git
cd fitgenerations/fgst-app

# 2. Zależności
npm install

# 3. Plik .env.local (skopiuj z Vercel -> Settings -> Environment Variables):
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#    SUPABASE_SERVICE_ROLE_KEY=...   (server-only)
#    GROQ_API_KEY=...

# 4. Uruchom
npm run dev      # http://localhost:3000
npm run lint     # musi przejść
npm run build    # musi przejść
npm run test:run # testy jednostkowe
```

Lokalna ścieżka na obecnym komputerze: `C:\Users\jedrz\Downloads\FitGenerations Smart Trainer\fgst-app`

## Migracje bazy (supabase/migrations/) — stan 0001–0029

| # | Co |
|---|---|
| 0001–0004 | Schemat bazowy, seed ćwiczeń, badges |
| 0005–0008 | Video URLs, persona-audit fixes, trener+grupy, locale planu |
| 0009–0010 | Rate limit + role lock, RPC usuwania konta (RODO) |
| 0011 | Football: interests, groups.sport, exercises coaching JSONB, trigger |
| 0012 | Anon SELECT na exercises (browse /football bez logowania) |
| 0013 | 40 football exercises seed |
| 0014–0021 | Poprawki językowe football (PL/IT/UK/EN) + video URLs trików |
| 0022–0023 | Video URLs football (warmup/drill/game + goalkeeper challenge) |
| 0024 | Football min_age 12 -> 8 (dzieci) |
| 0025 | Goalkeeper: profiles.is_goalkeeper |
| 0026 | 14 goalkeeper exercises seed |
| 0027 | 14 goalkeeper video URLs |
| 0028–0029 | Poprawki językowe goalkeeper (PL/IT/UK) |

**Zasada: migracje są append-only.** Nowa zmiana = nowy numerowany plik, nigdy edycja istniejącego.
Aplikowanie na prod: przez pooler `aws-0-eu-west-1.pooler.supabase.com:6543` (hasło DB — patrz Vercel/Supabase, NIE w tym dokumencie).

## Co jest w aplikacji (stan WP1 prototype)

- **Onboarding** 7 kroków (wiek, kondycja, zainteresowania, sprzęt, cele, miasto, para/grupa)
- **Plan AI** dzienny, locale-aware, 3 ścieżki: general / football / goalkeeper
- **Football track**: 40 ćwiczeń (8 warmup + 12 drill + 12 trick + 8 game), wszystkie z wideo
- **Goalkeeper track**: 14 ćwiczeń (handling, diving, shot-stopping, distribution), wszystkie z wideo
- **Skills Library** `/football` — przeglądarka wszystkich ćwiczeń, dostępna bez logowania
- **Trener**: panel, tworzenie grup z kodami, sport grupy (general/football)
- **RODO**: eksport danych, usunięcie konta, polityka prywatności, cookie consent
- **Challenge feed**, **odznaki**, **historia**, **streaks**
- **Tutorial** 4-slajdowy
- Testy: vitest (24), e2e Playwright, CI GitHub Actions

## Ludzie

| Osoba | Rola | Kontakt |
|---|---|---|
| Jędrzej Błaszczak | koordynacja, dev | jedrzej.blaszczak@klaster.org.pl / 530740330 |
| Luigi | EURO-NET (partner IT), review włoskich tłumaczeń | (email z korespondencji) |
| Adrian | developer | — |
| Pan Dariusz | KP Nowy Sikornik Gliwice (klub piłkarski, potencjalny partner testowy) | — |

## Zadania otwarte (do zrobienia)

- [ ] **Rotacja hasła bazy Supabase** — było użyte wielokrotnie podczas migracji, do zmiany (Supabase Dashboard -> Settings -> Database -> Reset password). Po rotacji zaktualizować w Vercel env vars.
- [ ] Native review włoskich tłumaczeń (Luigi) — football + goalkeeper
- [ ] Native review ukraińskich tłumaczeń (Adrian lub zewnętrzny)
- [ ] ~6 generycznych football wideo do ewentualnej wymiany na precyzyjniejsze
- [ ] Mail do Pana Dariusza (KP Sikornik) + propozycja współpracy/testów
- [ ] Position-specific track (obrońca/pomocnik/napastnik) — odłożone do feedbacku z alfy

## Dokumenty projektowe (w repo)

- `docs/specs/2026-05-28-football-track-design.md` — design football
- `docs/specs/2026-06-03-goalkeeper-track-design.md` — design goalkeeper
- `docs/plans/2026-05-28-football-track-implementation.md` — plan implementacji
- `AGENTS.md` — konwencje dla AI/developerów (czytać przed kodowaniem)
