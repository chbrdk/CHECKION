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

describe('page topics visualization i18n', () => {
    it('de and en define treemap and spectrum copy', () => {
        const de = loadDomainResult('de');
        const en = loadDomainResult('en');
        const keys = [
            'pageTopicsDiagramTitle',
            'pageTopicsDiagramCaption',
            'pageTopicsTierSpectrumTitle',
            'pageTopicsTierSpectrumCaption',
            'pageTopicsTreemapTooltip',
            'pageTopicsTierLegendShort',
        ] as const;
        for (const key of keys) {
            expect(de[key]?.length).toBeGreaterThan(3);
            expect(en[key]?.length).toBeGreaterThan(3);
        }
        expect(de.pageTopicsDiagramTitle).not.toBe(en.pageTopicsDiagramTitle);
    });
});
