// Generates supabase/migrations/0013_football_exercises_seed.sql by calling
// Groq with structured outputs for each of 40 football exercises x 4 locales.
//
// Usage:
//   GROQ_API_KEY=gsk_... node scripts/generate-football-seed.mjs
//   # or, .env.local is auto-loaded via @next/env
//
// Notes:
//  - Uses groq-sdk (already in package.json) — the spec mentioned `openai`,
//    but that's not installed and groq-sdk exposes the same chat.completions
//    API with structured outputs.
//  - Default model is `openai/gpt-oss-120b`; Llama 3.3 70B is documented
//    (in plan-generator.ts) to 400 on response_format: json_schema. Override
//    via GROQ_MODEL env var if needed.
//  - This script writes a SQL file. It does NOT apply the migration. Apply
//    via scripts/apply-migrations.mjs after review.

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
const OUTPUT_PATH = join(projectDir, 'supabase', 'migrations', '0013_football_exercises_seed.sql');
const CACHE_PATH = join(projectDir, 'scripts', 'football-seed-cache.json');
// Pacing: be polite to free-tier rate limits. Override via env.
// gpt-oss-20b: 8K TPM, needs ~11000ms.
// llama-4-scout: higher TPM, ~1200ms is fine.
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS ?? 1500);
const MAX_RETRIES = 3;

// CLI: --only=slug1,slug2  (regenerate only these), default = all that aren't cached
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlySlugs = onlyArg ? new Set(onlyArg.slice(7).split(',').filter(Boolean)) : null;

