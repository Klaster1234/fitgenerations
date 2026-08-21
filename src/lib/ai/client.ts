import 'server-only';
import Groq from 'groq-sdk';

/**
 * Shared inference client.
 *
 * Provider, model and key all come from env vars, so switching supplier never
 * touches a call site. The default is Groq, which is what the deployment has a
 * key for; set AI_API_KEY together with AI_BASE_URL to point somewhere else
 * (an EU-hosted endpoint, for instance) and those take precedence.
 *
 * GROQ_API_KEY is still read as a fallback because it is the name the Vercel
 * project already stores the key under. Without any key we fall back to the
 * deterministic baseline planner rather than failing the page.
 *
 * Heads-up for whoever changes this: plan generation sends the user's profile
 * (age, city, fitness level and the free-text `training_preferences`, where
 * people describe injuries). Wherever this points is a data recipient, and the
 * FAQ plus the privacy policy have to name it and match where it is hosted.
 *
 * The SDK is groq-sdk because it speaks the OpenAI wire format that the other
 * candidate providers serve too; nothing Groq-specific is assumed outside of
 * `providerExtras`.
 */
const DEFAULT_BASE_URL = 'https://api.groq.com';
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

/**
 * groq-sdk appends `/openai/v1` to the base URL itself, so a base that already
 * carries that suffix produces `/openai/v1/openai/v1/chat/completions` and the
 * provider answers 404 - which the planner then swallows into a baseline plan.
 * Strip it so either spelling of the env var works.
 */
function normaliseBaseUrl(url: string): string {
  return url.replace(/\/openai\/v1\/?$/, '');
}

export const AI_BASE_URL = normaliseBaseUrl(process.env.AI_BASE_URL ?? DEFAULT_BASE_URL);
export const AI_MODEL = process.env.AI_MODEL ?? DEFAULT_MODEL;

function apiKey(): string | undefined {
  return process.env.AI_API_KEY ?? process.env.GROQ_API_KEY;
}

/** True when a key is configured; callers fall back to the baseline plan otherwise. */
export function isAiConfigured(): boolean {
  return Boolean(apiKey());
}

export function createAiClient(): Groq {
  const key = apiKey();
  if (!key) {
    throw new Error('No inference key configured (AI_API_KEY or GROQ_API_KEY)');
  }
  return new Groq({ apiKey: key, baseURL: AI_BASE_URL });
}

/**
 * Params only some providers accept. `reasoning_effort` is a gpt-oss/Groq
 * extension - others reject unknown fields with a 400, so it is opt-in by
 * endpoint rather than sent blindly.
 */
export function providerExtras(): Record<string, unknown> {
  return AI_BASE_URL.includes('groq.com') ? { reasoning_effort: 'low' } : {};
}
