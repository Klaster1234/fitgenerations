<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FGST conventions for AI assistants

## Stack quick-reference

- **Next.js 16** + Turbopack + React 19. App Router only. `middleware.ts` no longer exists — it is **`src/proxy.ts`**.
- **Tailwind 4** uses `@import "tailwindcss"` and `@theme inline { ... }` in CSS, not `tailwind.config.ts`. Custom colors are CSS variables exposed as `--color-*`.
- **`params` and `searchParams` are `Promise<...>`** in pages and layouts. Always `await` them.
- **`cookies()`** is async. Always `await` it.
- **next-intl 4** is configured. All routes live under `src/app/[locale]/`. Use the `Link`/`redirect`/`useRouter` helpers from `@/i18n/navigation`, not `next/link` / `next/navigation`.
- **Server Components by default.** Add `'use client'` only when the component needs state, effects, or browser APIs.

## Localization

- Four locales are supported: **en, pl, it, uk**.
- Hardcoded English strings are forbidden in any UI file. Add the key to `messages/en.json`, then `pl.json`, `it.json`, and `uk.json`, and use `useTranslations()` (client) or `getTranslations()` (server).
- The default locale is `en`. URL prefix is always shown: `/en/login`, `/pl/login`, `/it/login`, `/uk/login`.

## Supabase

- Use `createSupabaseServerClient()` from `@/lib/supabase/server` in Server Components, Server Actions, and Route Handlers.
- Use `createSupabaseBrowserClient()` from `@/lib/supabase/client` only in Client Components when realtime / OAuth flows are needed.
- All user-data tables have RLS — never expose the service-role key to the client. Server-only secrets must NOT be prefixed `NEXT_PUBLIC_`.
- Schema lives in `supabase/migrations/`. Treat migrations as append-only — add a new numbered file rather than editing existing ones.

## AI / Groq

- The plan generator runs on **Groq** (free-tier, OpenAI-compatible API). Default model: `llama-3.3-70b-versatile`. Override via `GROQ_MODEL` env var if you want to test Llama 4 Maverick/Scout or a reasoning model (`deepseek-r1-distill-llama-70b`, `qwen/qwen3-32b`).
- Use **Structured Outputs**: `response_format: { type: 'json_schema', json_schema: { name, schema, strict: true } }`. The JSON-mode (`type: 'json_object'`) is a fallback for models that don't support strict schema.
- For reasoning models, the SDK exposes `reasoning_effort: 'low' | 'medium' | 'high'` and `reasoning_format: 'parsed' | 'hidden' | 'raw'`. Llama 3.3/4 are NOT reasoning models — don't pass these params, they'll be ignored.
- Keep the system prompt **stable** so Groq's server-side caching (where supported) can reuse it. Per-request data goes in the user message.
- Switched from Anthropic Claude Opus 4.7 → Groq Llama 3.3 70B on 2026-05-21 to remove the $5 spend gate during WP1 prototype. Quality of PL/IT copy is solid; UK (Ukrainian) is slightly weaker than Claude's — flag any regressions to the consortium for a possible model swap.

## Accessibility

- Senior-first: 17px base, 48px min touch target, strong focus rings.
- Every interactive element must be keyboard-reachable.
- Forms surface errors via `role="alert"` and `aria-live`.
- Honor `prefers-reduced-motion` (already in `globals.css`).

## Security

- `profiles.role` is locked: RLS WITH CHECK (migration 0009) rejects any self-update that changes the role. Use the `request_trainer_role()` SECURITY DEFINER RPC for legitimate elevation — never `UPDATE profiles SET role = …` from a client or Server Action.
- `/api/plan` regenerate is rate-limited to once per 60s per user, using `daily_plans.updated_at` as the authoritative timestamp. The body is validated with Zod.
- The Supabase **service role key** is server-only — it must never be imported from a Client Component, never read in a non-`server-only` module, and never prefixed `NEXT_PUBLIC_`.

## Tests & lint before commit

- `npm run lint` must pass.
- `npm run build` must pass — TypeScript strict mode is enabled.
