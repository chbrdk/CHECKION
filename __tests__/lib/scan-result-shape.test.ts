import { describe, it, expect } from 'vitest';
import {
    SCAN_RESULT_LATEST_SCHEMA_VERSION,
    getScanResultSchemaVersion,
    mergeScanResultPatch,
    normalizePasses,
    normalizeScanResultForPersist,
} from '@/lib/scan-result-shape';
import type { ScanResult } from '@/lib/types';

function minimalScan(over: Partial<ScanResult> = {}): ScanResult {
    return {
        id: 'id-1',
        url: 'https://example.com',
        timestamp: 't',
        standard: 'WCAG2AA',
        device: 'desktop',
        runners: ['axe'],
        issues: [],
        passes: [],
        stats: { errors: 0, warnings: 1, notices: 0, total: 1 },
        durationMs: 100,
        score: 99,
        screenshot: '',
        performance: { ttfb: 0, fcp: 0, domLoad: 0, windowLoad: 0, lcp: 0 },
        eco: { co2: 0, grade: 'A', pageWeight: 0 },
        ...over,
    };
}

describe('normalizeScanResultForPersist', () => {
    it('sets scanSchemaVersion when missing', () => {
        const base = minimalScan();
        delete (base as Partial<ScanResult>).scanSchemaVersion;
        const out = normalizeScanResultForPersist(base);
        expect(out.scanSchemaVersion).toBe(SCAN_RESULT_LATEST_SCHEMA_VERSION);
    });

    it('normalizes passes from loose axe-like nodes', () => {
        const out = normalizeScanResultForPersist(
            minimalScan({
                passes: [
                    {
                        id: 'rule-1',
                        description: 'd',
                        help: 'h',
                        nodes: [{ html: '<p/>', target: ['x'], failureSummary: 'fs' }],
                    },
                    { notValid: true } as unknown as import('@/lib/types').Pass,
                ],
            })
        );
        expect(out.passes).toHaveLength(1);
        expect(out.passes[0]?.id).toBe('rule-1');
        expect(out.passes[0]?.nodes[0]?.target).toEqual(['x']);
    });
});

describe('normalizePasses', () => {
    it('returns empty for non-array', () => {
        expect(normalizePasses(null)).toEqual([]);
    });
});

describe('mergeScanResultPatch', () => {
    it('preserves schema version when patch omits it', () => {
        const cur = normalizeScanResultForPersist(minimalScan({ scanSchemaVersion: 1 }));
        const merged = mergeScanResultPatch(cur, { score: 50 });
        expect(merged.scanSchemaVersion).toBe(1);
        expect(merged.score).toBe(50);
    });
});

describe('getScanResultSchemaVersion', () => {
    it('returns undefined for legacy', () => {
        expect(getScanResultSchemaVersion(minimalScan({ scanSchemaVersion: undefined }))).toBeUndefined();
    });
});
