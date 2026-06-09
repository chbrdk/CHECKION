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
        expect(pdfStylesSrc).toContain('personaPillarGrid');
        expect(pdfStylesSrc).toContain('personaInsightsBlock');
        expect(pdfStylesSrc).toContain('personaPillarLegend');
        const nameBlock = pdfStylesSrc.split('personaCardName:')[1]?.split('personaCardSubtitle:')[0] ?? '';
        expect(nameBlock).not.toContain('flex: 1');
    });

    it('uses compact persona cards and distinct persona selection', () => {
        expect(audienceSectionsSrc).toContain('selectDistinctPersonasForPdf');
        expect(audienceSectionsSrc).toContain('PersonaPillarFitLegend');
        expect(audienceSectionsSrc).toContain('PersonaInsightsBlock');
        expect(audienceSectionsSrc).not.toContain('PdfRecommendationRow');
        expect(audienceSectionsSrc).not.toContain('.slice(0, 8)');
    });

    it('renders personas on dedicated pages after the intro', () => {
        expect(audienceSectionsSrc).toContain('key="audience-intro"');
        expect(audienceSectionsSrc).toContain("'audience-personas'");
        expect(audienceSectionsSrc).toContain('chunkPersonasForPdfPages');
    });
});