// =========================================================================
// Exercise list (40 exercises). Video URLs are placeholders; broken URLs
// just render an empty iframe on /football and do not break builds.
// =========================================================================
const EXERCISES = [
  // ====== 8 FOOTBALL_WARMUP ======
  { slug: 'football-jogging-with-ball', category: 'football_warmup', difficulty: 'low', duration_minutes: 4, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=qFTjyXNXSBE' },
  { slug: 'fifa-11plus-running-program', category: 'football_warmup', difficulty: 'low', duration_minutes: 5, equipment: [], video_url: 'https://www.youtube.com/watch?v=oCaarADKWRk' },
  { slug: 'dynamic-leg-swings-ball', category: 'football_warmup', difficulty: 'low', duration_minutes: 3, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=Vbsgi0gOPHs' },
  { slug: 'ladder-agility-warmup', category: 'football_warmup', difficulty: 'mid', duration_minutes: 4, equipment: [], video_url: 'https://www.youtube.com/watch?v=Bdr0vKBsdT0' },
  { slug: 'high-knees-with-ball-pickup', category: 'football_warmup', difficulty: 'mid', duration_minutes: 3, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=7QwGyOQfL_E' },
  { slug: 'side-shuffle-and-pass', category: 'football_warmup', difficulty: 'low', duration_minutes: 4, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=AnP_MJq3hMo' },
  { slug: 'open-close-the-gate', category: 'football_warmup', difficulty: 'low', duration_minutes: 3, equipment: [], video_url: 'https://www.youtube.com/watch?v=DDqgGYzWVI4' },
  { slug: 'progressive-sprints', category: 'football_warmup', difficulty: 'mid', duration_minutes: 5, equipment: [], video_url: 'https://www.youtube.com/watch?v=Ji_kSAB9Bj0' },

  // ====== 12 FOOTBALL_DRILL ======
  { slug: 'wall-pass-rebound', category: 'football_drill', difficulty: 'low', duration_minutes: 8, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=K9zMUbHBxSE' },
  { slug: 'cone-dribbling-slalom', category: 'football_drill', difficulty: 'mid', duration_minutes: 8, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=NKWlvwGcw30' },
  { slug: 'shooting-accuracy-targets', category: 'football_drill', difficulty: 'mid', duration_minutes: 10, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=cdz7nzHm6Eg' },
  { slug: 'first-touch-receive-and-go', category: 'football_drill', difficulty: 'low', duration_minutes: 6, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=I9b21UrCnCM' },
  { slug: 'weak-foot-100-touches', category: 'football_drill', difficulty: 'low', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=qXAjlbb_T2g' },
  { slug: 'juggling-progression', category: 'football_drill', difficulty: 'mid', duration_minutes: 6, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=PCN8_C5IhEs' },
  { slug: 'one-v-one-defense-stance', category: 'football_drill', difficulty: 'mid', duration_minutes: 8, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=LF_LD6w7DD8' },
  { slug: 'long-pass-accuracy', category: 'football_drill', difficulty: 'high', duration_minutes: 10, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=B5e7g7nrxlk' },
  { slug: 'headers-pair-exchange', category: 'football_drill', difficulty: 'mid', duration_minutes: 6, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=mRyMjp-1JsM' },
  { slug: 'finishing-first-time', category: 'football_drill', difficulty: 'high', duration_minutes: 10, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=3VXG1ihKjg0' },
  { slug: 'set-piece-corner-delivery', category: 'football_drill', difficulty: 'mid', duration_minutes: 8, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=8r6sM47lN4M' },
  { slug: 'agility-t-drill', category: 'football_drill', difficulty: 'mid', duration_minutes: 5, equipment: [], video_url: 'https://www.youtube.com/watch?v=BgFwLnNl91I' },

  // ====== 12 FOOTBALL_TRICK ======
  { slug: 'cruyff-turn', category: 'football_trick', difficulty: 'mid', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=NySWdgkfQNk' },
  { slug: 'step-over', category: 'football_trick', difficulty: 'mid', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=8KFRX0wAuEM' },
  { slug: 'scissors-double-touch', category: 'football_trick', difficulty: 'mid', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=lEv7QTRJC2Q' },
  { slug: 'elastico', category: 'football_trick', difficulty: 'high', duration_minutes: 6, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=AALdtkH5oUk' },
  { slug: 'rabona', category: 'football_trick', difficulty: 'high', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=jGcS4_mC_5g' },
  { slug: 'rainbow-flick', category: 'football_trick', difficulty: 'high', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=KrYAlcXKErw' },
  { slug: 'maradona-spin', category: 'football_trick', difficulty: 'high', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=YJgRq-tQtAU' },
  { slug: 'fake-shot', category: 'football_trick', difficulty: 'mid', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=yPdW1Pdq0Z8' },
  { slug: 'body-feint', category: 'football_trick', difficulty: 'low', duration_minutes: 4, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=WAEPmQM3K7g' },
  { slug: 'drag-back', category: 'football_trick', difficulty: 'low', duration_minutes: 4, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=jhCJUbsiYE0' },
  { slug: 'la-croqueta', category: 'football_trick', difficulty: 'mid', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=qaGYZsffPNg' },
  { slug: 'no-look-pass', category: 'football_trick', difficulty: 'high', duration_minutes: 5, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=gffsAaXEK_M' },

  // ====== 8 FOOTBALL_GAME ======
  { slug: 'one-v-one-mini-goals', category: 'football_game', difficulty: 'mid', duration_minutes: 12, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=u_QvGswOJxc' },
  { slug: 'two-v-two-possession-rondo', category: 'football_game', difficulty: 'mid', duration_minutes: 12, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=ESEjTbZxs90' },
  { slug: 'three-v-three-mini-match', category: 'football_game', difficulty: 'mid', duration_minutes: 15, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=PT5GjuVT83I' },
  { slug: 'world-cup-tournament', category: 'football_game', difficulty: 'high', duration_minutes: 20, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=Y4Bcjp5q8m0' },
  { slug: 'intergenerational-10-passes', category: 'football_game', difficulty: 'low', duration_minutes: 10, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=jpDDqQg9aXc' },
  { slug: 'goalkeeper-challenge-weak-foot', category: 'football_game', difficulty: 'low', duration_minutes: 10, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=pLI4qIRT-G8' },
  { slug: 'freestyle-juggling-comp', category: 'football_game', difficulty: 'mid', duration_minutes: 8, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=tcfRdkrqYzs' },
  { slug: 'shooting-king-of-the-hill', category: 'football_game', difficulty: 'mid', duration_minutes: 12, equipment: ['ball'], video_url: 'https://www.youtube.com/watch?v=hLLmKEogJ_Q' },
];

// =========================================================================
// Structured output schema (per-exercise)
// =========================================================================
const SCHEMA = {
  name: 'football_exercise_content',
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
const SYSTEM_PROMPT = `You are a football coaching expert. For each exercise, produce localized content (EN/PL/IT/UK) covering:
- name: 2-5 words
- description: 1-2 plain-language sentences
- instructions: 3-5 sentences, numbered steps
- why_matters: 2-3 sentences, motivation plus famous players who use it
- key_focus: array of 3-5 short bullet strings, what to focus on
- pro_tip: one memorable sentence

Locale rules (MANDATORY):
- Polish (pl): use proper football terminology (zwod, kiwka, podanie, drybling, zwod ciala).
- Italian (it): native football vocabulary (finta, dribbling, tunnel, sombrero).
- Ukrainian (uk): MUST be written in Cyrillic script (Ukrainian alphabet). Do not write English under the uk key. Technical terms like "trick" can be loaned as "трик", "фінт" - but the whole sentence is Ukrainian. Reference players include Шевченко, Зінченко, Усик-fans say his name in Cyrillic. Cyrillic alphabet, not Latin.
- English (en): plain US/UK English.

Style: plain hyphens (-) only, no em-dashes (—) or en-dashes (–). No emojis. Sentences readable by adults. Straight quotes (' "), not curly quotes.`;

// =========================================================================
// Groq client + per-exercise generation
// =========================================================================
const client = new Groq();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateExerciseContent(ex, attempt = 1) {
  const userMessage = `Generate localized coaching content for this football exercise.

Exercise metadata:
- slug: ${ex.slug}
- category: ${ex.category}
- difficulty: ${ex.difficulty}
- duration_minutes: ${ex.duration_minutes}
- equipment: ${ex.equipment.length ? ex.equipment.join(', ') : 'none (bodyweight)'}

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

function sqlNullableUrl(url) {
  return url ? sqlString(url) : 'null';
}

function fallbackContent(ex) {
  // Bare-minimum English-only placeholder when Groq fails all retries.
  // Other locales fall back to EN so the row still has all 4 keys.
  const enName = ex.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const enDesc = `Football exercise: ${enName}.`;
  const enInstr = `1. Set up. 2. Execute. 3. Recover.`;
  const enWhy = `Develops core football skills for ${ex.category}.`;
  const enKeys = ['Technique', 'Tempo', 'Control'];
  const enTip = 'Focus on quality of execution over speed.';
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
  // The 'description' column in the existing schema is plain JSONB description.
  // The longer step-by-step 'instructions' field from Groq is appended into
  // the description JSONB as an extra section, since the schema doesn't
  // have a dedicated instructions column. (Plan 6.3 lists columns: slug,
  // category, difficulty, name, description, video_url, equipment,
  // duration_minutes, min_age, max_age, why_matters, key_focus, pro_tip.)
  const mergedDescription = {};
  for (const loc of ['en', 'pl', 'it', 'uk']) {
    mergedDescription[loc] = `${content.description[loc]} ${content.instructions[loc]}`.trim();
  }

  const minAge = ex.slug === 'intergenerational-10-passes' ? 8 : 12;
  const maxAge = 99;

  return `  (
    ${sqlString(ex.slug)},
    ${sqlString(ex.category)},
    ${sqlString(ex.difficulty)},
    ${sqlJsonb(content.name)},
    ${sqlJsonb(mergedDescription)},
    ${sqlNullableUrl(ex.video_url)},
    ${sqlTextArray(ex.equipment)},
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
  const header = `-- 0013_football_exercises_seed.sql
-- 40 football exercises (8 warmup + 12 drill + 12 trick + 8 game).
-- Generated 2026-05-28 by scripts/generate-football-seed.mjs via Groq ${MODEL_ID}.
-- Coaching fields use the JSONB shape introduced by migration 0011.
--
-- IMPORTANT: this migration first extends the exercises_category_check
-- constraint to allow football_* categories. Migrations 0011 and 0012
-- added coaching columns and RLS but did not touch the category check.

-- Extend category constraint to include football_*
alter table public.exercises drop constraint if exists exercises_category_check;
alter table public.exercises add constraint exercises_category_check
  check (category in (
    'warmup', 'functional', 'team', 'balance',
    'flexibility', 'cardio', 'mobility', 'cooldown',
    'green', 'pair',
    'football_warmup', 'football_drill', 'football_trick', 'football_game'
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
