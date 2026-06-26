import type { Page } from 'puppeteer';
import { SCAN_NAVIGATION_TIMEOUT_MS } from '@/lib/constants';
import { scanDebugWarn } from '@/lib/scan-debug-log';

/** True when primary `networkidle2` navigation should fall back to `domcontentloaded`. */
export function shouldFallbackScanNavigation(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (error.name === 'TimeoutError') return true;
    return /timeout/i.test(error.message);
}

const POST_DOMCONTENTLOADED_SETTLE_MS = 1_500;

/**
 * Navigate for scans: prefer networkidle2, fall back for SPAs that never go idle (common in Docker GEO runs).
 */
export async function gotoForScan(page: Page, url: string, timeoutMs = SCAN_NAVIGATION_TIMEOUT_MS): Promise<void> {
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    } catch (error) {
        if (!shouldFallbackScanNavigation(error)) throw error;
        scanDebugWarn('[CHECKION] networkidle2 navigation timed out; retrying with domcontentloaded', {
            url,
            timeoutMs,
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
        await new Promise((resolve) => setTimeout(resolve, POST_DOMCONTENTLOADED_SETTLE_MS));
    }
}
