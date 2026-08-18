import 'server-only';
import Groq from 'groq-sdk';

/**
 * Shared inference client.
 *
 * The app promises users - in the FAQ and in the privacy policy - that their
 * data stays inside the EU. Plan generation sends the user's profile (age,
 * city, fitness level and the free-text `training_preferences`, where people
 * describe injuries) to a model, so the provider has to sit in the EU for that
 * promise to hold. Default is Mistral, a French company serving from the EU.
 *
 * Everything is driven by env vars so the provider can change without touching
 * call sites - but note the default deliberately is NOT a US endpoint: if
 * AI_API_KEY is missing we fall back to the deterministic baseline planner
 * rather than quietly shipping profiles overseas.
 *
 * The SDK is groq-sdk purely because it speaks the OpenAI wire format that
 * Mistral also serves; nothing Groq-specific is assumed beyond `providerExtras`.
 */
const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_MODEL = 'mistral-large-latest';

export const AI_BASE_URL = process.env.AI_BASE_URL ?? DEFAULT_BASE_URL;
export const AI_MODEL = process.env.AI_MODEL ?? DEFAULT_MODEL;

/** True when a key is configured; callers fall back to the baseline plan otherwise. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export function createAiClient(): Groq {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error('AI_API_KEY not configured');
  }
  return new Groq({ apiKey, baseURL: AI_BASE_URL });
}

/**
 * Params only some providers accept. `reasoning_effort` is a gpt-oss/Groq
 * extension - Mistral rejects unknown fields with a 400, so it is opt-in by
 * endpoint rather than sent blindly.
 */
export function providerExtras(): Record<string, unknown> {
  return AI_BASE_URL.includes('groq.com') ? { reasoning_effort: 'low' } : {};
}
