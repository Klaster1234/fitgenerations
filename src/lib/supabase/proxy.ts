import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request and — for protected
 * paths — auto-creates an anonymous user when there's no session yet.
 *
 * The goal is "open the app and it works": visitors never see a login
 * gate. They get a real `auth.uid()` (anonymous), a real `profiles` row
 * (from the on_auth_user_created trigger), and can later link an email
 * via /signup to keep their data across devices.
 */
const PUBLIC_PATHS = new Set(['', '/', '/events', '/login', '/signup']);
const LOCALE_PREFIX = /^\/(en|pl|it|uk)(\/|$)/;

function isProtectedPath(pathname: string): boolean {
  // Strip the locale prefix: "/pl/plan" → "/plan", "/pl" → ""
  const stripped = pathname.replace(LOCALE_PREFIX, '/').replace(/\/$/, '');
  return !PUBLIC_PATHS.has(stripped);
}

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  // Skip if Supabase env vars are missing (lets us run before keys are wired up).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // IMPORTANT: do not run any logic between createServerClient and getUser.
  // A simple mistake (e.g. logging) can cause the user to be unexpectedly
  // logged out due to cookie race conditions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session on a protected path → silently create an anonymous one.
  // The proxy cookies setAll callback above propagates the new tokens
  // to the response so the next request lands authenticated.
  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    await supabase.auth.signInAnonymously();
  }

  return response;
}
