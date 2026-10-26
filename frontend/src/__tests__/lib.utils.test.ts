import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (className merger)', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('merges multiple classes', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('deduplicates conflicting Tailwind classes — last one wins', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('removes falsy values', () => {
    expect(cn('base', false && 'hidden', undefined, null, '')).toBe('base');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('btn', isActive && 'btn-active')).toBe('btn btn-active');
  });

  it('handles object syntax from clsx', () => {
    expect(cn({ 'font-bold': true, 'font-normal': false })).toBe('font-bold');
  });

  it('returns empty string when no args', () => {
    expect(cn()).toBe('');
  });
});
