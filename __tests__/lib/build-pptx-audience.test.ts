import { describe, expect, it } from 'vitest';
import { buildComprehensivePreviewBundle } from '@/lib/paths/pdf-print-preview-bundle';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    buildAudienceIntroBullets,
    buildPersonaChartBullets,
    buildPersonaDetailBullets,
    buildTargetGroupBullets,
    selectPersonasForPptx,
} from '@/lib/project-report/pptx/build-pptx-audience';
import { buildProjectReportPptxPlan } from '@/lib/project-report/pptx/build-pptx-plan';

describe('build-pptx-audience', () => {
    const bundle = buildComprehensivePreviewBundle();
    const audience = bundle.audience!;
    const labels = getProjectReportPdfLabels('de');

    it('builds intro bullets from AUDION summary data', () => {
        const bullets = buildAudienceIntroBullets(audience, labels);
        expect(bullets.some((line) => line.includes('AUDION:'))).toBe(true);
        expect(bullets.some((line) => line.includes('Personas'))).toBe(true);
    });

    it('lists target groups with descriptions', () => {
        const bullets = buildTargetGroupBullets(audience);
        expect(bullets[0]).toContain('Verantwortungsbewusste Hundehalter');
        expect(bullets[0]).toContain('Besitzer großer Rassen');
    });

    it('adds explanatory bullets for persona charts', () => {
        const persona = audience.personas[0]!;
        const bullets = buildPersonaChartBullets(persona, labels);
        expect(bullets.length).toBeGreaterThan(0);
        expect(bullets.some((line) => line.includes('Labrador') || line.includes('Tarif'))).toBe(true);
    });

    it('adds pillar and journey detail bullets', () => {
        const persona = audience.personas[0]!;
        const bullets = buildPersonaDetailBullets(persona, labels, 'de');
        expect(bullets.some((line) => line.startsWith('WCAG:') || line.startsWith('UX-Journey:'))).toBe(
            true
        );
    });

    it('selects up to three distinct personas', () => {
        expect(selectPersonasForPptx(audience.personas).length).toBe(3);
    });
});

describe('buildProjectReportPptxPlan audience', () => {
    it('includes audience narrative slides beyond radar charts', () => {
        const plan = buildProjectReportPptxPlan(buildComprehensivePreviewBundle());
        const audienceBullets = plan.slides.filter(
            (slide) =>
                slide.kind === 'bullets' &&
                (slide.title.includes('Zielgruppen') ||
                    slide.title.includes('Personas') ||
                    slide.title.includes('Persona-Sicht'))
        );
        const personaCharts = plan.slides.filter(
            (slide) => slide.kind === 'chart' && slide.chartType === 'radar'
        );

        expect(audienceBullets.length).toBeGreaterThanOrEqual(2);
        expect(personaCharts.length).toBeGreaterThanOrEqual(1);
        expect(personaCharts[0]?.bullets?.length).toBeGreaterThan(0);

        const allChartBullets = plan.slides.flatMap((slide) =>
            slide.kind === 'chart' ? (slide.bullets ?? []) : []
        );
        const contextSlides = plan.slides.filter(
            (slide) => slide.kind === 'bullets' && slide.title.includes('Kontext')
        );
        const contextBullets = contextSlides.flatMap((slide) =>
            slide.kind === 'bullets' ? slide.bullets : []
        );
        expect(allChartBullets.length + contextBullets.length).toBeGreaterThan(0);
        expect([...allChartBullets, ...contextBullets].every((line) => !line.endsWith('…'))).toBe(true);
    });
});
