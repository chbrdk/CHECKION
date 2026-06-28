import { describe, it, expect, vi } from 'vitest';
import { filterTargetSizeFalsePositives } from '@/lib/target-size-false-positive-filter';
import { filterFocusNotObscuredFalsePositives } from '@/lib/focus-not-obscured-false-positive-filter';
import type { Issue } from '@/lib/types';

function issue(partial: Partial<Issue>): Issue {
  return {
    code: 'target-size',
    type: 'error',
    message: 'Target too small',
    context: '',
    selector: '#btn',
    runner: 'axe',
    wcagLevel: 'AA',
    ...partial,
  };
}

describe('filterTargetSizeFalsePositives', () => {
  it('removes when browser re-check passes', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#btn', pass: true }]),
    } as unknown as import('puppeteer').Page;
    const result = await filterTargetSizeFalsePositives(page, [issue({})]);
    expect(result.removedCount).toBe(1);
  });

  it('keeps when browser re-check fails', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#btn', pass: false }]),
    } as unknown as import('puppeteer').Page;
    const result = await filterTargetSizeFalsePositives(page, [issue({})]);
    expect(result.removedCount).toBe(0);
  });
});

describe('filterFocusNotObscuredFalsePositives', () => {
  it('removes focus-not-obscured when focus is visible', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#nav-link', pass: true }]),
    } as unknown as import('puppeteer').Page;
    const result = await filterFocusNotObscuredFalsePositives(page, [
      issue({ code: 'focus-not-obscured-minimum', selector: '#nav-link', wcagLevel: 'AA' }),
    ]);
    expect(result.removedCount).toBe(1);
  });

  it('ignores non-focus rules', async () => {
    const page = { evaluate: vi.fn() } as unknown as import('puppeteer').Page;
    const result = await filterFocusNotObscuredFalsePositives(page, [issue({ code: 'button-name' })]);
    expect(result.removedCount).toBe(0);
    expect(page.evaluate).not.toHaveBeenCalled();
  });
});
