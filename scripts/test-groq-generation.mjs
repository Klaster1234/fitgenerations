// One-off script that hits Groq directly using the EXACT same payload shape
// as src/lib/ai/plan-generator.ts. Verifies that Llama 3.3 70B + Structured
// Outputs actually produces valid plans across our 4 locales and edge cases.
// Run: GROQ_API_KEY=gsk_... node scripts/test-groq-generation.mjs

import Groq from 'groq-sdk';

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

// Realistic slice of the actual catalogue (matches what plan-service.ts
// would filter to for each profile). Pair entries deliberately included
// for the partner test.
const FULL_CATALOGUE = [
  { slug: 'arm-circles', category: 'warmup', difficulty: 'low', duration_minutes: 3, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'shoulder-rolls', category: 'warmup', difficulty: 'low', duration_minutes: 2, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'marching-in-place', category: 'warmup', difficulty: 'low', duration_minutes: 3, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'hip-circles', category: 'warmup', difficulty: 'low', duration_minutes: 2, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'wall-pushup', category: 'functional', difficulty: 'low', duration_minutes: 5, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'chair-sit-to-stand', category: 'functional', difficulty: 'low', duration_minutes: 5, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'bodyweight-squat', category: 'functional', difficulty: 'mid', duration_minutes: 6, equipment: [], min_age: 12, max_age: 100 },
  { slug: 'lunge', category: 'functional', difficulty: 'mid', duration_minutes: 5, equipment: [], min_age: 12, max_age: 90 },
  { slug: 'row-band', category: 'functional', difficulty: 'mid', duration_minutes: 5, equipment: ['bands'], min_age: 12, max_age: 90 },
  { slug: 'glute-bridge', category: 'functional', difficulty: 'low', duration_minutes: 5, equipment: ['mat'], min_age: 10, max_age: 100 },
  { slug: 'plank-knee', category: 'functional', difficulty: 'mid', duration_minutes: 4, equipment: ['mat'], min_age: 12, max_age: 90 },
  { slug: 'heel-to-toe-walk', category: 'balance', difficulty: 'low', duration_minutes: 4, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'single-leg-stand', category: 'balance', difficulty: 'low', duration_minutes: 4, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'neck-stretches', category: 'mobility', difficulty: 'low', duration_minutes: 3, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'thoracic-rotation', category: 'mobility', difficulty: 'low', duration_minutes: 3, equipment: [], min_age: 8, max_age: 120 },
  { slug: 'yoga-cat-cow', category: 'flexibility', difficulty: 'low', duration_minutes: 3, equipment: ['mat'], min_age: 8, max_age: 120 },
  { slug: 'yoga-childs-pose', category: 'flexibility', difficulty: 'low', duration_minutes: 3, equipment: ['mat'], min_age: 8, max_age: 120 },
  { slug: 'seated-forward-fold', category: 'flexibility', difficulty: 'low', duration_minutes: 4, equipment: ['mat'], min_age: 6, max_age: 120 },
  { slug: 'deep-breathing', category: 'cooldown', difficulty: 'low', duration_minutes: 2, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'hamstring-stretch', category: 'cooldown', difficulty: 'low', duration_minutes: 4, equipment: ['mat'], min_age: 8, max_age: 120 },
  { slug: 'tai-chi-basics', category: 'green', difficulty: 'low', duration_minutes: 12, equipment: [], min_age: 8, max_age: 120 },
  { slug: 'pair-mirror', category: 'pair', difficulty: 'low', duration_minutes: 6, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'pair-stretch-back', category: 'pair', difficulty: 'low', duration_minutes: 4, equipment: ['mat'], min_age: 6, max_age: 120 },
  { slug: 'pair-toss', category: 'pair', difficulty: 'low', duration_minutes: 10, equipment: [], min_age: 6, max_age: 120 },
  { slug: 'pair-balance-hold', category: 'pair', difficulty: 'mid', duration_minutes: 5, equipment: [], min_age: 12, max_age: 100 },
];

// Helper - filter the catalogue the way plan-service.ts does
function filterCatalogue(profile) {
  const allowedDifficulty = {
    low: ['low'],
    mid: ['low', 'mid'],
    high: ['low', 'mid', 'high'],
  };
  const userEquip = new Set(profile.equipment.length ? profile.equipment : ['none']);
  return FULL_CATALOGUE.filter((ex) => {
    const equipOk = ex.equipment.length === 0 || ex.equipment.every((e) => userEquip.has(e));
    const ageOk = profile.age >= ex.min_age && profile.age <= ex.max_age;
    const diffOk = allowedDifficulty[profile.fitness_level].includes(ex.difficulty);
    return equipOk && ageOk && diffOk;
  }).map((ex) => ({
    slug: ex.slug,
    category: ex.category,
    difficulty: ex.difficulty,
    name: ex.slug.replace(/-/g, ' '),
    duration_minutes: ex.duration_minutes,
    equipment: ex.equipment,
  }));
}

