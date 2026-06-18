import { describe, expect, it, vi } from 'vitest';
import {
    LATE_CMP_HOST_SELECTORS,
    VISUAL_DISMISS_DEFAULT_OPTIONS,
    VISUAL_DISMISS_HIDE_CSS,
    createScanPage,
    registerVisualDismissOnNewDocument,
    wireVisualDismissForBrowser,
} from '@/lib/scan-visual-dismiss';

describe('scan-visual-dismiss', () => {
    it('combines cookie and overlay hide CSS', () => {
        expect(VISUAL_DISMISS_HIDE_CSS).toContain('#usercentrics-root');
        expect(VISUAL_DISMISS_HIDE_CSS).toContain('#intercom-container');
        expect(VISUAL_DISMISS_HIDE_CSS).toContain('newsletter-popup');
    });

    it('uses stronger default retries for all scans', () => {
        expect(VISUAL_DISMISS_DEFAULT_OPTIONS.retries).toBeGreaterThanOrEqual(3);
        expect(VISUAL_DISMISS_DEFAULT_OPTIONS.retryDelayMs).toBeGreaterThanOrEqual(800);
    });

    it('tracks late CMP host selectors for mutation observer', () => {
        expect(LATE_CMP_HOST_SELECTORS).toContain('#usercentrics-root');
        expect(LATE_CMP_HOST_SELECTORS).toContain('#intercom-container');
    });

    it('registerVisualDismissOnNewDocument injects unified early-hide script', async () => {
        const evaluateOnNewDocument = vi.fn().mockResolvedValue(undefined);
        await registerVisualDismissOnNewDocument({ evaluateOnNewDocument });
        expect(evaluateOnNewDocument).toHaveBeenCalledOnce();
        const fn = evaluateOnNewDocument.mock.calls[0][0] as (css: string) => void;
        const css = evaluateOnNewDocument.mock.calls[0][1] as string;
        expect(css).toContain('#usercentrics-root');
        expect(typeof fn).toBe('function');
    });

    it('createScanPage registers dismiss before returning page', async () => {
        const page = { evaluateOnNewDocument: vi.fn().mockResolvedValue(undefined) };
        const browser = { newPage: vi.fn().mockResolvedValue(page) };
        const result = await createScanPage(browser);
        expect(result).toBe(page);
        expect(page.evaluateOnNewDocument).toHaveBeenCalledOnce();
    });

    it('wireVisualDismissForBrowser hooks targetcreated for pages', async () => {
        const handlers: Array<(target: { type: () => string; page: () => Promise<unknown> }) => void> = [];
        const browser = {
            on: (event: string, handler: (target: { type: () => string; page: () => Promise<unknown> }) => void) => {
                if (event === 'targetcreated') handlers.push(handler);
            },
        };
        wireVisualDismissForBrowser(browser);

        const page = { evaluateOnNewDocument: vi.fn().mockResolvedValue(undefined) };
        await handlers[0]({
            type: () => 'page',
            page: async () => page,
        });
        expect(page.evaluateOnNewDocument).toHaveBeenCalledOnce();
    });
});
