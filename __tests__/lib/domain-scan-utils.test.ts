import { describe, it, expect } from 'vitest';
import { isTerminalDomainScanStatus } from '@/lib/status-ui/domain-scan-utils';

describe('isTerminalDomainScanStatus', () => {
    it('is true for terminal states', () => {
        expect(isTerminalDomainScanStatus('complete')).toBe(true);
        expect(isTerminalDomainScanStatus('error')).toBe(true);
        expect(isTerminalDomainScanStatus('cancelled')).toBe(true);
    });

    it('is false for running states', () => {
        expect(isTerminalDomainScanStatus('scanning')).toBe(false);
        expect(isTerminalDomainScanStatus('queued')).toBe(false);
        expect(isTerminalDomainScanStatus('paused')).toBe(false);
        expect(isTerminalDomainScanStatus('cancelling')).toBe(false);
    });
});
