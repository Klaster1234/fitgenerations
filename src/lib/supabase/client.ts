'use client';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Use in Client Components for realtime subscriptions, OAuth flows,
 * or when you specifically need client-side interactions.
 *
 * Prefer the server client for queries — keeps secrets out of the browser
 * and benefits from React Cache.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
