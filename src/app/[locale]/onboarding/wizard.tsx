'use client';

import { useActionState, useState, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveOnboarding } from './actions';

const TOTAL_STEPS = 5;

const FITNESS_LEVELS = ['low', 'mid', 'high'] as const;
const EQUIPMENT = ['none', 'mat', 'bands', 'dumbbells', 'bike', 'park'] as const;
const GOALS = ['energy', 'strength', 'mobility', 'social'] as const;

type Equipment = (typeof EQUIPMENT)[number];
type Goal = (typeof GOALS)[number];

export function OnboardingWizard() {
  const t = useTranslations('Onboarding');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('');
  const [fitness, setFitness] = useState<(typeof FITNESS_LEVELS)[number] | ''>('');
  const [equipment, setEquipment] = useState<Set<Equipment>>(new Set());
  const [goals, setGoals] = useState<Set<Goal>>(new Set());
  const [city, setCity] = useState('');

  const [state, formAction, pending] = useActionState(saveOnboarding, { ok: false });
  const liveRegionId = useId();

  const canProceed = (() => {
    if (step === 1) return /^\d+$/.test(age) && Number(age) >= 6 && Number(age) <= 120;
    if (step === 2) return fitness !== '';
    if (step === 3) return true; // equipment optional, can skip with body-only
    if (step === 4) return goals.size > 0;
    if (step === 5) return city.trim().length > 0;
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
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="locale" value={locale} />

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
          placeholder="35"
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

      <div className={step === 4 ? '' : 'hidden'}>
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

      <div className={step === 5 ? '' : 'hidden'}>
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
          <Button type="button" onClick={next} disabled={!canProceed}>
            {tc('continue')}
          </Button>
        ) : (
          <Button type="submit" disabled={!canProceed || pending}>
            {pending ? tc('loading') : t('finish')}
          </Button>
        )}
      </div>
    </form>
  );
}
