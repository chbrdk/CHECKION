import { describe, expect, it } from 'vitest';
import {
    useDomainScan,
    useDomainScanChrome,
    useDomainScanCore,
    useDomainScanSession,
} from '@/context/DomainScanContext';
import type {
    DomainScanChromeValue,
    DomainScanContextValue,
    DomainScanCoreValue,
    DomainScanSessionValue,
} from '@/context/DomainScanContext';

describe('DomainScanContext split exports', () => {
    it('exports chrome (shell), core (data), session, and merged hooks', () => {
        expect(typeof useDomainScanChrome).toBe('function');
        expect(typeof useDomainScanCore).toBe('function');
        expect(typeof useDomainScanSession).toBe('function');
        expect(typeof useDomainScan).toBe('function');
    });

    it('types: DomainScanContextValue is core & session', () => {
        const check = (v: DomainScanContextValue) => v.domainId;
        const asCore: DomainScanCoreValue = {} as DomainScanContextValue;
        const asSession: DomainScanSessionValue = {} as DomainScanContextValue;
        const asChrome: DomainScanChromeValue = {
            loadError: null,
            bundlePending: false,
            domainId: 'x',
            activeSection: 'overview',
            domainLinkQuery: {},
            projectId: null,
            setProjectId: () => {},
            fromProjectId: null,
            shellHeader: null,
        };
        expect(typeof check).toBe('function');
        expect(asCore).toBeDefined();
        expect(asSession).toBeDefined();
        expect(asChrome.domainId).toBe('x');
    });
});
