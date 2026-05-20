// Next.js 16 renamed `middleware.ts` to `proxy.ts`.
// This file composes next-intl locale routing with Supabase session refresh.
import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSupabaseSession } from './lib/supabase/proxy';

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // Run intl first - it handles locale detection and may issue redirects.
  const response = intlMiddleware(request);

  // If intl returned a redirect, we still want to refresh Supabase cookies on it.
  return updateSupabaseSession(request, response);
}

export const config = {
  // Match all paths except: API routes, Next.js internals, static assets, and
  // the metadata-file routes Next.js generates from `app/{icon,apple-icon,manifest}.{tsx,ts}`.
  // Without the metadata-file exclusions, intl middleware appends a locale
  // prefix (e.g. /icon → /en/icon) which 404s and breaks PWA install icons.
  matcher: ['/((?!api|trpc|_next|_vercel|icon|icon1|apple-icon|manifest|.*\\..*).*)'],
};
