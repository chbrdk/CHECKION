/* ------------------------------------------------------------------ */
/*  CHECKION – Realistic browser context for Puppeteer scans          */
/* ------------------------------------------------------------------ */

import type { Device } from '@/lib/types';
import type { Page } from 'puppeteer';

/** Current Chrome desktop UA (no HeadlessChrome suffix). */
export const SCAN_DESKTOP_USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const SCAN_TABLET_USER_AGENT =
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const SCAN_MOBILE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export const SCAN_ACCEPT_LANGUAGE = 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7';

/** Extra Chromium flags to reduce automation fingerprinting. */
export const PUPPETEER_STEALTH_LAUNCH_ARGS = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
] as const;

export function getScanUserAgent(device: Device): string {
    if (device === 'mobile') return SCAN_MOBILE_USER_AGENT;
    if (device === 'tablet') return SCAN_TABLET_USER_AGENT;
    return SCAN_DESKTOP_USER_AGENT;
}

/**
 * Mask common automation signals and set locale headers before navigation.
 * Call on every new page before `goto`.
 */
export async function applyScanBrowserContext(page: Page, device: Device): Promise<void> {
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true,
        });
        try {
            Object.defineProperty(navigator, 'languages', {
                get: () => ['de-DE', 'de', 'en-US', 'en'],
                configurable: true,
            });
        } catch {
            /* ignore */
        }
        try {
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
                configurable: true,
            });
        } catch {
            /* ignore */
        }
    });
    await page.setUserAgent(getScanUserAgent(device));
    await page.setExtraHTTPHeaders({ 'Accept-Language': SCAN_ACCEPT_LANGUAGE });
}
