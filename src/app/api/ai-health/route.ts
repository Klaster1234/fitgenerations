import { NextResponse } from 'next/server';
import {
  AI_BASE_URL,
  AI_MODEL,
  createAiClient,
  isAiConfigured,
  providerExtras,
} from '@/lib/ai/client';

/**
 * GET /api/ai-health - temporary diagnostic.
 *
 * ensureTodayPlan swallows inference failures and serves the baseline plan, so
 * from the outside "no key", "revoked key" and "wrong model" all look the same.
 * This route makes one tiny completion and reports what the provider actually
 * said, which is the only way to tell them apart without shell access to the
 * deployment.
 *
 * It never returns the key itself - only whether one is present, which env var
 * it came from, and its length, so a truncated paste is still diagnosable.
 * Delete this route once the provider is confirmed working.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const source = process.env.AI_API_KEY
    ? 'AI_API_KEY'
    : process.env.GROQ_API_KEY
      ? 'GROQ_API_KEY'
      : null;
  const keyLength = (process.env.AI_API_KEY ?? process.env.GROQ_API_KEY ?? '').length;
  const base = { source, keyLength, baseUrl: AI_BASE_URL, model: AI_MODEL };

  if (!isAiConfigured()) {
    return NextResponse.json({ ok: false, reason: 'no key visible to the runtime', ...base });
  }

  try {
    const client = createAiClient();
    const res = await client.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 5,
      temperature: 0,
      ...providerExtras(),
      messages: [{ role: 'user', content: 'ping' }],
    });
    return NextResponse.json({
      ok: true,
      reply: res.choices[0]?.message?.content ?? null,
      ...base,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json({
      ok: false,
      reason: 'provider rejected the call',
      status: e.status ?? null,
      message: (e.message ?? String(err)).slice(0, 400),
      ...base,
    });
  }
}
