import { describe, it, expect, vi } from 'vitest';

// `plan-service.ts` imports `server-only`, which throws when loaded outside a
// Next.js server bundle. Vitest doesn't go through Next's compiler, so we stub
// the module to a no-op before importing the file under test.
vi.mock('server-only', () => ({}));

import { normalizeDashes } from '../plan-service';

describe('normalizeDashes', () => {
  it('replaces en-dash with hyphen', () => {
    expect(normalizeDashes('Cześć – jak tam?')).toBe('Cześć - jak tam?');
  });

  it('replaces em-dash with hyphen', () => {
    expect(normalizeDashes('Hello — world')).toBe('Hello - world');
  });

  it('handles multiple dashes in one string', () => {
    expect(normalizeDashes('A – B — C')).toBe('A - B - C');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeDashes(null)).toBe('');
    expect(normalizeDashes(undefined)).toBe('');
  });

  it('passes through strings without dashes', () => {
    expect(normalizeDashes('plain text')).toBe('plain text');
  });
});
