'use client';

import { useActionState, useState, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveOnboarding } from './actions';

const TOTAL_STEPS = 7;

const FITNESS_LEVELS = ['low', 'mid', 'high'] as const;
const INTERESTS = ['fitness', 'football', 'green'] as const;
const EQUIPMENT = ['none', 'mat', 'bands', 'dumbbells', 'bike', 'park'] as const;
const GOALS = ['energy', 'strength', 'mobility', 'social'] as const;

type Interest = (typeof INTERESTS)[number];
type Equipment = (typeof EQUIPMENT)[number];
type Goal = (typeof GOALS)[number];

// Default values come from saved profile when editing via /settings, so the
// wizard doubles as the edit form. Empty values mean a fresh onboarding.
export type OnboardingDefaults = {
  age?: number | null;
  fitness_level?: 'low' | 'mid' | 'high' | null;
  interests?: string[] | null;
  equipment?: string[] | null;
  goals?: string[] | null;
  city?: string | null;
  trains_with_partner?: boolean | null;
  group_code?: string | null;
  is_goalkeeper?: boolean | null;
};

export function OnboardingWizard({ defaults }: { defaults?: OnboardingDefaults } = {}) {
  const t = useTranslations('Onboarding');
  const tc = useTranslations('Common');
  const ti = useTranslations('Interests');
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState(defaults?.age ? String(defaults.age) : '');
  const [fitness, setFitness] = useState<(typeof FITNESS_LEVELS)[number] | ''>(
    defaults?.fitness_level ?? '',
  );
  const [interests, setInterests] = useState<Set<Interest>>(
    new Set((defaults?.interests ?? []) as Interest[]),
  );
  const [isGoalkeeper, setIsGoalkeeper] = useState<boolean>(defaults?.is_goalkeeper === true);
  const [equipment, setEquipment] = useState<Set<Equipment>>(
    new Set((defaults?.equipment ?? []) as Equipment[]),
  );
  const [goals, setGoals] = useState<Set<Goal>>(new Set((defaults?.goals ?? []) as Goal[]));
  const [city, setCity] = useState(defaults?.city ?? '');
  const [trainsWithPartner, setTrainsWithPartner] = useState<'yes' | 'no' | ''>(
    defaults?.trains_with_partner === true
      ? 'yes'
      : defaults?.trains_with_partner === false
        ? 'no'
        : '',
  );
  const [groupCode, setGroupCode] = useState(defaults?.group_code ?? '');

  const [state, formAction, pending] = useActionState(saveOnboarding, { ok: false });
  const liveRegionId = useId();

  // The goalkeeper opt-in only applies to football players. When football is
  // not selected we hide the checkbox and never submit `is_goalkeeper=true`
  // (composeGoalkeeperPlan only runs for football users anyway).
  const hasFootball = interests.has('football');
  const goalkeeperValue = hasFootball && isGoalkeeper;

  const canProceed = (() => {
    if (step === 1) return /^\d+$/.test(age) && Number(age) >= 6 && Number(age) <= 120;
    if (step === 2) return fitness !== '';
    if (step === 3) return true; // interests optional - default is no extra interests
    if (step === 4) return true; // equipment optional, can skip with body-only
    if (step === 5) return goals.size > 0;
    if (step === 6) return city.trim().length > 0;
    if (step === 7) {
      // Partner answer is required (yes/no). Group code is optional but if
      // provided must match the schema (4-12 uppercased alphanumerics).
      if (trainsWithPartner === '') return false;
      if (groupCode.length > 0 && !/^[A-Z0-9]{4,12}$/.test(groupCode)) return false;
      return true;
    }
    return false;
  })();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  const toggle = <T extends string>(set: Set<T>, value: T) => {
    const out = new Set(set);
    if (out.has(value)) out.delete(value);
    else out.add(value);
    return out;
  };

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Guard against the "ghost submit" React pitfall: when moving from the
        // penultimate step the same DOM button flips type="button" →
        // type="submit" mid-click, and the browser fires a submit before the
        // user ever sees the last step. Block any submit that is not from the
        // final step.
        if (step !== TOTAL_STEPS) e.preventDefault();
      }}
      className="space-y-8"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="is_goalkeeper" value={goalkeeperValue ? 'true' : 'false'} />

      <div>
        <p
          className="text-base font-bold text-brand-darker dark:text-brand"
          aria-live="polite"
          id={liveRegionId}
        >
          {t('stepOf', { step, total: TOTAL_STEPS })}
        </p>
        <div
          className="mt-2 h-2 rounded-full bg-foreground/15 dark:bg-foreground/20 overflow-hidden"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-brand transition-[width]"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/*
        Each step stays mounted (just visually hidden when not active) so its
        inputs remain in the form. Conditionally rendering with `step === N &&`
        would drop earlier-step inputs from the DOM, and formData would be
        missing fields by the time we hit step 5 → zod fails → "Coś poszło
        nie tak". This is the root-cause fix for that bug.
      */}
      <div className={step === 1 ? '' : 'hidden'}>
        <Label htmlFor="age">{t('ageQuestion')}</Label>
        <Input
          id="age"
          name="age"
          inputMode="numeric"
          pattern="[0-9]*"
          value={age}
          onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
          placeholder={t('agePlaceholder')}
          autoFocus
        />
      </div>

      <div className={step === 2 ? '' : 'hidden'}>
        <fieldset>
          <legend className="block text-sm font-semibold mb-3">{t('fitnessQuestion')}</legend>
          <div className="grid gap-3">
            {FITNESS_LEVELS.map((lv) => (
              <label
                key={lv}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  fitness === lv ? 'border-brand bg-brand-light' : 'border-border bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="fitness_level"
                  value={lv}
                  checked={fitness === lv}
                  onChange={() => setFitness(lv)}
                  className="h-5 w-5 accent-brand"
                />
                <span className="text-base font-medium">
                  {t(`fitness${lv === 'low' ? 'Low' : lv === 'mid' ? 'Mid' : 'High'}` as 'fitnessLow' | 'fitnessMid' | 'fitnessHigh')}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className={step === 3 ? '' : 'hidden'}>
        <fieldset>
          <legend className="block text-sm font-semibold mb-3">{ti('question')}</legend>
          <p className="mb-3 text-sm text-muted">{ti('hint')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {INTERESTS.map((key) => {
              const labelKey = key as 'fitness' | 'football' | 'green';
              return (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    interests.has(key) ? 'border-brand bg-brand-light' : 'border-border bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={key}
                    checked={interests.has(key)}
                    onChange={() => setInterests(toggle(interests, key))}
                    className="h-5 w-5 accent-brand"
                  />
                  <span className="text-base font-medium">{ti(labelKey)}</span>
                </label>
              );
            })}
          </div>

          {hasFootball && (
            <label className="mt-4 flex items-center gap-3 min-h-12 cursor-pointer">
              <input
                type="checkbox"
                checked={isGoalkeeper}
                onChange={(e) => setIsGoalkeeper(e.target.checked)}
                className="h-5 w-5 accent-brand"
              />
              <span className="text-base font-medium">{ti('goalkeeper')}</span>
            </label>
          )}
        </fieldset>
      </div>

      <div className={step === 4 ? '' : 'hidden'}>
        <fieldset>
          <legend className="block text-sm font-semibold mb-3">{t('equipmentQuestion')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {EQUIPMENT.map((eq) => {
              const labelKey = `equip${eq[0].toUpperCase()}${eq.slice(1)}` as
                | 'equipNone'
                | 'equipMat'
                | 'equipBands'
                | 'equipDumbbells'
                | 'equipBike'
                | 'equipPark';
              return (
                <label
                  key={eq}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    equipment.has(eq) ? 'border-brand bg-brand-light' : 'border-border bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="equipment"
                    value={eq}
                    checked={equipment.has(eq)}
                    onChange={() => setEquipment(toggle(equipment, eq))}
                    className="h-5 w-5 accent-brand"
                  />
                  <span className="text-base font-medium">{t(labelKey)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className={step === 5 ? '' : 'hidden'}>
        <fieldset>
          <legend className="block text-sm font-semibold mb-3">{t('goalQuestion')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((g) => {
              const labelKey = `goal${g[0].toUpperCase()}${g.slice(1)}` as
                | 'goalEnergy'
                | 'goalStrength'
                | 'goalMobility'
                | 'goalSocial';
              return (
                <label
                  key={g}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    goals.has(g) ? 'border-brand bg-brand-light' : 'border-border bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="goals"
                    value={g}
                    checked={goals.has(g)}
                    onChange={() => setGoals(toggle(goals, g))}
                    className="h-5 w-5 accent-brand"
                  />
                  <span className="text-base font-medium">{t(labelKey)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className={step === 6 ? '' : 'hidden'}>
        <Label htmlFor="city">{t('locationQuestion')}</Label>
        <Input
          id="city"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('locationPlaceholder')}
          autoComplete="address-level2"
        />
      </div>

      <div className={step === 7 ? '' : 'hidden'}>
        <fieldset>
          <legend className="block text-sm font-semibold mb-3">
            {t('partnerQuestion')}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['yes', 'no'] as const).map((value) => (
              <label
                key={value}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                  trainsWithPartner === value
                    ? 'border-brand bg-brand-light'
                    : 'border-border bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="trains_with_partner"
                  value={value}
                  checked={trainsWithPartner === value}
                  onChange={() => setTrainsWithPartner(value)}
                  className="h-5 w-5 accent-brand"
                />
                <span className="text-base font-medium">
                  {t(value === 'yes' ? 'partnerYes' : 'partnerNo')}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6">
          <Label htmlFor="group_code">{t('groupCodeQuestion')}</Label>
          <Input
            id="group_code"
            name="group_code"
            value={groupCode}
            onChange={(e) => setGroupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder={t('groupCodePlaceholder')}
            maxLength={12}
            autoComplete="off"
            inputMode="text"
          />
          <p className="mt-1 text-sm text-muted">{t('groupCodeHint')}</p>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger" aria-live="polite">
          {tc('error')}
        </p>
      )}

      <div className="flex items-center gap-3 justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={prev}
          disabled={step === 1 || pending}
          className="border-2 border-foreground/15 dark:border-foreground/20 hover:border-foreground/30 dark:hover:border-foreground/40"
        >
          {tc('back')}
        </Button>

        {step < TOTAL_STEPS ? (
          // Distinct keys force React to swap the DOM node instead of mutating
          // type="button" into type="submit" on the element mid-click (see the
          // onSubmit guard above).
          <Button key="continue" type="button" onClick={next} disabled={!canProceed}>
            {tc('continue')}
          </Button>
        ) : (
          <Button key="finish" type="submit" disabled={!canProceed || pending}>
            {pending ? tc('loading') : t('finish')}
          </Button>
        )}
      </div>
    </form>
  );
}
