// Shared difficulty vocabulary for exercise cards. Keeping the colour map,
// label keys and normaliser in one place guarantees the /football library and
// the /plan daily list render the SAME chip (the persona-audit goal of
// lifting /plan to /football's visual level). No 'use client'/'server-only'
// here so both client (skill-card) and server (plan/page, football/page) can
// import it. Labels live in the Football namespace - they are generic
// difficulty words (Easy/Medium/Pro) reused across surfaces.

export type Difficulty = 'low' | 'mid' | 'high';

export const DIFF_STYLE: Record<Difficulty, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
  mid: 'bg-amber-500/15 text-amber-400 ring-amber-500/30',
  high: 'bg-rose-500/15 text-rose-400 ring-rose-500/30',
};

export const DIFF_LABEL: Record<Difficulty, 'levelLow' | 'levelMid' | 'levelHigh'> = {
  low: 'levelLow',
  mid: 'levelMid',
  high: 'levelHigh',
};

/** Coerce an unknown DB value to a valid Difficulty (defaults to 'mid'). */
export function normDifficulty(v: unknown): Difficulty {
  return v === 'low' || v === 'high' ? v : 'mid';
}
