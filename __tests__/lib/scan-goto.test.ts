import { describe, expect, it } from 'vitest';
import { shouldFallbackScanNavigation, ScanNavigationError } from '@/lib/scan-goto';

describe('scan-goto', () => {
    it('falls back on navigation timeout errors', () => {
        expect(shouldFallbackScanNavigation(new Error('Navigation timeout of 60000 ms exceeded'))).toBe(true);
        const timeoutErr = new Error('Timeout');
        timeoutErr.name = 'TimeoutError';
        expect(shouldFallbackScanNavigation(timeoutErr)).toBe(true);
    });

    it('does not fall back on other navigation errors', () => {
        expect(shouldFallbackScanNavigation(new Error('net::ERR_CONNECTION_REFUSED'))).toBe(false);
    });

    it('ScanNavigationError carries reason and status', () => {
        const err = new ScanNavigationError('HTTP 429', 'rate_limit', 'https://example.com', 429);
        expect(err.reason).toBe('rate_limit');
        expect(err.status).toBe(429);
    });
});
