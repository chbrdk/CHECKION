import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadProjects(name: 'de' | 'en'): Record<string, string> {
    const raw = readFileSync(join(__dirname, `../../locales/${name}.json`), 'utf8');
    const parsed = JSON.parse(raw) as { projects: Record<string, string> };
    return parsed.projects;
}

describe('project GEO page i18n', () => {
    it('de and en define geoQuestionTrends (MoleculeCard title)', () => {
        const de = loadProjects('de');
        const en = loadProjects('en');
        expect(de.geoQuestionTrends).toBeTruthy();
        expect(en.geoQuestionTrends).toBeTruthy();
        expect(de.geoQuestionTrends).not.toBe(en.geoQuestionTrends);
    });
});
