import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const seoSrc = readFileSync(
    join(process.cwd(), 'components/pdf/ProjectReportSeoSection.tsx'),
    'utf8'
);

describe('PDF SEO section layout', () => {
    it('separates on-page SEO from SERP keyword rankings', () => {
        expect(seoSrc).toContain('seo.on-page');
        expect(seoSrc).toContain('seo.serp-rankings');
        expect(seoSrc).toContain('labels.seoOnPageSection');
        expect(seoSrc).toContain('labels.serpKeywordRankings');
    });

    it('avoids duplicate keyword analysis blocks', () => {
        expect(seoSrc).not.toContain('keywordInsightDescription');
        expect(seoSrc).not.toContain('PdfRecommendationRow');
        expect(seoSrc).not.toContain('seoSection?.summary');
        expect(seoSrc).not.toContain('interpretations.keywords');
        expect(seoSrc).not.toContain('interpretations.rankingScore');
    });
});
