import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request and forwards the cookies.
 * Called from the top-level proxy.ts (Next.js 16 replaces middleware.ts).
 *
 * The pattern matches the official Supabase + Next.js example:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */
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
  await supabase.auth.getUser();

  return response;
}
