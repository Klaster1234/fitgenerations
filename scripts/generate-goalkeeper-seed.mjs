// Generates supabase/migrations/0026_goalkeeper_exercises_seed.sql by calling
// Groq with structured outputs for each of 14 goalkeeper exercises x 4 locales.
//
// Usage:
//   GROQ_API_KEY=gsk_... node scripts/generate-goalkeeper-seed.mjs
//   # or, .env.local is auto-loaded via @next/env
//
// Notes:
//  - Adapted from scripts/generate-football-seed.mjs. Same SCHEMA, SQL row
//    format, dash/quote sanitization, and Cyrillic-validation retry logic.
//  - All goalkeeper exercises share category 'football_goalkeeper', equipment
//    ['ball'], min_age 8, max_age 99.
//  - video_url is written as null for all 14 rows. The controller sources
//    goalkeeper videos separately (WebSearch + oEmbed) in a later migration.
//  - This script writes a SQL file. It does NOT apply the migration.

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Groq from 'groq-sdk';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

// Load .env.local just like Next does
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..');
loadEnvConfig(projectDir);

if (!process.env.GROQ_API_KEY) {
  console.error('FATAL: GROQ_API_KEY not set (checked process.env and .env.local).');
  process.exit(1);
}

const MODEL_ID = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';
const OUTPUT_PATH = join(projectDir, 'supabase', 'migrations', '0026_goalkeeper_exercises_seed.sql');
const CACHE_PATH = join(projectDir, 'scripts', 'goalkeeper-seed-cache.json');
// Pacing: be polite to free-tier rate limits. Override via env.
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS ?? 1500);
const MAX_RETRIES = 3;

// CLI: --only=slug1,slug2  (regenerate only these), default = all that aren't cached
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlySlugs = onlyArg ? new Set(onlyArg.slice(7).split(',').filter(Boolean)) : null;

// =========================================================================
// Exercise list (14 goalkeeper exercises). All category football_goalkeeper,
// equipment ['ball'], min_age 8, max_age 99, video_url null.
// `hint` gives the model a one-line focus for the drill.
// =========================================================================
const EXERCISES = [
  { slug: 'gk-handling-basics',         difficulty: 'low',  duration_minutes: 5, hint: 'catching technique, W-shape hands' },
  { slug: 'gk-warmup-handling',         difficulty: 'low',  duration_minutes: 4, hint: 'keeper-specific warmup, footwork plus soft catches' },
  { slug: 'gk-footwork-set-position',   difficulty: 'low',  duration_minutes: 5, hint: 'set/ready position footwork, small steps' },
  { slug: 'gk-low-dive-save',           difficulty: 'mid',  duration_minutes: 8, hint: 'diving low left and right' },
  { slug: 'gk-high-catch',              difficulty: 'mid',  duration_minutes: 6, hint: 'claiming high balls, jump timing' },
  { slug: 'gk-shot-stopping-reactions', difficulty: 'mid',  duration_minutes: 8, hint: 'reaction saves from close shots' },
  { slug: 'gk-reflex-wall-rebound',     difficulty: 'mid',  duration_minutes: 6, hint: 'close-range reflex off a wall/rebounder' },
  { slug: 'gk-positioning-angles',      difficulty: 'mid',  duration_minutes: 6, hint: 'narrowing the angle, starting position' },
  { slug: 'gk-1v1-closing-down',        difficulty: 'high', duration_minutes: 8, hint: 'spreading big, blocking 1v1' },
  { slug: 'gk-cross-claiming',          difficulty: 'high', duration_minutes: 8, hint: 'timing the jump, punch vs catch' },
  { slug: 'gk-distribution-throwing',   difficulty: 'low',  duration_minutes: 6, hint: 'roll and javelin throw accuracy' },
  { slug: 'gk-distribution-kicking',    difficulty: 'mid',  duration_minutes: 8, hint: 'goal kicks, half-volley clearance' },
  { slug: 'gk-weak-foot-kicking',       difficulty: 'mid',  duration_minutes: 6, hint: 'distribution with the weaker foot' },
  { slug: 'gk-recovery-save',           difficulty: 'high', duration_minutes: 6, hint: 'second/scramble save, getting back up' },
];

