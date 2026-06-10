import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const deepSrc = readFileSync(
    join(process.cwd(), 'components/pdf/ProjectReportDeepSections.tsx'),
    'utf8'
);
const docSrc = readFileSync(join(process.cwd(), 'components/pdf/ProjectReportDocument.tsx'), 'utf8');

describe('PDF competitive layout', () => {
    it('uses extended scoreboard and topic overlap table', () => {
        expect(deepSrc).toContain('PdfCompetitiveScoreboardTable');
        expect(deepSrc).toContain('PdfTopicOverlapTable');
        expect(deepSrc).not.toContain('competitorTopicOverlap');
    });

    it('wires agent interpretations on competitive deep page', () => {
        expect(deepSrc).toContain('resolveCompetitiveInterpretations');
        expect(deepSrc).toContain('PdfMetricInterpretationGroup');
        expect(deepSrc).toContain('competitiveInterpretations.scoreboard');
        expect(deepSrc).toContain('competitiveInterpretations.topicOverlap');
        expect(deepSrc).toContain('competitiveInsightDescription');
        expect(deepSrc).toContain('competitiveInterpretations.insightsOverview');
    });

    it('moves findings before actions and skips redundant deep sections', () => {
        expect(docSrc).toContain("'findings'");
        expect(docSrc).toContain('formatFindingSeverity');
        expect(deepSrc).not.toContain('deep-findings');
        expect(deepSrc).not.toContain('deep-geo-models');
        expect(deepSrc).not.toContain('deep-section-geo');
        expect(deepSrc).not.toContain("['siteQuality', sections.siteQuality]");
    });
});
