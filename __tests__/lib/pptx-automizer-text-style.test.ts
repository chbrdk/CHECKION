import { describe, expect, it } from 'vitest';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { buildProjectReportPptxPlan } from '@/lib/project-report/pptx/build-pptx-plan';
import { layoutHasBlackBackground } from '@/lib/project-report/pptx/pptx-automizer-text-style';
import { readActivePresentationSlideXml } from '@/lib/project-report/pptx/pptx-output-assertions';
import { renderProjectReportPptx } from '@/lib/project-report/pptx/render-pptx';

const CHECKION_ROOT = process.cwd();

describe('pptx-automizer-text-style', () => {
    it('treats all MSQDX report layouts as black background', () => {
        expect(layoutHasBlackBackground('CONTENT')).toBe(true);
        expect(layoutHasBlackBackground('TWO_COLUMN')).toBe(true);
        expect(layoutHasBlackBackground('METRICS')).toBe(true);
        expect(layoutHasBlackBackground('CLOSING')).toBe(true);
    });

    it('writes white text runs on Text only (BK) slides', async () => {
        const bundle = buildComprehensivePreviewBundle();
        const fullPlan = buildProjectReportPptxPlan(bundle);
        const bulletsSlide = fullPlan.slides.find((slide) => slide.kind === 'bullets');
        expect(bulletsSlide).toBeDefined();

        const buffer = await renderProjectReportPptx(
            {
                ...fullPlan,
                slides: bulletsSlide ? [bulletsSlide] : [],
            },
            CHECKION_ROOT
        );

        const slideXml = readActivePresentationSlideXml(buffer)[0] ?? '';
        expect(slideXml).toContain('val="FFFFFF"');
        expect(slideXml).not.toMatch(/val="000000"/);
        expect(slideXml).toContain('IBM Plex Mono');
    });
});
