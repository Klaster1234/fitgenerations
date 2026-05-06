import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { WeatherSnapshot } from '@/lib/weather';

// --- Types ----------------------------------------------------------------

export type Profile = {
  locale: 'en' | 'pl' | 'it' | 'uk';
  age: number;
  fitness_level: 'low' | 'mid' | 'high';
  equipment: string[];
  goals: string[];
  city: string | null;
};

export type ExerciseCandidate = {
  slug: string;
  category: string;
  difficulty: 'low' | 'mid' | 'high';
  name: string; // already localized
  duration_minutes: number;
  equipment: string[];
};

export const planSchema = z.object({
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

export type GeneratedPlan = z.infer<typeof planSchema>;

// --- Model configuration --------------------------------------------------

// Override via env if needed; default to the current top model per Anthropic guidance.
const MODEL_ID = process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-7';

// Stable system prompt — eligible for prompt caching across calls.
// Keep deterministic; do NOT interpolate timestamps or per-user data here.
const SYSTEM_PROMPT = `You are FitGenerations Smart TrAIner — an AI training companion for an EU-funded sport-and-inclusion project.

Your job: pick 3 to 5 exercises from a provided catalogue and assemble a short daily plan that is realistic for the user's age, fitness, equipment and weather.

Hard rules:
1. Use ONLY exercises whose slug appears in the provided catalogue. Never invent slugs.
2. Each exercise duration must be 3-30 minutes. Total plan duration 15-60 minutes.
3. Order matters: warmup first, main work in the middle, cooldown last.
4. Adapt to age: for users 60+ avoid high-impact and prefer 'low' difficulty; for users under 16 keep it playful and short.
5. Respect equipment: never select exercises requiring equipment the user does not have. If equipment list is empty, body-weight only.
6. Respect weather: if outdoor-friendly is false, prefer indoor exercises (avoid 'park' equipment).
7. Tone: warm, encouraging, plain language. Avoid jargon, avoid emojis. The user may be a senior or a teenager — calibrate accordingly.
8. Localization: write greeting, motivation and ai_note IN THE USER'S LOCALE (en/pl/it/uk). Use natural phrasing for that language.

Output: return only JSON conforming to the schema. No prose outside the JSON.`;

// --- Generator ------------------------------------------------------------

export async function generatePlan(args: {
  profile: Profile;
  weather: WeatherSnapshot | null;
  date: string; // YYYY-MM-DD
  catalogue: ExerciseCandidate[];
}): Promise<GeneratedPlan> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic();

  // The schema we ask Claude to fill (kept simple — Anthropic structured outputs).
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

  const userPayload = {
    user_profile: args.profile,
    weather: args.weather,
    date: args.date,
    exercise_catalogue: args.catalogue,
  };

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 2000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }, // 5-min prompt cache
      },
    ],
    output_config: { format: { type: 'json_schema', schema: jsonSchema } },
    messages: [
      {
        role: 'user',
        content: `Build today's plan for this user. Respond with JSON only.\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });

  // Parse the response. The first text block contains the JSON.
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = planSchema.parse(JSON.parse(textBlock.text));

  // Defensive: filter items to those whose slug is in the catalogue.
  const validSlugs = new Set(args.catalogue.map((c) => c.slug));
  parsed.items = parsed.items
    .filter((it) => validSlugs.has(it.exercise_slug))
    .sort((a, b) => a.order - b.order);

  if (parsed.items.length < 3) {
    throw new Error('AI returned too few valid exercises');
  }

  return parsed;
}
