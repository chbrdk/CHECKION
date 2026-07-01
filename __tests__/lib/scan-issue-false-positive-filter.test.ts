import { describe, it, expect, vi } from 'vitest';
import {
  FILTER_WHEN_NOT_USER_VISIBLE,
  NEVER_FILTER_INVISIBLE,
} from '@/lib/element-audit-visibility';
import { filterNonVisibleElementIssues } from '@/lib/non-visible-element-issue-filter';
import { filterLinkInTextBlockFalsePositives } from '@/lib/link-in-text-block-false-positive-filter';
import { filterScanFalsePositives } from '@/lib/scan-issue-false-positive-filter';
import type { Issue } from '@/lib/types';

function issue(partial: Partial<Issue>): Issue {
  return {
    code: 'color-contrast',
    type: 'error',
    message: 'Insufficient contrast',
    context: '',
    selector: '#x',
    runner: 'axe',
    wcagLevel: 'AA',
    ...partial,
  };
}

describe('non-visible element issue filter', () => {
  it('removes contrast issue when element is not user-visible', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#cookie-text', visible: false }]),
    } as unknown as import('puppeteer').Page;
    const result = await filterNonVisibleElementIssues(page, [
      issue({ selector: '#cookie-text' }),
    ]);
    expect(result.removedCount).toBe(1);
    expect(result.issues).toHaveLength(0);
  });

  it('never removes aria-hidden-focus even when hidden', async () => {
    const page = { evaluate: vi.fn() } as unknown as import('puppeteer').Page;
    const result = await filterNonVisibleElementIssues(page, [
      issue({ code: 'aria-hidden-focus', selector: '#trap', wcagLevel: 'A' }),
    ]);
    expect(result.removedCount).toBe(0);
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it('visibility allow/deny lists do not overlap', () => {
    for (const code of FILTER_WHEN_NOT_USER_VISIBLE) {
      expect(NEVER_FILTER_INVISIBLE.has(code)).toBe(false);
    }
  });
});

describe('link-in-text-block false positive filter', () => {
  it('removes when underline or 3:1 parent contrast passes', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: 'a.inline', pass: true }]),
    } as unknown as import('puppeteer').Page;
    const result = await filterLinkInTextBlockFalsePositives(page, [
      issue({ code: 'link-in-text-block', selector: 'a.inline', wcagLevel: 'A' }),
    ]);
    expect(result.removedCount).toBe(1);
  });
});

describe('filterScanFalsePositives', () => {
  it('chains filters and aggregates breakdown', async () => {
    const page = {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce([{ selector: '#hidden', visible: false }])
        .mockResolvedValueOnce([{ selector: '#ok', pass: true }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    } as unknown as import('puppeteer').Page;

    const result = await filterScanFalsePositives(page, [
      issue({ selector: '#hidden' }),
      issue({ selector: '#ok', code: 'color-contrast' }),
      issue({ code: 'document-title', selector: 'html', message: 'missing title' }),
    ]);

    expect(result.breakdown.nonVisible).toBe(1);
    expect(result.breakdown.contrast).toBe(1);
    expect(result.removedCount).toBe(2);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].code).toBe('document-title');
  });
});
