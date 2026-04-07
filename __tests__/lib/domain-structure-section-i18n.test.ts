import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function domainResultKeys(locale: 'de' | 'en'): Record<string, unknown> {
    const raw = readFileSync(join(__dirname, `../../locales/${locale}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { domainResult: Record<string, unknown> };
    return parsed.domainResult;
}

describe('domain structure section i18n', () => {
    it('defines structure tab copy in de and en', () => {
        const keys = [
            'structureDomainTitle',
            'structureDomainSubtitle',
            'structureKpiMultipleH1',
            'structureCardMultipleH1Title',
            'structureCardSkippedTitle',
            'structureListEmpty',
            'structureEmpty',
        ] as const;
        for (const locale of ['de', 'en'] as const) {
            const dr = domainResultKeys(locale);
            for (const k of keys) {
                expect(typeof dr[k], `${locale}.${k}`).toBe('string');
                expect(String(dr[k]).length).toBeGreaterThan(2);
            }
        }
    });
});
