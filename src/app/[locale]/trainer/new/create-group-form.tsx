'use client';

import { useActionState, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createGroupAction, type CreateGroupState } from './actions';

const initialState: CreateGroupState = { ok: false };

const SUGGESTED_PREFIXES = ['GLIWICE', 'POTENZA', 'GROUP', 'SIKORNIK', 'EURONET'];

function suggestRandomCode(): string {
  // Build something memorable: a city-style prefix + 1-2 digits.
  const prefix = SUGGESTED_PREFIXES[Math.floor(Math.random() * SUGGESTED_PREFIXES.length)];
  const num = String(Math.floor(Math.random() * 99) + 1).padStart(1, '0');
  return `${prefix}${num}`;
}

export function CreateGroupForm() {
  const t = useTranslations('Trainer');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const [state, formAction, pending] = useActionState(createGroupAction, initialState);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="name">{t('formNameLabel')}</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('formNamePlaceholder')}
          autoFocus
        />
        <p className="mt-1 text-sm text-muted">{t('formNameHint')}</p>
      </div>

      <div>
        <Label htmlFor="code">{t('formCodeLabel')}</Label>
        <div className="flex gap-2">
          <Input
            id="code"
            name="code"
            type="text"
            required
            maxLength={12}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder={t('formCodePlaceholder')}
            inputMode="text"
            autoComplete="off"
            className="font-mono uppercase tracking-wider"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setCode(suggestRandomCode())}
          >
            {t('formCodeSuggest')}
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted">{t('formCodeHint')}</p>
      </div>

      <div>
        <Label htmlFor="city">{t('formCityLabel')}</Label>
        <Input
          id="city"
          name="city"
          type="text"
          maxLength={80}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('formCityPlaceholder')}
          autoComplete="address-level2"
        />
        <p className="mt-1 text-sm text-muted">{t('formCityHint')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sport">{t('formSportLabel')}</Label>
        <select
          id="sport"
          name="sport"
          defaultValue="general"
          className="w-full min-h-12 px-3 rounded-md border-2 border-border text-base bg-surface"
        >
          <option value="general">{t('formSportGeneral')}</option>
          <option value="football">{t('formSportFootball')}</option>
        </select>
        <p className="mt-1 text-sm text-muted">{t('formSportHint')}</p>
      </div>

      {state.error && (
        <p role="alert" className="text-base font-semibold text-danger" aria-live="polite">
          {t(`errors.${state.error}` as 'errors.invalidCode')}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={pending || code.length < 4 || name.trim().length === 0}
        >
          {pending ? tc('loading') : t('formSubmit')}
        </Button>
      </div>
    </form>
  );
}
