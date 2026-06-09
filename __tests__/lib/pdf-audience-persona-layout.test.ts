/**
 * Audience persona cards use dedicated header styles and a separate personas page.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const audienceSectionsSrc = readFileSync(
    join(process.cwd(), 'components/pdf/ProjectReportAudienceSections.tsx'),
    'utf8'
);
const pdfStylesSrc = readFileSync(join(process.cwd(), 'components/pdf/shared/pdf-styles.ts'), 'utf8');

describe('PDF audience persona layout', () => {
    it('defines persona-specific card and name styles', () => {
        expect(pdfStylesSrc).toContain('personaCardName');
        expect(pdfStylesSrc).toContain('marginBottom: 4');
        const nameBlock = pdfStylesSrc.split('personaCardName:')[1]?.split('personaCardSubtitle:')[0] ?? '';
        expect(nameBlock).not.toContain('flex: 1');
    });

    it('keeps persona header from splitting across pages', () => {
        expect(audienceSectionsSrc).toContain('wrap={false}');
        expect(audienceSectionsSrc).toContain('minPresenceAhead={72}');
        expect(audienceSectionsSrc).toContain('pdfStyles.personaCardName');
        expect(audienceSectionsSrc).not.toContain('geoQuestionTitle}>{persona.personaName}');
    });

    it('renders personas on a dedicated page after the intro', () => {
        expect(audienceSectionsSrc).toContain('key="audience-intro"');
        expect(audienceSectionsSrc).toContain('key="audience-personas"');
    });
});
