import { describe, it, expect } from 'vitest';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { buildChartSpecs } from '@/lib/project-report/chart-specs';

describe('pdf-print-preview-bundle', () => {
    it('returns comprehensive variant with deep and audience overlays', () => {
        const bundle = buildComprehensivePreviewBundle();
        expect(bundle.variant).toBe('comprehensive');
        expect(bundle.deep?.geoDeep?.questionDetails.length).toBeGreaterThan(0);
        expect(bundle.audience?.personas.length).toBeGreaterThan(0);
        expect(bundle.visuals.length).toBeGreaterThan(3);
    });

    it('produces chart specs compatible with ProjectReportDocument', () => {
        const bundle = buildComprehensivePreviewBundle();
        const specs = buildChartSpecs(
            bundle.domain,
            bundle.competitors,
            bundle.rankings,
            bundle.geo,
            bundle.project.domain,
            bundle.rankTrends,
            bundle.deep
        );
        expect(specs.some((s) => s.kind === 'geoModelVisibility')).toBe(true);
        expect(specs.some((s) => s.kind === 'competitorTopicOverlap')).toBe(true);
    });
});
