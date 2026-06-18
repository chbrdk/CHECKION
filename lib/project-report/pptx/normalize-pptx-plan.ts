/**
 * Normalize slide plans: measure text, split overflow to extra slides — never truncate.
 */
import {
    computeChartLayout,
    layoutBulletSlide,
    layoutColumnContent,
    overflowBulletsSlides,
    splitTextToPages,
    titleOverflowSlides,
} from '@/lib/project-report/pptx/pptx-content-budget';
import { packBulletsByLineBudget } from '@/lib/project-report/pptx/pptx-text-layout';
import type { ReportSlide, ReportSlideContent } from '@/lib/project-report/pptx/types';

function chartOverflowSlides(
    slide: Extract<ReportSlide, { kind: 'chart' }>,
    overflowBullets: string[],
    locale: 'de' | 'en',
    lead?: string
): ReportSlide[] {
    const suffix = locale === 'de' ? ' — Kontext' : ' — context';
    const slides: ReportSlide[] = [];

    if (lead?.trim()) {
        slides.push({
            kind: 'bullets',
            layout: 'CONTENT',
            title: slide.title,
            lead,
            bullets: [],
            footer: slide.footer,
        });
    }

    if (overflowBullets.length > 0) {
        const base: Extract<ReportSlide, { kind: 'bullets' }> = {
            kind: 'bullets',
            layout: 'CONTENT',
            title: slide.title,
            bullets: [],
            footer: slide.footer,
        };
        slides.push(...overflowBulletsSlides(base, overflowBullets, suffix));
    }

    return slides;
}

function columnOverflowSlides(
    slide: Extract<ReportSlide, { kind: 'two_column' }>,
    leftOverflow: ReportSlideContent | null,
    rightOverflow: ReportSlideContent | null,
    locale: 'de' | 'en'
): ReportSlide[] {
    if (!leftOverflow && !rightOverflow) return [];
    const suffix = locale === 'de' ? ' (Forts.)' : ' (cont.)';
    return [
        {
            kind: 'two_column',
            layout: 'TWO_COLUMN',
            title: `${slide.title}${suffix}`,
            left: leftOverflow ?? { kind: 'text', text: '' },
            right: rightOverflow ?? { kind: 'text', text: '' },
            footer: slide.footer,
        },
    ];
}

export function normalizeReportSlide(slide: ReportSlide, locale: 'de' | 'en' = 'de'): ReportSlide[] {
    switch (slide.kind) {
        case 'chart': {
            const layout = computeChartLayout({
                subtitle: slide.subtitle,
                bullets: slide.bullets,
                chartType: slide.chartType,
            });
            const titlePages = splitTextToPages(slide.title, 'title');
            const normalized: Extract<ReportSlide, { kind: 'chart' }> = {
                ...slide,
                title: titlePages[0] ?? slide.title,
                subtitle: layout.fittedSubtitle,
                bullets: layout.onSlideBullets.length > 0 ? layout.onSlideBullets : undefined,
            };

            const titleSlides = titleOverflowSlides(
                slide.title,
                titlePages.slice(1),
                slide.footer,
                locale === 'de' ? ' (Titel)' : ' (title)'
            );

            const contextSlides = chartOverflowSlides(
                slide,
                layout.overflowBullets,
                locale,
                layout.overflowSubtitle
            );

            return [normalized, ...titleSlides, ...contextSlides];
        }
        case 'bullets': {
            const laidOut = layoutBulletSlide({
                title: slide.title,
                lead: slide.lead,
                bullets: slide.bullets,
            });
            const contSuffix = locale === 'de' ? ' (Forts.)' : ' (cont.)';
            const normalized: Extract<ReportSlide, { kind: 'bullets' }> = {
                ...slide,
                title: laidOut.title,
                lead: laidOut.lead,
                bullets: laidOut.bullets,
            };

            const titleSlides = titleOverflowSlides(
                slide.title,
                laidOut.titleOverflowPages,
                slide.footer,
                locale === 'de' ? ' (Titel)' : ' (title)'
            );

            const leadSlides: ReportSlide[] = laidOut.leadOverflow
                ? [
                      {
                          kind: 'bullets',
                          layout: 'CONTENT',
                          title: slide.title,
                          lead: laidOut.leadOverflow,
                          bullets: [],
                          footer: slide.footer,
                      },
                  ]
                : [];

            return [
                normalized,
                ...titleSlides,
                ...leadSlides,
                ...overflowBulletsSlides(normalized, laidOut.overflowBullets, contSuffix),
            ];
        }
        case 'two_column': {
            const left = layoutColumnContent(slide.left);
            const right = layoutColumnContent(slide.right);
            const titlePages = splitTextToPages(slide.title, 'title');
            return [
                {
                    ...slide,
                    title: titlePages[0] ?? slide.title,
                    left: left.content,
                    right: right.content,
                },
                ...titleOverflowSlides(
                    slide.title,
                    titlePages.slice(1),
                    slide.footer,
                    locale === 'de' ? ' (Titel)' : ' (title)'
                ),
                ...columnOverflowSlides(slide, left.overflow, right.overflow, locale),
            ];
        }
        case 'metrics': {
            const titlePages = splitTextToPages(slide.title, 'title');
            const bullets = slide.bullets ?? [];
            const partitionedBullets = bullets.flatMap((bullet) => {
                const parts = splitTextToPages(bullet, 'eyebrow');
                return parts.length > 0 ? parts : [bullet];
            });
            const { packed, overflow } = packBulletsByLineBudget(partitionedBullets, 'eyebrow');

            return [
                {
                    ...slide,
                    title: titlePages[0] ?? slide.title,
                    bullets: packed,
                },
                ...titleOverflowSlides(
                    slide.title,
                    titlePages.slice(1),
                    slide.footer ?? '',
                    locale === 'de' ? ' (Titel)' : ' (title)'
                ),
                ...(overflow.length > 0
                    ? overflowBulletsSlides(
                          {
                              kind: 'bullets',
                              layout: 'CONTENT',
                              title: slide.title,
                              bullets: [],
                              footer: slide.footer ?? '',
                          },
                          overflow,
                          locale === 'de' ? ' (Metriken)' : ' (metrics)'
                      )
                    : []),
            ];
        }
        case 'cover': {
            const titlePages = splitTextToPages(slide.title, 'title');
            const subtitleParts = splitTextToPages(slide.subtitle, 'eyebrow');
            return [
                {
                    ...slide,
                    title: titlePages[0] ?? slide.title,
                    subtitle: subtitleParts[0] ?? slide.subtitle,
                },
                ...titleOverflowSlides(
                    slide.title,
                    titlePages.slice(1),
                    slide.footer ?? '',
                    locale === 'de' ? ' (Titel)' : ' (title)'
                ),
                ...(subtitleParts.length > 1
                    ? [
                          {
                              kind: 'bullets' as const,
                              layout: 'CONTENT' as const,
                              title: titlePages[0] ?? slide.title,
                              lead: subtitleParts.slice(1).join(' '),
                              bullets: [],
                              footer: slide.footer ?? '',
                          },
                      ]
                    : []),
            ];
        }
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
