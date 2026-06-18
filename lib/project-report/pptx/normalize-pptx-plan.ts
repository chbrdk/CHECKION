/**
 * Normalize slide plans to respect per-zone text budgets and avoid overlap.
 */
import {
    computeChartLayout,
    fitBulletSlide,
    fitColumnContent,
    fitTextToZone,
    overflowBulletsSlides,
} from '@/lib/project-report/pptx/pptx-content-budget';
import type { ReportSlide } from '@/lib/project-report/pptx/types';

function chartOverflowSlides(
    slide: Extract<ReportSlide, { kind: 'chart' }>,
    overflowBullets: string[],
    locale: 'de' | 'en' = 'de'
): ReportSlide[] {
    if (overflowBullets.length === 0) return [];
    const suffix = locale === 'de' ? ' — Kontext' : ' — context';
    const base: Extract<ReportSlide, { kind: 'bullets' }> = {
        kind: 'bullets',
        layout: 'CONTENT',
        title: slide.title,
        bullets: [],
        footer: slide.footer,
    };
    return overflowBulletsSlides(base, overflowBullets, suffix);
}

export function normalizeReportSlide(slide: ReportSlide, locale: 'de' | 'en' = 'de'): ReportSlide[] {
    switch (slide.kind) {
        case 'chart': {
            const layout = computeChartLayout({
                subtitle: slide.subtitle,
                bullets: slide.bullets,
                chartType: slide.chartType,
            });
            const normalized: Extract<ReportSlide, { kind: 'chart' }> = {
                ...slide,
                title: fitTextToZone(slide.title, 'title'),
                subtitle: layout.fittedSubtitle,
                bullets: layout.onSlideBullets.length > 0 ? layout.onSlideBullets : undefined,
            };
            return [normalized, ...chartOverflowSlides(slide, layout.overflowBullets, locale)];
        }
        case 'bullets': {
            const fitted = fitBulletSlide({
                title: slide.title,
                lead: slide.lead,
                bullets: slide.bullets,
            });
            const contSuffix = locale === 'de' ? ' (Forts.)' : ' (cont.)';
            const normalized: Extract<ReportSlide, { kind: 'bullets' }> = {
                ...slide,
                title: fitted.title,
                lead: fitted.lead,
                bullets: fitted.bullets,
            };
            return [normalized, ...overflowBulletsSlides(normalized, fitted.overflowBullets, contSuffix)];
        }
        case 'two_column':
            return [
                {
                    ...slide,
                    title: fitTextToZone(slide.title, 'title'),
                    left: fitColumnContent(slide.left),
                    right: fitColumnContent(slide.right),
                },
            ];
        case 'metrics':
            return [
                {
                    ...slide,
                    title: fitTextToZone(slide.title, 'title'),
                    bullets: slide.bullets?.map((bullet) => fitTextToZone(bullet, 'eyebrow')),
                },
            ];
        case 'cover':
            return [
                {
                    ...slide,
                    title: fitTextToZone(slide.title, 'title'),
                    subtitle: fitTextToZone(slide.subtitle, 'eyebrow'),
                },
            ];
        default:
            return [slide];
    }
}

export function normalizePptxPlan(
    slides: ReportSlide[],
    options?: { maxSlides?: number; locale?: 'de' | 'en' }
): ReportSlide[] {
    const locale = options?.locale ?? 'de';
    const expanded = slides.flatMap((slide) => normalizeReportSlide(slide, locale));
    if (options?.maxSlides != null && expanded.length > options.maxSlides) {
        return expanded.slice(0, options.maxSlides);
    }
    return expanded;
}