// =========================================================================
// Structured output schema (per-exercise)
// =========================================================================
const SCHEMA = {
  name: 'goalkeeper_exercise_content',
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'description', 'instructions', 'why_matters', 'key_focus', 'pro_tip'],
    properties: {
      name: { type: 'object', additionalProperties: false, required: ['en', 'pl', 'it', 'uk'], properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } } },
      description: { type: 'object', additionalProperties: false, required: ['en', 'pl', 'it', 'uk'], properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } } },
      instructions: { type: 'object', additionalProperties: false, required: ['en', 'pl', 'it', 'uk'], properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } } },
      why_matters: { type: 'object', additionalProperties: false, required: ['en', 'pl', 'it', 'uk'], properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } } },
      key_focus: {
        type: 'object', additionalProperties: false, required: ['en', 'pl', 'it', 'uk'], properties: {
          en: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
          pl: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
          it: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
          uk: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
        },
      },
      pro_tip: { type: 'object', additionalProperties: false, required: ['en', 'pl', 'it', 'uk'], properties: { en: { type: 'string' }, pl: { type: 'string' }, it: { type: 'string' }, uk: { type: 'string' } } },
    },
  },
  strict: true,
};

// Stable system prompt (server-side caching where supported)
const SYSTEM_PROMPT = `You are a goalkeeper coaching expert (football/soccer). For each exercise, produce localized content (EN/PL/IT/UK) covering:
- name: 2-5 words
- description: 1-2 plain-language sentences
- instructions: 3-5 sentences, numbered steps
- why_matters: 2-3 sentences, motivation plus famous goalkeepers who exemplify it (e.g. Neuer, Buffon, Courtois, Oblak, Donnarumma)
- key_focus: array of 3-5 short bullet strings, what to focus on
- pro_tip: one memorable sentence

Locale rules (MANDATORY):
- Polish (pl): use proper goalkeeper terminology (bramkarz, parada, wyjscie, chwyt, wykop, wyrzut, pozycja). Use Szczesny/Fabianski as relatable Polish keepers in why_matters.
- Italian (it): native goalkeeper vocabulary (portiere, parata, uscita, presa, rinvio). Use Buffon/Donnarumma in why_matters.
- Ukrainian (uk): MUST be written in Cyrillic script (Ukrainian alphabet). Do not write English under the uk key. Goalkeeper terms can be loaned (голкіпер/воротар, сейв) but the whole sentence is Ukrainian. Use Lunin/Pyatov (Лунін/Пятов) as relatable keepers. Cyrillic alphabet, not Latin.
- English (en): plain US/UK English. Goalkeeping terms (handling, set position, shot-stopping, distribution).

Style: plain hyphens (-) only, no em-dashes or en-dashes. No emojis. Sentences readable by adults. Straight quotes (' "), not curly quotes.`;

