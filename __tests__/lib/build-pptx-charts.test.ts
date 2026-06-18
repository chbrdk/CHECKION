import { describe, expect, it } from 'vitest';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    buildPersonaRadarSlide,
    chartSlideFromVisual,
    findVisual,
} from '@/lib/project-report/pptx/build-pptx-charts';
import { buildProjectReportPptxPlan } from '@/lib/project-report/pptx/build-pptx-plan';
import { getPptxMaxSlides } from '@/lib/project-report/pptx/types';

describe('build-pptx-charts', () => {
    const bundle = buildComprehensivePreviewBundle();
    const labels = getProjectReportPdfLabels('de');
    const footer = 'Test Footer';

    it('maps scoreCards visual to bar chart slide', () => {
        const visual = findVisual(bundle.visuals, 'scoreCards');
        expect(visual).toBeDefined();
        const slide = chartSlideFromVisual(visual!, labels, footer, 'de');
        expect(slide?.kind).toBe('chart');
        expect(slide?.chartType).toBe('bar');
        expect(slide?.series[0]?.values.length).toBeGreaterThan(0);
    });

    it('maps rankingKeywords to horizontal bar chart', () => {
        const visual = findVisual(bundle.visuals, 'rankingKeywords');
        expect(visual).toBeDefined();
        const slide = chartSlideFromVisual(visual!, labels, footer, 'de');
        expect(slide?.chartType).toBe('barHorizontal');
    });

    it('maps rankTrend to line chart with legend', () => {
        const visual = findVisual(bundle.visuals, 'rankTrend');
        expect(visual).toBeDefined();
        const slide = chartSlideFromVisual(visual!, labels, footer, 'de');
        expect(slide?.chartType).toBe('line');
        expect(slide?.showLegend).toBe(true);
        expect((slide?.series.length ?? 0)).toBeGreaterThan(0);
    });

    it('builds persona radar slide from pillars', () => {
        const slide = buildPersonaRadarSlide(
            'Haftpflicht-Käufer',
            [
                { pillar: 'Trust', score: 72 },
                { pillar: 'Price', score: 55 },
                { pillar: 'Clarity', score: 80 },
            ],
            footer,
            'de'
        );
        expect(slide?.chartType).toBe('radar');
        expect(slide?.series[0]?.values).toEqual([72, 55, 80]);
    });
});

describe('buildProjectReportPptxPlan charts', () => {
    it('includes chart slides for comprehensive preview bundle', () => {
        const bundle = buildComprehensivePreviewBundle();
        const plan = buildProjectReportPptxPlan(bundle);
        const chartSlides = plan.slides.filter((slide) => slide.kind === 'chart');

        expect(chartSlides.length).toBeGreaterThanOrEqual(4);
        expect(chartSlides.some((slide) => slide.chartType === 'bar')).toBe(true);
        expect(chartSlides.some((slide) => slide.chartType === 'barHorizontal')).toBe(true);
        expect(chartSlides.some((slide) => slide.chartType === 'line')).toBe(true);
        expect(plan.slides.length).toBeLessThanOrEqual(getPptxMaxSlides(bundle.variant));
    });
});
