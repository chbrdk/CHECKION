import { describe, expect, it } from 'vitest';
import {
    computeChartLayout,
    fitBulletsToZone,
    fitBulletSlide,
    fitTextToZone,
    PPTX_ZONE_BUDGETS,
    PPTX_ZONE_GEOMETRY,
} from '@/lib/project-report/pptx/pptx-content-budget';
import { normalizePptxPlan } from '@/lib/project-report/pptx/normalize-pptx-plan';
import type { ReportSlide } from '@/lib/project-report/pptx/types';

describe('pptx-content-budget', () => {
    it('truncates long titles to zone budget', () => {
        const longTitle = 'A'.repeat(200);
        const fitted = fitTextToZone(longTitle, 'title');
        expect(fitted.endsWith('…')).toBe(true);
        expect(fitted.length).toBeLessThanOrEqual(
            PPTX_ZONE_BUDGETS.title.maxCharsPerLine * PPTX_ZONE_BUDGETS.title.maxLines
        );
    });

    it('keeps at most two chart bullets on slide', () => {
        const bullets = ['First insight', 'Second insight', 'Third insight', 'Fourth insight'];
        const { fitted, overflow } = fitBulletsToZone(bullets, 'chartBullets');
        expect(fitted).toHaveLength(2);
        expect(overflow).toHaveLength(2);
    });

    it('places chart and bullets above footer without overlap', () => {
        const layout = computeChartLayout({
            chartType: 'radar',
            subtitle: 'Persona profile with extended narrative context for the slide',
            bullets: ['Bullet one with explanatory text', 'Bullet two with more detail'],
        });

        const bulletBottom = layout.bulletTop + layout.bulletHeight;
        expect(layout.y).toBe(2.023);
        expect(layout.w).toBeCloseTo(10.239, 2);
        expect(layout.y + layout.h).toBeLessThanOrEqual(layout.bulletTop);
        expect(bulletBottom).toBeLessThanOrEqual(PPTX_ZONE_GEOMETRY.footerTop);
        expect(layout.onSlideBullets).toHaveLength(2);
    });

    it('reduces chart height when bullets are present', () => {
        const withoutBullets = computeChartLayout({ chartType: 'bar' });
        const withBullets = computeChartLayout({
            chartType: 'bar',
            bullets: ['One', 'Two'],
        });
        expect(withBullets.h).toBeLessThan(withoutBullets.h);
    });

    it('limits eyebrow subtitle to one line from master placeholder height', () => {
        const fitted = fitTextToZone('A'.repeat(200), 'eyebrow');
        expect(PPTX_ZONE_BUDGETS.eyebrow.maxLines).toBe(1);
        expect(fitted.length).toBeLessThanOrEqual(PPTX_ZONE_BUDGETS.eyebrow.maxCharsPerLine);
    });

    it('splits overflow body bullets into continuation slides', () => {
        const slide: ReportSlide = {
            kind: 'bullets',
            layout: 'CONTENT',
            title: 'Details',
            bullets: Array.from({ length: 10 }, (_, index) => `Point ${index + 1}`),
            footer: 'CHECKION',
        };
        const normalized = normalizePptxPlan([slide], { locale: 'de' });
        expect(normalized.length).toBeGreaterThan(1);
        expect(normalized[1]?.kind).toBe('bullets');
        if (normalized[1]?.kind === 'bullets') {
            expect(normalized[1].title).toContain('Forts.');
        }
    });

    it('moves chart bullet overflow to context slide', () => {
        const slide: ReportSlide = {
            kind: 'chart',
            layout: 'CONTENT',
            title: 'Radar',
            chartType: 'radar',
            series: [{ name: 'A', values: [1, 2, 3] }],
            categories: ['X', 'Y', 'Z'],
            bullets: ['One', 'Two', 'Three'],
            footer: 'CHECKION',
        };
        const normalized = normalizePptxPlan([slide], { locale: 'de' });
        const chartSlide = normalized[0];
        expect(chartSlide?.kind).toBe('chart');
        if (chartSlide?.kind === 'chart') {
            expect(chartSlide.bullets?.length).toBeLessThanOrEqual(2);
        }
        expect(normalized.some((s) => s.kind === 'bullets' && s.title.includes('Kontext'))).toBe(true);
    });

    it('fits bullet slides within body zone', () => {
        const fitted = fitBulletSlide({
            title: 'Audience',
            lead: 'Short lead',
            bullets: Array.from({ length: 8 }, (_, index) => `Insight number ${index + 1}`),
        });
        expect(fitted.bullets.length).toBeLessThanOrEqual(PPTX_ZONE_BUDGETS.body.maxItems ?? 6);
        expect(fitted.overflowBullets.length).toBeGreaterThan(0);
    });
});
