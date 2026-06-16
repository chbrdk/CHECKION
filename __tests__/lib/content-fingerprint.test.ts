import { describe, it, expect } from 'vitest';
import { buildContentFingerprint } from '@/lib/content-fingerprint';
import { buildDomainScanDiff } from '@/lib/domain-scan-diff';
import type { DomainPageDiffInput } from '@/lib/domain-scan-diff';

describe('buildContentFingerprint', () => {
    it('is stable for same inputs', () => {
        const a = buildContentFingerprint({
            title: 'Hello',
            h1: 'World',
            bodyTextExcerpt: 'Body text here',
        });
        const b = buildContentFingerprint({
            title: 'hello',
            h1: 'world',
            bodyTextExcerpt: 'Body   text here',
        });
        expect(a).toBe(b);
    });

    it('changes when body changes', () => {
        const a = buildContentFingerprint({ title: 'T', h1: 'H', bodyTextExcerpt: 'A' });
        const b = buildContentFingerprint({ title: 'T', h1: 'H', bodyTextExcerpt: 'B' });
        expect(a).not.toBe(b);
    });
});

describe('buildDomainScanDiff fingerprint', () => {
    it('marks unchanged when fingerprint matches without headers', () => {
        const fp = 'abc123';
        const current: DomainPageDiffInput[] = [{ url: 'https://ex.com/p', contentFingerprint: fp }];
        const previous: DomainPageDiffInput[] = [{ url: 'https://ex.com/p', contentFingerprint: fp }];
        const diff = buildDomainScanDiff({
            currentScanId: 's2',
            previousScanId: 's1',
            lineageKey: 'k',
            currentVersion: 2,
            currentPages: current,
            previousPages: previous,
        });
        expect(diff.summary.unchangedCount).toBe(1);
    });

    it('marks likely_updated when fingerprint differs', () => {
        const current: DomainPageDiffInput[] = [{ url: 'https://ex.com/p', contentFingerprint: 'new' }];
        const previous: DomainPageDiffInput[] = [{ url: 'https://ex.com/p', contentFingerprint: 'old' }];
        const diff = buildDomainScanDiff({
            currentScanId: 's2',
            previousScanId: 's1',
            lineageKey: 'k',
            currentVersion: 2,
            currentPages: current,
            previousPages: previous,
        });
        expect(diff.summary.likelyUpdatedCount).toBe(1);
        expect(diff.pages[0]?.signals?.fingerprintChanged).toBe(true);
    });
});
