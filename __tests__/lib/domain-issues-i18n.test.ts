import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadLocale(name: 'de' | 'en'): { domainResult: Record<string, string> } {
    const raw = readFileSync(join(__dirname, `../../locales/${name}.json`), 'utf8');
    return JSON.parse(raw) as { domainResult: Record<string, string> };
}

describe('domain issues master/detail i18n', () => {
    it('de and en define issuesColumnGroupsTitle for the groups list column', () => {
        const de = loadLocale('de');
        const en = loadLocale('en');
        expect(de.domainResult.issuesColumnGroupsTitle).toBeTruthy();
        expect(en.domainResult.issuesColumnGroupsTitle).toBeTruthy();
        expect(de.domainResult.issuesColumnGroupsTitle).not.toBe(en.domainResult.issuesColumnGroupsTitle);
    });

    it('de and en define stepped navigation back labels', () => {
        const de = loadLocale('de');
        const en = loadLocale('en');
        expect(de.domainResult.issuesBackToGroups).toBeTruthy();
        expect(en.domainResult.issuesBackToGroups).toBeTruthy();
        expect(de.domainResult.issuesBackToPages).toBeTruthy();
        expect(en.domainResult.issuesBackToPages).toBeTruthy();
    });

    it('de and en define Links & SEO tab strings (stats, SEO rows)', () => {
        const de = loadLocale('de');
        const en = loadLocale('en');
        expect(de.domainResult.seoWordCount).toBeTruthy();
        expect(en.domainResult.seoWordCount).toBeTruthy();
        expect(de.domainResult.linksStatBrokenTitle).toBeTruthy();
        expect(en.domainResult.linksStatBrokenTitle).toBeTruthy();
        expect(de.domainResult.linksStatSummaryLine).not.toBe(en.domainResult.linksStatSummaryLine);
    });
});
