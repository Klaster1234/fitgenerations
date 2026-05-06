// One-shot script to apply combined SQL migrations via Supabase Management API.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-migrations.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '_all_migrations_combined.sql');
const sql = readFileSync(sqlPath, 'utf-8');

const projectRef = 'fhvfgtekyemsyegsqnnr';
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
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
