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

- Hardcoded English strings are forbidden in any UI file. Add the key to `messages/en.json`, then `pl.json` and `it.json`, and use `useTranslations()` (client) or `getTranslations()` (server).
- The default locale is `en`. URL prefix is always shown: `/en/login`, `/pl/login`, `/it/login`.

## Supabase

- Use `createSupabaseServerClient()` from `@/lib/supabase/server` in Server Components, Server Actions, and Route Handlers.
- Use `createSupabaseBrowserClient()` from `@/lib/supabase/client` only in Client Components when realtime / OAuth flows are needed.
- All user-data tables have RLS — never expose the service-role key to the client. Server-only secrets must NOT be prefixed `NEXT_PUBLIC_`.
- Schema lives in `supabase/migrations/`. Treat migrations as append-only — add a new numbered file rather than editing existing ones.

## AI / Claude

- Default model: `claude-opus-4-7`. Override via `ANTHROPIC_MODEL` env var if cost or latency demands it.
- Use **adaptive thinking** (`thinking: {type: 'adaptive'}`) and the `effort` parameter — never `budget_tokens` (removed on Opus 4.7) or `temperature`/`top_p`/`top_k` (also removed on 4.7).
- Keep the system prompt **stable** for prompt caching. Per-request data goes in the user message.
- Use structured outputs (`output_config.format`) instead of assistant-turn prefills for JSON.

## Accessibility

- Senior-first: 17px base, 48px min touch target, strong focus rings.
- Every interactive element must be keyboard-reachable.
- Forms surface errors via `role="alert"` and `aria-live`.
- Honor `prefers-reduced-motion` (already in `globals.css`).

## Tests & lint before commit

- `npm run lint` must pass.
- `npm run build` must pass — TypeScript strict mode is enabled.
