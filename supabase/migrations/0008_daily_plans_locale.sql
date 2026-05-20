-- Track which locale a daily plan was generated in.
--
-- Problem: AI-generated greeting + ai_note in daily_plans is stored as
-- plain text in the user's profile locale at generation time. When the
-- user switches the locale switcher to Italian, the cached plan still
-- shows the original Polish text. Exercise NAMES are fine because they
-- come from exercises.name JSONB and get translated on the fly, but the
-- AI-authored copy stays stuck.
--
-- Fix: stamp the plan with its locale at write time. In plan-service we
-- compare against the requested locale and force-regenerate when they
-- differ. One Claude call per language switch (acceptable trade-off).

alter table public.daily_plans
  add column if not exists locale text not null default 'en';

alter table public.daily_plans drop constraint if exists daily_plans_locale_check;
alter table public.daily_plans add constraint daily_plans_locale_check
  check (locale in ('en', 'pl', 'it', 'uk'));

create index if not exists daily_plans_locale_idx on public.daily_plans(locale);
