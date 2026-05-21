// One-shot script to apply combined SQL migrations via Supabase Management API.
//
// Usage:
//   # Required: an env var with the project ref so this script never has
//   # a hard-coded prod target. Pass --prod to confirm you really mean to
//   # write to a production-shaped project (Vercel's prod ref).
//   SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_REF=abcdef... \
//     node scripts/apply-migrations.mjs [--prod] [--dry-run]
//
// --dry-run prints which SQL file would be sent without making the API call.
// --prod    required when SUPABASE_PROJECT_REF equals the historical prod
//           project ref ("fhvfgtekyemsyegsqnnr"), so an accidental CI run
//           with a stale env can't wipe / overwrite the live schema silently.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '_all_migrations_combined.sql');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const explicitProd = args.has('--prod');

const PROD_REF = 'fhvfgtekyemsyegsqnnr';

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef) {
  console.error(
    'Missing SUPABASE_PROJECT_REF. Set it explicitly so this script never has a hard-coded target.',
  );
  process.exit(1);
}

if (projectRef === PROD_REF && !explicitProd) {
  console.error(
    `Refusing to apply migrations against the production project ref (${PROD_REF}) without --prod.`,
  );
  console.error('Re-run with: --prod  if this is intentional.');
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf-8');
console.log(`Target project ref: ${projectRef}`);
console.log(`SQL file: ${sqlPath} (${sql.length} bytes)`);

if (dryRun) {
  console.log('--dry-run set; not contacting the API.');
  process.exit(0);
}

const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text.slice(0, 2000));

if (!res.ok) {
  process.exit(2);
}
