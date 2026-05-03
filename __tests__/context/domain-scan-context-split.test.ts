import { describe, expect, it } from 'vitest';
import { useDomainScan, useDomainScanCore, useDomainScanSession } from '@/context/DomainScanContext';
import type { DomainScanContextValue, DomainScanCoreValue, DomainScanSessionValue } from '@/context/DomainScanContext';

describe('DomainScanContext split exports', () => {
    it('exports core, session, and merged hooks', () => {
        expect(typeof useDomainScanCore).toBe('function');
        expect(typeof useDomainScanSession).toBe('function');
        expect(typeof useDomainScan).toBe('function');
    });

    it('types: DomainScanContextValue is core & session', () => {
        const check = (v: DomainScanContextValue) => v.domainId;
        const asCore: DomainScanCoreValue = {} as DomainScanContextValue;
        const asSession: DomainScanSessionValue = {} as DomainScanContextValue;
        expect(typeof check).toBe('function');
        expect(asCore).toBeDefined();
        expect(asSession).toBeDefined();
    });
});
