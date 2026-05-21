// Admin one-off: force-regenerate today's plan for a specific user by
// running the FULL ensureTodayPlan logic end-to-end against prod Supabase
// + Groq. Used 2026-05-21 to validate the Zod-nullable fix without
// requiring the user to click "Regenerate" in the browser.
//
// Usage:
//   SUPABASE_URL=https://...supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   GROQ_API_KEY=gsk_... \
//   USER_ID=5f6fa791-... \
//   node scripts/force-regenerate-for-user.mjs

import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// --- Identical schemas to src/lib/ai/plan-service.ts ---------------------

const profileRowSchema = z.object({
  locale: z.enum(['en', 'pl', 'it', 'uk']).nullable().optional(),
  age: z.number().int().min(6).max(120).nullable().optional(),
  fitness_level: z.enum(['low', 'mid', 'high']).nullable().optional(),
  equipment: z.array(z.string()).nullable().optional(),
  goals: z.array(z.string()).nullable().optional(),
  city: z.string().nullable().optional(),
  trains_with_partner: z.boolean().nullable().optional(),
  role: z.enum(['participant', 'trainer']).nullable().optional(),
});

const exerciseRowSchema = z.object({
  slug: z.string(),
  category: z.string(),
  difficulty: z.enum(['low', 'mid', 'high']),
  // The fix: accept null values for untranslated locales
  name: z.record(z.string(), z.string().nullable()),
  duration_minutes: z.number().int().min(1).max(60),
  equipment: z.array(z.string()),
  min_age: z.number().int(),
  max_age: z.number().int(),
});

const planSchema = z.object({
  greeting: z.string(),
  motivation: z.string(),
  total_minutes: z.number().int().min(5).max(90),
  items: z
    .array(
      z.object({
        exercise_slug: z.string(),
        duration_minutes: z.number().int().min(1).max(45),
        ai_note: z.string(),
        order: z.number().int().min(1),
      }),
    )
    .min(3)
    .max(7),
});

const SYSTEM_PROMPT = `You are FitGenerations Smart TrAIner - an AI training companion for an EU-funded sport-and-inclusion project.

Your job: pick 3 to 5 exercises from a provided catalogue and assemble a short daily plan that is realistic for the user's age, fitness, equipment and weather.

Hard rules:
1. Use ONLY exercises whose slug appears in the provided catalogue. Never invent slugs.
2. Each exercise duration must be 3-30 minutes. Total plan duration 15-60 minutes.
3. Order matters: warmup first, main work in the middle, cooldown last.
4. Adapt to age: for users 60+ avoid high-impact and prefer 'low' difficulty; for users under 16 keep it playful and short.
5. Respect equipment: never select exercises requiring equipment the user does not have. If equipment list is empty, body-weight only.
6. Respect weather: if outdoor-friendly is false, prefer indoor exercises (avoid 'park' equipment).
7. Tone: warm, encouraging, plain language. Avoid jargon, avoid emojis. The user may be a senior or a teenager - calibrate accordingly.
8. Localization: write greeting, motivation and ai_note IN THE USER'S LOCALE (en/pl/it/uk). Use natural phrasing for that language.
9. Partner training: when user_profile.trains_with_partner is true, include AT LEAST ONE exercise from category 'pair' if any are present in the catalogue, and frame the motivation around training together.

Output: return only JSON conforming to the schema. No prose outside the JSON.`;

const jsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    greeting: { type: 'string' },
    motivation: { type: 'string' },
    total_minutes: { type: 'integer' },
    items: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          exercise_slug: { type: 'string' },
          duration_minutes: { type: 'integer' },
          ai_note: { type: 'string' },
          order: { type: 'integer' },
        },
        required: ['exercise_slug', 'duration_minutes', 'ai_note', 'order'],
      },
    },
  },
  required: ['greeting', 'motivation', 'total_minutes', 'items'],
};

// --- Main --------------------------------------------------------------

const userId = process.env.USER_ID;
if (!userId) throw new Error('USER_ID env required');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const groq = new Groq();
const MODEL_ID = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

console.log(`User: ${userId}\nModel: ${MODEL_ID}\n`);

// 1. Profile
const { data: rawProfile, error: profErr } = await supabase
  .from('profiles')
  .select('locale, age, fitness_level, equipment, goals, city, trains_with_partner, role')
  .eq('id', userId)
  .single();
