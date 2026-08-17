'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';

/**
 * Browser-side Supabase client.
 * Use in Client Components for realtime subscriptions, OAuth flows,
 * or when you specifically need client-side interactions.
 *
 * Prefer the server client for queries - keeps secrets out of the browser
 * and benefits from React Cache.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
}