// =========================================================================
// Groq client + per-exercise generation
// =========================================================================
const client = new Groq();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateExerciseContent(ex, attempt = 1) {
  const userMessage = `Generate localized coaching content for this goalkeeper exercise.

Exercise metadata:
- slug: ${ex.slug}
- category: football_goalkeeper
- difficulty: ${ex.difficulty}
- duration_minutes: ${ex.duration_minutes}
- equipment: ball
- focus: ${ex.hint}

Return JSON only.`;

  try {
    const response = await client.chat.completions.create({
      model: MODEL_ID,
      max_tokens: 4500,
      temperature: 0.5,
      response_format: {
        type: 'json_schema',
        json_schema: SCHEMA,
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const parsed = JSON.parse(text);

    // Quick validation
    for (const loc of ['en', 'pl', 'it', 'uk']) {
      if (!parsed.name?.[loc] || !parsed.description?.[loc] || !parsed.instructions?.[loc]) {
        throw new Error(`Missing fields for locale ${loc}`);
      }
      if (!Array.isArray(parsed.key_focus?.[loc]) || parsed.key_focus[loc].length < 3) {
        throw new Error(`Bad key_focus for locale ${loc}`);
      }
      // Project rule: no em-dashes / en-dashes. Replace with plain hyphen.
      // Also normalize curly quotes to straight quotes for SQL safety.
      const fixDash = (s) => s
        .replace(/[—–]/g, '-') // em-dash, en-dash -> hyphen
        .replace(/[‘’]/g, "'") // curly single quotes -> straight
        .replace(/[“”]/g, '"'); // curly double quotes -> straight
      parsed.name[loc] = fixDash(parsed.name[loc]);
      parsed.description[loc] = fixDash(parsed.description[loc]);
      parsed.instructions[loc] = fixDash(parsed.instructions[loc]);
      parsed.why_matters[loc] = fixDash(parsed.why_matters[loc]);
      parsed.pro_tip[loc] = fixDash(parsed.pro_tip[loc]);
      parsed.key_focus[loc] = parsed.key_focus[loc].map(fixDash);
    }

    // Quality check: ensure Ukrainian uses Cyrillic. If a UK field has
    // zero Cyrillic chars (just ASCII), reject and retry — the model
    // sometimes echoes English for UK locale.
    const hasUkCyrillic = (s) => /[Ѐ-ӿ]/.test(s);
    const ukFields = [
      parsed.name.uk,
      parsed.description.uk,
      parsed.instructions.uk,
      parsed.why_matters.uk,
      parsed.pro_tip.uk,
      ...parsed.key_focus.uk,
    ];
    const ukAsciiOnly = ukFields.filter((s) => !hasUkCyrillic(s)).length;
    // Tolerate up to 1 field being non-Cyrillic (e.g. a short proper-noun bullet).
    if (ukAsciiOnly > 1) {
      throw new Error(`UK content not in Cyrillic (${ukAsciiOnly}/${ukFields.length} fields are ASCII)`);
    }

    return parsed;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const backoffMs = 2000 * Math.pow(2, attempt - 1);
      console.warn(`  ! attempt ${attempt} failed (${err.message}). retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      return generateExerciseContent(ex, attempt + 1);
    }
    console.error(`  ! all ${MAX_RETRIES} attempts failed for ${ex.slug}: ${err.message}`);
    return null; // signals fallback
  }
}

// =========================================================================
// SQL helpers
// =========================================================================
function sqlString(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlJsonb(obj) {
  return `${sqlString(JSON.stringify(obj))}::jsonb`;
}

function sqlTextArray(arr) {
  if (!arr || arr.length === 0) return `'{}'::text[]`;
  // Postgres array literal: wrap each element with double quotes if it contains special chars
  const items = arr.map((s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',');
  return `'{${items}}'::text[]`;
}

function fallbackContent(ex) {
  // Bare-minimum English-only placeholder when Groq fails all retries.
  // Other locales fall back to EN so the row still has all 4 keys.
  const enName = ex.slug.replace(/^gk-/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const enDesc = `Goalkeeper exercise: ${enName}. ${ex.hint}.`;
  const enInstr = `1. Set up. 2. Execute the drill. 3. Reset and repeat.`;
  const enWhy = `Develops core goalkeeping skills (${ex.hint}).`;
  const enKeys = ['Technique', 'Set position', 'Hands'];
  const enTip = 'Focus on quality of technique over speed.';
  return {
    name: { en: enName, pl: enName, it: enName, uk: enName },
    description: { en: enDesc, pl: enDesc, it: enDesc, uk: enDesc },
    instructions: { en: enInstr, pl: enInstr, it: enInstr, uk: enInstr },
    why_matters: { en: enWhy, pl: enWhy, it: enWhy, uk: enWhy },
    key_focus: { en: enKeys, pl: enKeys, it: enKeys, uk: enKeys },
    pro_tip: { en: enTip, pl: enTip, it: enTip, uk: enTip },
  };
}

function buildRowTuple(ex, content) {
  // The 'description' column is plain JSONB description. The step-by-step
  // 'instructions' field from Groq is appended into the description JSONB,
  // matching how migration 0013 merged description + instructions into the
  // single description column.
  const mergedDescription = {};
  for (const loc of ['en', 'pl', 'it', 'uk']) {
    mergedDescription[loc] = `${content.description[loc]} ${content.instructions[loc]}`.trim();
  }

  const minAge = 8;
  const maxAge = 99;

  return `  (
    ${sqlString(ex.slug)},
    'football_goalkeeper',
    ${sqlString(ex.difficulty)},
    ${sqlJsonb(content.name)},
    ${sqlJsonb(mergedDescription)},
    null,
    ${sqlTextArray(['ball'])},
    ${ex.duration_minutes},
    ${minAge},
    ${maxAge},
    ${sqlJsonb(content.why_matters)},
    ${sqlJsonb(content.key_focus)},
    ${sqlJsonb(content.pro_tip)}
  )`;
}

// =========================================================================
// Main
// =========================================================================
async function main() {
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Exercises: ${EXERCISES.length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Cache: ${CACHE_PATH}`);
  if (onlySlugs) {
    console.log(`Filter: --only=${[...onlySlugs].join(',')}`);
  }
  console.log('');

  // Load cache if present (resume support across rate-limited runs).
  const cache = existsSync(CACHE_PATH)
    ? JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
    : {};
  const cachedCount = Object.keys(cache).length;
  if (cachedCount > 0) {
    console.log(`Loaded cache: ${cachedCount} exercises already generated.`);
  }

  let succeeded = 0;
  let fallbackCount = 0;
  let fromCache = 0;

  for (let i = 0; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];

    // If --only is set, skip exercises not in it (still use cache for output).
    if (onlySlugs && !onlySlugs.has(ex.slug)) {
      if (cache[ex.slug]) {
        fromCache++;
      }
      continue;
    }

    // If cached and we're not regenerating, skip the API call.
    if (cache[ex.slug] && !onlySlugs) {
      fromCache++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${EXERCISES.length}] ${ex.slug} ... `);

    const content = await generateExerciseContent(ex);
    if (content) {
      cache[ex.slug] = content;
      writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
      console.log('ok');
      succeeded++;
    } else {
      console.log('FALLBACK');
      fallbackCount++;
    }

    // Politeness pacing
    if (i < EXERCISES.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Build rows from the final cache (or fallback for any slug not in cache).
  const rows = EXERCISES.map((ex) => {
    const content = cache[ex.slug] ?? fallbackContent(ex);
    return buildRowTuple(ex, content);
  });

  const fallbackSlugs = EXERCISES.filter((ex) => !cache[ex.slug]).map((ex) => ex.slug);
  if (fallbackSlugs.length > 0) {
    console.log(`\nWARNING: ${fallbackSlugs.length} exercises have FALLBACK content (English placeholder only):`);
    fallbackSlugs.forEach((s) => console.log(`  - ${s}`));
  }

  // Assemble SQL
  const header = `-- 0026_goalkeeper_exercises_seed.sql
-- 14 goalkeeper exercises (category football_goalkeeper).
-- Generated ${new Date().toISOString().slice(0, 10)} by scripts/generate-goalkeeper-seed.mjs via Groq ${MODEL_ID}.
-- Coaching fields use the JSONB shape introduced by migration 0011 and seeded
-- for football in migration 0013.
--
-- video_url is NULL for all rows: goalkeeper videos are sourced separately
-- (WebSearch + oEmbed) in a follow-up migration.
--
-- IMPORTANT: migration 0025 introduced the football_goalkeeper category
-- (profiles.is_goalkeeper flag) but did NOT extend exercises_category_check.
-- The constraint was last set by 0013 and allows the four football_* outfield
-- categories only. This migration extends it to include football_goalkeeper
-- BEFORE inserting, so the INSERT does not violate the check.

-- Extend category constraint to include football_goalkeeper
alter table public.exercises drop constraint if exists exercises_category_check;
alter table public.exercises add constraint exercises_category_check
  check (category in (
    'warmup', 'functional', 'team', 'balance',
    'flexibility', 'cardio', 'mobility', 'cooldown',
    'green', 'pair',
    'football_warmup', 'football_drill', 'football_trick', 'football_game',
    'football_goalkeeper'
  ));

insert into public.exercises (
  slug, category, difficulty,
  name, description,
  video_url, equipment, duration_minutes,
  min_age, max_age,
  why_matters, key_focus, pro_tip
) values
`;

  const sql = header + rows.join(',\n') + '\n;\n';
  writeFileSync(OUTPUT_PATH, sql, 'utf8');

  console.log('');
  console.log(`Done. ${succeeded} newly succeeded, ${fromCache} from cache, ${fallbackCount} fallback (this run).`);
  console.log(`Total cached: ${Object.keys(cache).length}/${EXERCISES.length}.`);
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
