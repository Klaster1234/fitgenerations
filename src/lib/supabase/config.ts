/**
 * Public Supabase connection for Smart TrAIner.
 *
 * These are PUBLIC values: the project URL and the anon key are shipped to
 * the browser and protected by Row Level Security, so keeping them here is
 * not a secret leak.
 *
 * TEMPORARY OVERRIDE: hardcoded to force the correct Supabase project after
 * the original database was deleted and the Vercel environment variables
 * ended up pointing at the wrong (empty) project. Once
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly
 * in Vercel, replace the literals below with the process.env reads and
 * delete this note.
 */
export const SUPABASE_URL = 'https://mdsxfxotosewzefcbojm.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kc3hmeG90b3Nld3plZmNib2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDU1MTQsImV4cCI6MjA5OTc4MTUxNH0.LIia-nMfnQJ_QGun5fq1N8AyfPLxvIOcZ18_qWN7f_4';