if (profErr) throw profErr;
const profileRow = profileRowSchema.parse(rawProfile);
const profile = {
  locale: profileRow.locale ?? 'en',
  age: profileRow.age ?? 40,
  fitness_level: profileRow.fitness_level ?? 'mid',
  equipment: profileRow.equipment ?? [],
  goals: profileRow.goals ?? [],
  city: profileRow.city ?? null,
  trains_with_partner: profileRow.trains_with_partner ?? false,
  role: profileRow.role ?? 'participant',
};
console.log('Profile:', profile);

// 2. Exercises
const { data: rawExercises, error: exErr } = await supabase
  .from('exercises')
  .select('slug, category, difficulty, name, duration_minutes, equipment, min_age, max_age');
if (exErr) throw exErr;

const validatedRows = rawExercises
  .map((row) => {
    const parsed = exerciseRowSchema.safeParse(row);
    if (!parsed.success) {
      console.log(`  drop ${row.slug}: ${parsed.error.issues[0]?.message}`);
    }
    return parsed.success ? parsed.data : null;
  })
  .filter((r) => r !== null);
console.log(`Catalogue: ${rawExercises.length} raw -> ${validatedRows.length} validated`);

// 3. Filter
const allowedDifficulty = {
  low: new Set(['low']),
  mid: new Set(['low', 'mid']),
  high: new Set(['low', 'mid', 'high']),
};
const userEquip = new Set(profile.equipment.length ? profile.equipment : ['none']);
const catalogue = validatedRows
  .filter((ex) => {
    const equipOk = ex.equipment.length === 0 || ex.equipment.every((e) => userEquip.has(e));
    const ageOk = profile.age >= ex.min_age && profile.age <= ex.max_age;
    const diffOk = allowedDifficulty[profile.fitness_level].has(ex.difficulty);
    return equipOk && ageOk && diffOk;
  })
  .map((ex) => ({
    slug: ex.slug,
    category: ex.category,
    difficulty: ex.difficulty,
    name: ex.name[profile.locale] ?? ex.name.en ?? ex.slug,
    duration_minutes: ex.duration_minutes,
    equipment: ex.equipment,
  }));
console.log(`Filtered for profile: ${catalogue.length} exercises`);
if (catalogue.length < 3) throw new Error('catalogue too small');

// 4. Call Groq
console.log('\nCalling Groq...');
const t0 = Date.now();
const response = await groq.chat.completions.create({
  model: MODEL_ID,
  max_tokens: 2000,
  temperature: 0.6,
  reasoning_effort: 'low',
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'daily_plan',
      schema: jsonSchema,
      strict: true,
    },
  },
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Build today's plan for this user. Respond with JSON only.\n\n${JSON.stringify({ user_profile: profile, weather: null, date: new Date().toISOString().slice(0, 10), exercise_catalogue: catalogue }, null, 2)}`,
    },
  ],
});
const ms = Date.now() - t0;
const text = response.choices[0]?.message?.content;
const aiPlan = planSchema.parse(JSON.parse(text));
console.log(`Got plan in ${ms}ms`);
console.log(`Greeting: ${aiPlan.greeting}`);
console.log(`Motivation: ${aiPlan.motivation}`);
aiPlan.items.forEach((it) =>
  console.log(`  ${it.order}. ${it.exercise_slug} (${it.duration_minutes}min): ${it.ai_note}`),
);

// 5. Defensive slug check
const validSlugs = new Set(catalogue.map((c) => c.slug));
aiPlan.items = aiPlan.items
  .filter((it) => validSlugs.has(it.exercise_slug))
  .sort((a, b) => a.order - b.order);
if (aiPlan.items.length < 3) throw new Error('AI returned too few valid exercises');

// 6. Upsert into daily_plans
const today = new Date().toISOString().slice(0, 10);
const planRow = {
  user_id: userId,
  plan_date: today,
  weather: null,
  items: aiPlan.items,
  ai_summary: `${aiPlan.greeting}\n\n${aiPlan.motivation}`,
  ai_model: MODEL_ID,
  locale: profile.locale,
};
const { data: saved, error: saveErr } = await supabase
  .from('daily_plans')
  .upsert(planRow, { onConflict: 'user_id,plan_date' })
  .select()
  .single();
if (saveErr) throw saveErr;

console.log(`\n✅ daily_plans row upserted (id=${saved.id}, ai_model=${saved.ai_model})`);
console.log(`User can refresh /pl/plan now.`);
