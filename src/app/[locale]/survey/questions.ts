// Shared survey definitions — used by the form page (rendering) and the
// server action (validation). Questions mirror Annexes A–C of the FGST
// national testing report template; ids match the annex numbering so stored
// JSON can be read against the printed template. Indicator mapping:
// a1–a3 → satisfaction KPI (≥70% answering 4–5), a7 → challenge KPI (≥60%),
// a9 vs c1 → change in physical activity.

export const SURVEY_TYPES = ['baseline', 'final', 'trainer'] as const;
export type SurveyType = (typeof SURVEY_TYPES)[number];

export const YES_NO = ['yes', 'no'] as const;

export type Question =
  | {
      id: string;
      kind: 'scale';
      hint: 'hintAgree' | 'hintFitness' | 'hintUseful' | 'hintFit';
      comment?: boolean;
    }
  | { id: string; kind: 'days' }
  | { id: string; kind: 'choice'; options: readonly string[] }
  | { id: string; kind: 'open'; long?: boolean };

export const SURVEYS: Record<SurveyType, readonly Question[]> = {
  baseline: [
    { id: 'c1', kind: 'days' },
    { id: 'c2', kind: 'scale', hint: 'hintFitness' },
    { id: 'c3', kind: 'open' },
  ],
  final: [
    { id: 'a1', kind: 'scale', hint: 'hintAgree' },
    { id: 'a2', kind: 'scale', hint: 'hintAgree' },
    { id: 'a3', kind: 'scale', hint: 'hintAgree' },
    { id: 'a4', kind: 'scale', hint: 'hintAgree' },
    { id: 'a5', kind: 'scale', hint: 'hintAgree' },
    { id: 'a6', kind: 'scale', hint: 'hintAgree' },
    { id: 'a7', kind: 'choice', options: YES_NO },
    { id: 'a8', kind: 'choice', options: YES_NO },
    { id: 'a9', kind: 'days' },
    { id: 'a11', kind: 'open', long: true },
  ],
  trainer: [
    { id: 'b1', kind: 'scale', hint: 'hintUseful', comment: true },
    { id: 'b2', kind: 'scale', hint: 'hintFit', comment: true },
    { id: 'b3', kind: 'open', long: true },
    { id: 'b4', kind: 'open', long: true },
  ],
};
