import { describe, it, expect, vi } from 'vitest';
import { filterContrastFalsePositives } from '@/lib/color-contrast-false-positive-filter';
import type { Issue } from '@/lib/types';

function contrastIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    code: 'color-contrast',
    type: 'error',
    message: 'Insufficient contrast',
    context: '',
    selector: '#hero-link',
    runner: 'axe',
    wcagLevel: 'AA',
    ...overrides,
  };
}

describe('filterContrastFalsePositives', () => {
  it('keeps non-contrast issues unchanged', async () => {
    const page = { evaluate: vi.fn() } as unknown as import('puppeteer').Page;
    const issues = [
      {
        code: 'image-alt',
        type: 'error' as const,
        message: 'Missing alt',
        context: '',
        selector: 'img',
        runner: 'axe' as const,
        wcagLevel: 'A' as const,
      },
    ];
    const result = await filterContrastFalsePositives(page, issues);
    expect(result.removedCount).toBe(0);
    expect(result.issues).toHaveLength(1);
    expect(page.evaluate).not.toHaveBeenCalled();
  });

  it('removes contrast issue when browser re-check passes', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#hero-link', pass: true }]),
    } as unknown as import('puppeteer').Page;
    const issues = [contrastIssue()];
    const result = await filterContrastFalsePositives(page, issues);
    expect(result.removedCount).toBe(1);
    expect(result.issues).toHaveLength(0);
  });

  it('removes contrast issue when axe message fg/bg recomputes to AA pass', async () => {
    const page = { evaluate: vi.fn().mockResolvedValue([]) } as unknown as import('puppeteer').Page;
    const issues = [
      contrastIssue({
        message:
          'Element has insufficient color contrast of 2.0 (foreground color: #000000, background color: #ffcc00, font size: 12.0pt (16px), font weight: normal).',
      }),
    ];
    const result = await filterContrastFalsePositives(page, issues);
    expect(result.removedCount).toBe(1);
    expect(result.issues).toHaveLength(0);
  });

  it('keeps contrast issue when browser re-check fails', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#low-contrast', pass: false }]),
    } as unknown as import('puppeteer').Page;
    const issues = [contrastIssue({ selector: '#low-contrast' })];
    const result = await filterContrastFalsePositives(page, issues);
    expect(result.removedCount).toBe(0);
    expect(result.issues).toHaveLength(1);
  });

  it('keeps contrast issue when browser cannot resolve selector', async () => {
    const page = {
      evaluate: vi.fn().mockResolvedValue([{ selector: '#missing', pass: null }]),
    } as unknown as import('puppeteer').Page;
    const issues = [contrastIssue({ selector: '#missing' })];
    const result = await filterContrastFalsePositives(page, issues);
    expect(result.removedCount).toBe(0);
    expect(result.issues).toHaveLength(1);
  });
});