const CASES = [
  {
    label: '🇵🇱 PL senior (70, low, mata, energia+mobilność, z partnerem)',
    profile: {
      locale: 'pl', age: 70, fitness_level: 'low',
      equipment: ['mat'], goals: ['energy', 'mobility'],
      city: 'Gliwice', trains_with_partner: true, role: 'participant',
    },
    weather: { city: 'Gliwice', temperatureC: 18, description: 'częściowe zachmurzenie', outdoorFriendly: true },
  },
  {
    label: '🇮🇹 IT mid (35, high, bands+mat, strength)',
    profile: {
      locale: 'it', age: 35, fitness_level: 'high',
      equipment: ['mat', 'bands'], goals: ['strength'],
      city: 'Potenza', trains_with_partner: false, role: 'participant',
    },
    weather: { city: 'Potenza', temperatureC: 24, description: 'sole', outdoorFriendly: true },
  },
  {
    label: '🇺🇦 UK senior (65, mid, brak sprzętu, social, z partnerem)',
    profile: {
      locale: 'uk', age: 65, fitness_level: 'mid',
      equipment: [], goals: ['social', 'mobility'],
      city: 'Wrocław', trains_with_partner: true, role: 'participant',
    },
    weather: { city: 'Wrocław', temperatureC: 12, description: 'deszcz', outdoorFriendly: false },
  },
  {
    label: '🇬🇧 EN child (10, mid, park, social)',
    profile: {
      locale: 'en', age: 10, fitness_level: 'mid',
      equipment: ['park'], goals: ['social', 'energy'],
      city: 'London', trains_with_partner: false, role: 'participant',
    },
    weather: { city: 'London', temperatureC: 16, description: 'partly cloudy', outdoorFriendly: true },
  },
];

const client = new Groq();
const MODEL_ID = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

async function runCase(c) {
  const catalogue = filterCatalogue(c.profile);
  const userPayload = {
    user_profile: c.profile,
    weather: c.weather,
    date: '2026-05-21',
    exercise_catalogue: catalogue,
  };

  const t0 = Date.now();
  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL_ID,
      max_tokens: 2000,
      temperature: 0.6,
      reasoning_effort: 'low',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'daily_plan',
          description: 'A short daily training plan with localized copy.',
          schema: jsonSchema,
          strict: true,
        },
      },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Build today's plan for this user. Respond with JSON only.\n\n${JSON.stringify(userPayload, null, 2)}` },
      ],
    });
  } catch (err) {
    console.log(`\n========================================\n${c.label}\n========================================`);
    console.log('❌ API ERROR:', err.message);
    return { ok: false, error: err.message };
  }
  const ms = Date.now() - t0;
  const text = response.choices[0]?.message?.content ?? '';

  console.log(`\n========================================\n${c.label}\nLatency: ${ms}ms | tokens: ${response.usage?.total_tokens}\n========================================`);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log('❌ JSON PARSE FAIL\nRaw:', text.slice(0, 500));
    return { ok: false, ms, error: 'parse' };
  }

  // Validate items belong to filtered catalogue
  const validSlugs = new Set(catalogue.map((c) => c.slug));
  const invalidItems = parsed.items.filter((it) => !validSlugs.has(it.exercise_slug));
  const pairItems = parsed.items.filter((it) => {
    const cat = catalogue.find((c) => c.slug === it.exercise_slug)?.category;
    return cat === 'pair';
  });

  console.log(`Greeting: ${parsed.greeting}`);
  console.log(`Motivation: ${parsed.motivation}`);
  console.log(`Total: ${parsed.total_minutes} min · ${parsed.items.length} exercises`);
  parsed.items.forEach((it) => {
    const cat = catalogue.find((c) => c.slug === it.exercise_slug)?.category ?? '?';
    const flag = validSlugs.has(it.exercise_slug) ? '✓' : '✗ INVALID';
    console.log(`  ${it.order}. [${flag}] ${it.exercise_slug} (${cat}, ${it.duration_minutes}min)\n     ${it.ai_note}`);
  });

  // Verdicts
  const verdicts = [];
  verdicts.push(invalidItems.length === 0 ? '✅ all slugs valid' : `❌ ${invalidItems.length} invalid slugs`);
  if (c.profile.trains_with_partner) {
    verdicts.push(pairItems.length >= 1 ? '✅ pair exercise included' : '❌ no pair exercise (rule 9)');
  }
  const total = parsed.items.reduce((sum, it) => sum + it.duration_minutes, 0);
  verdicts.push(total >= 15 && total <= 60 ? '✅ total duration OK' : `⚠️  total ${total}min outside 15-60`);

  console.log('Verdicts: ' + verdicts.join(' | '));
  return { ok: true, ms, parsed, verdicts };
}

console.log(`Model: ${MODEL_ID}`);
console.log(`Cases: ${CASES.length}\n`);

for (const c of CASES) {
  await runCase(c);
  // Small gap between calls to be polite to free-tier rate limits
  await new Promise((r) => setTimeout(r, 1500));
}

console.log('\nDone.');
