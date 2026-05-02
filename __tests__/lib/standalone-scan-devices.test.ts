import { describe, expect, it, afterEach } from 'vitest';
import { resolveStandaloneScanDevices } from '@/lib/standalone-scan-devices';

describe('resolveStandaloneScanDevices', () => {
    const prev = process.env.SCAN_STANDALONE_DEVICES;

    afterEach(() => {
        if (prev === undefined) delete process.env.SCAN_STANDALONE_DEVICES;
        else process.env.SCAN_STANDALONE_DEVICES = prev;
    });

    it('defaults to all three devices', () => {
        delete process.env.SCAN_STANDALONE_DEVICES;
        expect(resolveStandaloneScanDevices({})).toEqual(['desktop', 'tablet', 'mobile']);
    });

    it('quickScan yields desktop only', () => {
        expect(resolveStandaloneScanDevices({ quickScan: true })).toEqual(['desktop']);
    });

    it('explicit devices override quickScan', () => {
        expect(
            resolveStandaloneScanDevices({
                quickScan: true,
                devices: ['tablet', 'mobile'],
            })
        ).toEqual(['tablet', 'mobile']);
    });

    it('parses SCAN_STANDALONE_DEVICES env', () => {
        process.env.SCAN_STANDALONE_DEVICES = 'desktop,mobile';
        expect(resolveStandaloneScanDevices({})).toEqual(['desktop', 'mobile']);
    });

    it('dedupes and orders by canonical order', () => {
        expect(resolveStandaloneScanDevices({ devices: ['mobile', 'desktop', 'mobile'] })).toEqual([
            'desktop',
            'mobile',
        ]);
    });
});
