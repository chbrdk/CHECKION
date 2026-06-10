import { describe, it, expect } from 'vitest';
import { buildEchonMarketPdfContent } from '@/lib/project-report/pdf-echon-display';
import { shouldShowMarketSignalsPage } from '@/components/pdf/ProjectReportMarketSection';
import { buildProjectReportOutline } from '@/lib/paths/pdf-chapter-numbering';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { emptyProjectSetupContext } from '@/lib/project-report/project-setup-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';
import type { ProjectReportBundle } from '@/lib/project-report/types';

describe('pdf echon display', () => {
    it('dedupes echon summary when it matches executive narrative', () => {
        const content = buildEchonMarketPdfContent(
            {
                available: true,
                executiveSummary: 'Der Markt ist unter Druck durch Digitalisierung.',
                keyFindings: ['Regulatorik steigt'],
            },
            { executiveSummaryNarrative: 'Der Markt ist unter Druck durch Digitalisierung und neue Player.' }
        );
        expect(content.show).toBe(true);
        expect(content.executiveSummary).toBeNull();
        expect(content.keyFindings).toContain('Regulatorik steigt');
    });

    it('shows market page when findings remain after dedupe', () => {
        const bundle = {
            marketContext: {
                available: true,
                executiveSummary: 'Unique market view.',
                keyFindings: ['Trend A'],
                watchlist: ['Watch X'],
            },
            narrative: { executiveSummary: 'Scan summary only.' },
        } as unknown as ProjectReportBundle;
        expect(shouldShowMarketSignalsPage(bundle)).toBe(true);
    });
});

describe('market signals outline', () => {
    it('inserts market chapter after executive when echon content available', () => {
        const labels = getProjectReportPdfLabels('de');
        const bundle = {
            variant: 'comprehensive',
            narrative: { executiveSummary: 'Exec', competitiveLandscape: null, findings: [], recommendations: [] },
            domain: null,
            rankings: null,
            geo: null,
            deep: null,
            audience: null,
            setup: emptyProjectSetupContext(),
            marketContext: {
                available: true,
                executiveSummary: 'Externe Marktlage.',
                keyFindings: ['Signal 1'],
            },
            visuals: [],
            journey: null,
        } as unknown as ProjectReportBundle;
        const outline = buildProjectReportOutline(bundle, labels);
        const ids = outline.map((e) => e.id);
        expect(ids.indexOf('executive')).toBeLessThan(ids.indexOf('market'));
        expect(ids.indexOf('market')).toBeLessThan(ids.indexOf('quality'));
    });

    it('omits market chapter when echon unavailable', () => {
        const labels = getProjectReportPdfLabels('de');
        const bundle = {
            variant: 'comprehensive',
            narrative: null,
            domain: null,
            rankings: null,
            geo: null,
            deep: null,
            audience: null,
            setup: emptyProjectSetupContext(),
            marketContext: emptyEchonMarketContext('echon_not_configured'),
            visuals: [],
            journey: null,
        } as unknown as ProjectReportBundle;
        const outline = buildProjectReportOutline(bundle, labels);
        expect(outline.some((e) => e.id === 'market')).toBe(false);
    });
});
