import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('scan-debug-log', () => {
    const originalEnv = process.env.CHECKION_SCAN_DEBUG;

    beforeEach(() => {
        vi.resetModules();
        delete process.env.CHECKION_SCAN_DEBUG;
    });

    afterEach(() => {
        process.env.CHECKION_SCAN_DEBUG = originalEnv;
    });

    it('does not log when CHECKION_SCAN_DEBUG is unset', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { scanDebugLog } = await import('@/lib/scan-debug-log');
        scanDebugLog('secret');
        expect(logSpy).not.toHaveBeenCalled();
        logSpy.mockRestore();
    });

    it('logs when CHECKION_SCAN_DEBUG=1', async () => {
        process.env.CHECKION_SCAN_DEBUG = '1';
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const { scanDebugLog } = await import('@/lib/scan-debug-log');
        scanDebugLog('hello');
        expect(logSpy).toHaveBeenCalledWith('hello');
        logSpy.mockRestore();
    });
});
