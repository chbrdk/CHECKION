import { describe, it, expect, vi } from 'vitest';
import { scrollPageForScanLayout } from '@/lib/scan-scroll-settle';

describe('scrollPageForScanLayout', () => {
  it('scrolls page and waits for layout settle', async () => {
    vi.useFakeTimers();
    const page = {
      evaluate: vi.fn().mockResolvedValue(undefined),
    } as unknown as import('puppeteer').Page;

    const promise = scrollPageForScanLayout(page);
    await vi.runAllTimersAsync();
    await promise;

    expect(page.evaluate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
