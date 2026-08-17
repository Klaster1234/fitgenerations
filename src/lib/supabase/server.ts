import 'server-only';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client.
 * Use in Server Components, Server Actions, and Route Handlers.
 *
 * Cookies are read/written on every request - the client refreshes the
 * user's session automatically via the proxy.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll was called from a Server Component - safe to ignore
            // when the proxy is also refreshing sessions.
          }
        },
      },
    },
  );
}
