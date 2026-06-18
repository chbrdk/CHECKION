import { describe, expect, it } from 'vitest';
import {
    computeChartLayout,
    layoutBulletSlide,
    overflowBulletsSlides,
    PPTX_ZONE_BUDGETS,
    PPTX_ZONE_GEOMETRY,
} from '@/lib/project-report/pptx/pptx-content-budget';
import { normalizePptxPlan } from '@/lib/project-report/pptx/normalize-pptx-plan';
import {
    partitionTextToZone,
    splitTextToPages,
    wrapTextToLines,
} from '@/lib/project-report/pptx/pptx-text-layout';
import type { ReportSlide } from '@/lib/project-report/pptx/types';

describe('pptx-text-layout', () => {
    it('wraps words without truncating', () => {
        const lines = wrapTextToLines('hello world from checkion export', 10);
        expect(lines.every((line) => line.length <= 10)).toBe(true);
        expect(lines.join(' ')).toContain('checkion');
    });

    it('splits long title to continuation pages instead of ellipsis', () => {
        const longTitle = 'Strategische Zielgruppenanalyse für verantwortungsbewusste Hundehalter mit Fokus auf Premium-Tarife';
        const pages = splitTextToPages(longTitle, 'title');
        expect(pages.length).toBeGreaterThan(1);
        expect(pages.join(' ')).toBe(longTitle.replace(/\s+/g, ' ').trim());
    });
});

describe('pptx-content-budget', () => {
    it('never truncates title text — overflow is separate', () => {
        const longTitle = 'A'.repeat(200);
        const { onSlide, overflow } = partitionTextToZone(longTitle, 'title');
        expect(onSlide.endsWith('…')).toBe(false);
        expect(onSlide.length + overflow.length).toBeGreaterThanOrEqual(200);
    });

    it('packs chart bullets by measured height without cutting text', () => {
        const bullets = ['First insight', 'Second insight', 'Third insight', 'Fourth insight'];
        const layout = computeChartLayout({ chartType: 'bar', bullets });
        const preserved = [...layout.onSlideBullets, ...layout.overflowBullets].join(' ');
        expect(preserved).toContain('Third insight');
        expect(preserved).toContain('Fourth insight');
        expect(layout.onSlideBullets.every((bullet) => !bullet.endsWith('…'))).toBe(true);
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
    });

    it('reduces chart height when bullets are present', () => {
        const withoutBullets = computeChartLayout({ chartType: 'bar' });
        const withBullets = computeChartLayout({
            chartType: 'bar',
            bullets: ['One', 'Two'],
        });
        expect(withBullets.h).toBeLessThan(withoutBullets.h);
    });

    it('moves overflowing subtitle to context slide intact', () => {
        const longSubtitle = 'Subtitle '.repeat(20).trim();
        const layout = computeChartLayout({ chartType: 'bar', subtitle: longSubtitle });
        const restored = [layout.fittedSubtitle, layout.overflowSubtitle].filter(Boolean).join(' ');
        expect(restored.replace(/\s+/g, ' ').trim()).toBe(longSubtitle.replace(/\s+/g, ' ').trim());
    });

    it('splits overflow body bullets into continuation slides with full text', () => {
        const slide: ReportSlide = {
            kind: 'bullets',
            layout: 'CONTENT',
            title: 'Details',
            bullets: Array.from({ length: 25 }, (_, index) => `Point ${index + 1}`),
            footer: 'CHECKION',
        };
        const normalized = normalizePptxPlan([slide], { locale: 'de' });
        const allBullets = normalized.flatMap((entry) => (entry.kind === 'bullets' ? entry.bullets : []));
        expect(normalized.length).toBeGreaterThan(1);
        expect(allBullets).toHaveLength(25);
        expect(allBullets[24]).toBe('Point 25');
    });

    it('moves chart bullet overflow to context slide without truncation', () => {
        const slide: ReportSlide = {
            kind: 'chart',
            layout: 'CONTENT',
            title: 'Radar',
            chartType: 'radar',
            series: [{ name: 'A', values: [1, 2, 3] }],
            categories: ['X', 'Y', 'Z'],
            bullets: ['One', 'Two', 'Three', 'Four'],
            footer: 'CHECKION',
        };
        const normalized = normalizePptxPlan([slide], { locale: 'de' });
        const chartBullets = normalized.flatMap((entry) =>
            entry.kind === 'chart' ? (entry.bullets ?? []) : entry.kind === 'bullets' ? entry.bullets : []
        );
        expect(chartBullets).toContain('Four');
        expect(chartBullets.every((bullet) => !bullet.endsWith('…'))).toBe(true);
    });

    it('packs bullet slides by line budget from master placeholder', () => {
        const laidOut = layoutBulletSlide({
            title: 'Audience',
            lead: 'Short lead',
            bullets: Array.from({ length: 25 }, (_, index) => `Insight number ${index + 1}`),
        });
        expect(laidOut.bullets.length).toBeGreaterThan(0);
        expect(laidOut.overflowBullets.length).toBeGreaterThan(0);
        expect([...laidOut.bullets, ...laidOut.overflowBullets]).toHaveLength(25);
    });

    it('chunks continuation slides by measured line capacity', () => {
        const base: Extract<ReportSlide, { kind: 'bullets' }> = {
            kind: 'bullets',
            layout: 'CONTENT',
            title: 'Test',
            bullets: [],
            footer: 'CHECKION',
        };
        const many = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);
        const slides = overflowBulletsSlides(base, many, ' (Forts.)');
        const total = slides.flatMap((slide) => slide.bullets).length;
        expect(total).toBe(12);
    });
});
