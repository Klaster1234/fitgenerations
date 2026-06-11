'use server';

import { redirect } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { SURVEYS, type SurveyType } from './questions';

// Open answers are capped server-side; the textareas advertise the same
// limit via maxLength but FormData is the boundary that counts.
const MAX_OPEN_LENGTH = 2000;

export async function submitSurvey(formData: FormData) {
  const survey = String(formData.get('survey') ?? '') as SurveyType;
  const questions = SURVEYS[survey];
  if (!questions) return;

  const rawLocale = String(formData.get('locale') ?? '');
  const locale: Locale = (routing.locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : routing.defaultLocale;

  const answers: Record<string, string | number> = {};
  let valid = true;

  for (const q of questions) {
    const raw = String(formData.get(q.id) ?? '').trim();
    if (q.kind === 'scale' || q.kind === 'days') {
      const n = Number(raw);
      const inRange = q.kind === 'scale' ? n >= 1 && n <= 5 : n >= 0 && n <= 7;
      if (!Number.isInteger(n) || !inRange) {
        valid = false;
        break;
      }
      answers[q.id] = n;
      if (q.kind === 'scale' && q.comment) {
        const comment = String(formData.get(`${q.id}_comment`) ?? '').trim();
        if (comment !== '') answers[`${q.id}_comment`] = comment.slice(0, MAX_OPEN_LENGTH);
      }
    } else if (q.kind === 'choice') {
      if (!q.options.includes(raw)) {
        valid = false;
        break;
      }
      answers[q.id] = raw;
    } else {
      // Open questions are optional — store only non-empty answers.
      if (raw !== '') answers[q.id] = raw.slice(0, MAX_OPEN_LENGTH);
    }
  }

  if (!valid) {
    redirect({ href: `/survey/${survey}?error=1`, locale });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('survey_responses').insert({ survey, locale, answers });

  if (error) {
    console.error('[survey/submitSurvey] insert failed', error);
    redirect({ href: `/survey/${survey}?error=1`, locale });
  }

  redirect({ href: `/survey/${survey}?done=1`, locale });
}
