# FitGenerations Smart TrAIner (FGST)

Smart, free, AI-driven training companion for every generation — built for the
**Erasmus+ Sport SSCP** project *FitGenerations Smart TrAIner* (proposal
ID 101245857), coordinated by Spółdzielnia Socjalna Zielone Śląskie (PL) and
EURO-NET (IT).

## Stack

- **Next.js 16** (App Router, Turbopack, React 19) — PWA
- **TypeScript** strict
- **Tailwind CSS 4** (CSS-based theme tokens)
- **next-intl 4** — PL / IT / EN routing
- **Supabase** — Postgres + Auth (`@supabase/ssr`)
- **Anthropic Claude** (`claude-opus-4-7` by default) — daily plan generation
- **OpenWeather** — weather-aware recommendations

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env
cp .env.example .env.local   # then fill in keys

# 3. Run dev server
npm run dev   # http://localhost:3000  → redirects to /en
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Run prod build locally |
| `npm run lint` | ESLint |

## Project structure

```
src/
  app/
    [locale]/          # all locale-prefixed routes
      layout.tsx       # root layout (html/body, NextIntlClientProvider)
      page.tsx         # landing
      login/, signup/  # auth pages + Server Actions
      onboarding/      # 5-step profile wizard
      plan/            # daily plan view
    api/
      plan/route.ts    # POST → generate plan via Claude
  components/ui/        # Button, Card, Input, Label
  i18n/                 # routing, request config, navigation helpers
  lib/
    supabase/           # server / browser clients + proxy session refresh
    ai/plan-generator.ts
    weather.ts
    utils.ts
  proxy.ts              # Next.js 16 middleware (renamed in this version)
messages/               # en.json / pl.json / it.json
supabase/migrations/    # 0001_initial_schema.sql, 0002_seed_exercises.sql
```

## Database

Migrations live in `supabase/migrations/`. Apply via the Supabase SQL editor
or `supabase db push` (CLI). RLS is enabled on every user-data table — users
only see their own profile, plans, and activity logs.

## Deployment

The project is designed for Vercel:

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENWEATHER_API_KEY
vercel deploy --prod
```

## Accessibility

The app prioritizes seniors and users with fewer opportunities. Conventions:

- 17px base font, 48px minimum touch targets
- WCAG 2.1 AA contrast, strong focus rings
- `prefers-reduced-motion` honored
- Screen-reader-friendly form errors via `role="alert"` + `aria-live`
- All copy localized; no hardcoded language strings
