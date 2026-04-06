import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDomainResult(name: 'de' | 'en'): Record<string, string> {
    const raw = readFileSync(join(__dirname, `../../locales/${name}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { domainResult: Record<string, string> };
    return parsed.domainResult;
}

function loadInfo(name: 'de' | 'en'): Record<string, string> {
    const raw = readFileSync(join(__dirname, `../../locales/${name}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { info: Record<string, string> };
    return parsed.info;
}

describe('page topics visualization i18n', () => {
    it('de and en define treemap and spectrum copy', () => {
        const de = loadDomainResult('de');
        const en = loadDomainResult('en');
        const keys = [
            'pageTopicsDiagramTitle',
            'pageTopicsViewBubbleMatrix',
            'pageTopicsBubbleMatrixCaption',
            'pageTopicsAxisAvgTier',
            'pageTopicsAxisPages',
            'pageTopicsBubbleTooltip',
            'pageTopicsTierSpectrumTitle',
            'pageTopicsTierSpectrumCaption',
            'pageTopicsTierLegendShort',
        ] as const;
        for (const key of keys) {
            expect(de[key]?.length).toBeGreaterThan(3);
            expect(en[key]?.length).toBeGreaterThan(3);
        }
        expect(de.pageTopicsDiagramTitle).not.toBe(en.pageTopicsDiagramTitle);
    });

    it('de and en define low-tier-dominant chip copy and info tooltip', () => {
        const deDr = loadDomainResult('de');
        const enDr = loadDomainResult('en');
        const deInfo = loadInfo('de');
        const enInfo = loadInfo('en');
        expect(deDr.pageTopicsLowTierDominant).toContain('{{count}}');
        expect(enDr.pageTopicsLowTierDominant).toContain('{{count}}');
        expect(deDr.pageTopicsLowTierDominant).toContain('Rand-Tags');
        expect(enDr.pageTopicsLowTierDominant).toContain('peripheral');
        expect(deInfo.pageTopicsLowTierDominant?.length).toBeGreaterThan(40);
        expect(enInfo.pageTopicsLowTierDominant?.length).toBeGreaterThan(40);
        expect(deInfo.pageTopicsLowTierDominant).not.toBe(enInfo.pageTopicsLowTierDominant);
    });
});
