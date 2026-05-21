import 'server-only';
import Groq from 'groq-sdk';
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
  // When true, the AI prefers `category: 'pair'` exercises so the user can
  // train with a partner (grandparent + grandchild flow is the RDZEŃ of the
  // Erasmus+ proposal).
  trains_with_partner: boolean;
  // Self-declared role. Trainers see the /trainer dashboard and can create
  // owned groups; participants just join via group_code.
  role: 'participant' | 'trainer';
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

// Groq's free tier hosts Llama 3.3 70B and Llama 4 variants. Llama 3.3 70B
// is the safe default: well-tested JSON-mode + Structured Outputs, strong
// PL/IT/UK copy, ~700ms latency. Override via env if you want to A/B test.
const MODEL_ID = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

// System prompt is identical to the previous Anthropic version - kept
// deterministic so server-side prompt caching on Groq (where supported)
// can reuse it across calls. Per-user data goes into the user message.
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

// JSON schema for Structured Outputs. Llama models on Groq honor this when
// strict=true so we don't need to re-parse defensively, but we do anyway.
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

// --- Generator ------------------------------------------------------------

export async function generatePlan(args: {
  profile: Profile;
  weather: WeatherSnapshot | null;
  date: string; // YYYY-MM-DD
  catalogue: ExerciseCandidate[];
}): Promise<GeneratedPlan> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const client = new Groq();

  const userPayload = {
    user_profile: args.profile,
    weather: args.weather,
    date: args.date,
    exercise_catalogue: args.catalogue,
  };

  const response = await client.chat.completions.create({
    model: MODEL_ID,
    max_tokens: 2000,
    // Slight creativity so plans don't read like templates, but low enough
    // to keep clinical/senior-care tone stable. Groq supports the standard
    // OpenAI-compatible temperature param.
    temperature: 0.6,
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
      {
        role: 'user',
        content: `Build today's plan for this user. Respond with JSON only.\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('No text response from Groq');
  }

  const parsed = planSchema.parse(JSON.parse(text));

  // Defensive: filter items to those whose slug is in the catalogue.
  // Even with strict Structured Outputs the model can still hallucinate a
  // slug value, so we re-validate against the source of truth.
  const validSlugs = new Set(args.catalogue.map((c) => c.slug));
  parsed.items = parsed.items
    .filter((it) => validSlugs.has(it.exercise_slug))
    .sort((a, b) => a.order - b.order);

  if (parsed.items.length < 3) {
    throw new Error('AI returned too few valid exercises');
  }

  return parsed;
}
