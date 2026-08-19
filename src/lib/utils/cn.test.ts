import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('lets a caller override a component default', () => {
    // The whole reason tailwind-merge is here: without it both classes survive
    // and the cascade decides by stylesheet order, so a consumer's explicit
    // className silently loses to the variant's.
    expect(cn('bg-accent', 'bg-danger')).toBe('bg-danger');
    expect(cn('px-4 py-2', 'px-6')).toBe('py-2 px-6');
  });

  it('keeps unrelated utilities', () => {
    expect(cn('flex items-center', 'gap-2')).toBe('flex items-center gap-2');
  });

  it('handles conditional and falsy inputs', () => {
    expect(cn('base', false && 'hidden', undefined, null, 'end')).toBe('base end');
  });
});
