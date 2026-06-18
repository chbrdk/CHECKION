/**
 * Build a testable slide plan from ProjectReportBundle (no PPTX binary).
 */
import {
    assignOutlineNumbers,
    buildProjectReportOutline,
    formatNumberedTitle,
} from '@/lib/paths/pdf-chapter-numbering';
import { buildEchonMarketPdfContent } from '@/lib/project-report/pdf-echon-display';
import { stripPdfEvidenceMarkers } from '@/lib/project-report/pdf-competitive-display';
import { filterFindingsForPdf } from '@/lib/project-report/pdf-findings-display';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { filterRecommendationsForPdf } from '@/lib/project-report/pdf-recommendations-display';
import { getSiteQualitySectionAnalysis } from '@/lib/project-report/site-quality-interpretations';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import {
    buildAudienceIntroBullets,
    buildPersonaChartBullets,
    buildPersonaChartSubtitle,
    buildPersonaDetailBullets,
    buildPersonasOverviewLead,
    buildTargetGroupBullets,
    personaDetailSlideTitle,
    selectPersonasForPptx,
} from '@/lib/project-report/pptx/build-pptx-audience';
import {
    buildPersonaRadarSlide,
    chartSlideFromVisual,
    findVisual,
} from '@/lib/project-report/pptx/build-pptx-charts';
import {
    getPptxMaxSlides,
    PPTX_MAX_BULLETS,
    PPTX_MAX_TABLE_ROWS,
    type ProjectReportPptxPlan,
    type ReportSlide,
} from '@/lib/project-report/pptx/types';
import { normalizePptxPlan } from '@/lib/project-report/pptx/normalize-pptx-plan';

function isComprehensive(bundle: ProjectReportBundle): boolean {
    return bundle.variant === 'comprehensive' || bundle.variant === 'full';
}

function hasMarketSignals(bundle: ProjectReportBundle): boolean {
    return buildEchonMarketPdfContent(bundle.marketContext, {
        executiveSummaryNarrative: bundle.narrative?.executiveSummary,
    }).show;
}

function hasAudience(bundle: ProjectReportBundle): boolean {
    return bundle.audience?.available === true && (bundle.audience.personas.length ?? 0) > 0;
}

function formatReportDate(iso: string, locale: 'de' | 'en'): string {
    return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function buildFooter(bundle: ProjectReportBundle, labels: ReturnType<typeof getProjectReportPdfLabels>): string {
    const date = formatReportDate(bundle.generatedAt, bundle.locale);
    return `${bundle.project.name} · ${date} · ${labels.footerTitle}`;
}

function cleanText(text: string): string {
    return stripPdfEvidenceMarkers(text).replace(/\s+/g, ' ').trim();
}

function splitParagraphToBullets(text: string): string[] {
    const normalized = cleanText(text);
    if (!normalized) return [];
    const byLine = normalized
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    if (byLine.length > 1) return byLine;
    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [normalized];
    return sentences.filter(Boolean);
}

function chunkBullets(bullets: string[], chunkSize = PPTX_MAX_BULLETS): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < bullets.length; i += chunkSize) {
        chunks.push(bullets.slice(i, i + chunkSize));
    }
    return chunks.length ? chunks : [[]];
}

function hasRoom(slides: ReportSlide[], maxSlides: number): boolean {
    return slides.length < maxSlides;
}

function pushSlide(slides: ReportSlide[], slide: ReportSlide, maxSlides: number): boolean {
    if (!hasRoom(slides, maxSlides)) return false;
    slides.push(slide);
    return true;
}

function pushBulletSlides(
    slides: ReportSlide[],
    title: string,
    bullets: string[],
    footer: string,
    maxSlides: number,
    lead?: string
): boolean {
    const chunks = chunkBullets(bullets);
    for (let i = 0; i < chunks.length; i += 1) {
        if (!hasRoom(slides, maxSlides)) return false;
        const suffix = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
        slides.push({
            kind: 'bullets',
            layout: 'CONTENT',
            title: `${title}${suffix}`,
            bullets: chunks[i] ?? [],
            lead: i === 0 ? lead : undefined,
            footer,
        });
    }
    return hasRoom(slides, maxSlides);
}

function pushChartFromVisual(
    slides: ReportSlide[],
    bundle: ProjectReportBundle,
    labels: ReturnType<typeof getProjectReportPdfLabels>,
    footer: string,
    kind: Parameters<typeof findVisual>[1],
    maxSlides: number,
    bullets?: string[]
): boolean {
    const visual = findVisual(bundle.visuals, kind);
    if (!visual) return false;
    const slide = chartSlideFromVisual(visual, labels, footer, bundle.locale);
    if (!slide) return false;
    if (bullets?.length) slide.bullets = bullets;
    return pushSlide(slides, slide, maxSlides);
}

function scoreTone(value: number | null | undefined): 'good' | 'warn' | 'bad' | 'neutral' {
    if (value == null || Number.isNaN(value)) return 'neutral';
    if (value >= 75) return 'good';
    if (value >= 50) return 'warn';
    return 'bad';
}

function buildExecutiveScoreItems(
    bundle: ProjectReportBundle,
    labels: ReturnType<typeof getProjectReportPdfLabels>
): Array<{ label: string; value: string; tone?: 'good' | 'warn' | 'bad' | 'neutral' }> {
    const scoreCards = bundle.visuals.find((v) => v.kind === 'scoreCards');
    if (scoreCards?.kind === 'scoreCards') {
        return scoreCards.items.slice(0, 4).map((item) => ({
            label: item.label,
            value: String(item.value),
            tone: scoreTone(typeof item.value === 'number' ? item.value : null),
        }));
    }

    const items: Array<{ label: string; value: string; tone?: 'good' | 'warn' | 'bad' | 'neutral' }> = [];
    if (bundle.domain?.score != null) {
        items.push({
            label: labels.domainScore,
            value: String(bundle.domain.score),
            tone: scoreTone(bundle.domain.score),
        });
    }
    if (bundle.domain?.seoOnPageScore != null) {
        items.push({
            label: labels.seoOnPageLabel,
            value: String(bundle.domain.seoOnPageScore),
            tone: scoreTone(bundle.domain.seoOnPageScore),
        });
    }
    if (bundle.geo?.score != null) {
        items.push({
            label: 'GEO',
            value: String(bundle.geo.score),
            tone: scoreTone(bundle.geo.score),
        });
    }
    if (bundle.rankings?.score != null) {
        items.push({
            label: labels.rankingScore,
            value: String(bundle.rankings.score),
            tone: scoreTone(bundle.rankings.score),
        });
    }
    return items.slice(0, 4);
}

export function buildProjectReportPptxPlan(bundle: ProjectReportBundle): ProjectReportPptxPlan {
    const labels = getProjectReportPdfLabels(bundle.locale);
    const footer = buildFooter(bundle, labels);
    const comprehensive = isComprehensive(bundle);
    const maxSlides = getPptxMaxSlides(bundle.variant);
    const slides: ReportSlide[] = [];
    const variantLabel =
        bundle.variant === 'comprehensive' || bundle.variant === 'full'
            ? labels.comprehensiveSubtitle
            : labels.reportSubtitle;

    slides.push({
        kind: 'cover',
        layout: 'TITLE',
        title: bundle.project.name,
        subtitle: labels.reportTitle,
        date: formatReportDate(bundle.generatedAt, bundle.locale),
        variant: variantLabel,
        footer,
    });

    const outline = buildProjectReportOutline(bundle, labels);
    const numbers = assignOutlineNumbers(outline);
    const agendaBullets = outline
        .filter((entry) => entry.level === 0)
        .map((entry) => formatNumberedTitle(numbers.get(entry.id), entry.title));
    pushBulletSlides(slides, labels.tableOfContents, agendaBullets, footer, maxSlides);

    const executive = bundle.narrative?.executiveSummary?.trim();
    if (executive) {
        pushBulletSlides(slides, labels.executiveSummary, splitParagraphToBullets(executive), footer, maxSlides);
    }

    const pushedScoreChart = pushChartFromVisual(
        slides,
        bundle,
        labels,
        footer,
        'scoreCards',
        maxSlides
    );
    if (!pushedScoreChart) {
        const scoreItems = buildExecutiveScoreItems(bundle, labels);
        if (scoreItems.length > 0) {
            pushSlide(
                slides,
                {
                    kind: 'metrics',
                    layout: 'METRICS',
                    title: labels.metricsOverview,
                    items: scoreItems,
                    footer,
                },
                maxSlides
            );
        }
    }

    pushChartFromVisual(slides, bundle, labels, footer, 'competitorBarChart', maxSlides);

    if (comprehensive && hasMarketSignals(bundle)) {
        const market = buildEchonMarketPdfContent(bundle.marketContext, {
            executiveSummaryNarrative: bundle.narrative?.executiveSummary,
        });
        const marketBullets = [
            market.executiveSummary,
            market.implications,
            ...market.keyFindings,
            ...market.watchlist,
        ]
            .filter((item): item is string => Boolean(item?.trim()))
            .map(cleanText)
            .slice(0, PPTX_MAX_BULLETS);
        if (marketBullets.length) {
            pushBulletSlides(slides, labels.marketSignals, marketBullets, footer, maxSlides);
        }
    }

    if (bundle.domain) {
        const qualityBullets: string[] = [];
        const siteQuality = getSiteQualitySectionAnalysis(bundle);
        if (siteQuality?.summary) {
            qualityBullets.push(...splitParagraphToBullets(siteQuality.summary));
        }
        pushSlide(
            slides,
            {
                kind: 'metrics',
                layout: 'METRICS',
                title: labels.siteQuality,
                items: [
                    {
                        label: labels.domainScore,
                        value: bundle.domain.score != null ? String(bundle.domain.score) : '–',
                        tone: scoreTone(bundle.domain.score),
                    },
                    {
                        label: labels.wcagErrors,
                        value: String(bundle.domain.issueStats?.errors ?? '–'),
                        tone: scoreTone(bundle.domain.wcagScore),
                    },
                    {
                        label: labels.performance,
                        value:
                            bundle.domain.performance?.avgLcp != null
                                ? `${bundle.domain.performance.avgLcp.toFixed(1)}s LCP`
                                : '–',
                        tone: 'neutral',
                    },
                ],
                bullets: qualityBullets.slice(0, 3),
                footer,
            },
            maxSlides
        );

        if (comprehensive) {
            pushChartFromVisual(slides, bundle, labels, footer, 'pageTopics', maxSlides);
        }

        const issues = (bundle.domain.systemicIssues ?? []).slice(0, 5).map((issue) => issue.title);
        if (issues.length) {
            pushBulletSlides(slides, labels.systemicIssues, issues, footer, maxSlides);
        }
    }

    if (bundle.rankings) {
        const seoSection =
            bundle.deep?.sections.seoRankings ?? bundle.narrative?.sections?.seoRankings ?? null;
        const seoBullets = seoSection?.summary
            ? splitParagraphToBullets(seoSection.summary)
            : [];

        const pushedKeywordChart = pushChartFromVisual(
            slides,
            bundle,
            labels,
            footer,
            'rankingKeywords',
            maxSlides,
            seoBullets
        );

        if (!pushedKeywordChart) {
            const keywords = (bundle.rankings.topKeywords ?? []).slice(0, PPTX_MAX_TABLE_ROWS);
            const rightBullets = keywords.map((kw) => `${kw.keyword}: #${kw.position ?? '–'}`);
            pushSlide(
                slides,
                {
                    kind: 'two_column',
                    layout: 'TWO_COLUMN',
                    title: labels.seoRankings,
                    left: {
                        kind: 'bullets',
                        bullets: seoBullets.length ? seoBullets : [labels.noData],
                    },
                    right: {
                        kind: 'bullets',
                        bullets: rightBullets.length ? rightBullets : [labels.noData],
                    },
                    footer,
                },
                maxSlides
            );
        }

        pushChartFromVisual(slides, bundle, labels, footer, 'competitorRankingScores', maxSlides);

        if (comprehensive) {
            pushChartFromVisual(slides, bundle, labels, footer, 'rankTrend', maxSlides);
            pushChartFromVisual(slides, bundle, labels, footer, 'competitorSeoBarChart', maxSlides);
            pushChartFromVisual(slides, bundle, labels, footer, 'competitorTopicOverlap', maxSlides);
        }
    }

    if (bundle.geo) {
        const geoSection = bundle.deep?.sections.geo ?? bundle.narrative?.sections?.geo ?? null;
        const geoBullets = geoSection?.summary
            ? splitParagraphToBullets(geoSection.summary)
            : [];
        pushSlide(
            slides,
            {
                kind: 'metrics',
                layout: 'METRICS',
                title: labels.geoEeat,
                items: [
                    {
                        label: 'GEO',
                        value: bundle.geo.score != null ? String(bundle.geo.score) : '–',
                        tone: scoreTone(bundle.geo.score),
                    },
                    {
                        label: labels.geoPageAnalysis,
                        value: String(bundle.geo.competitiveDomains?.length ?? '–'),
                        tone: 'neutral',
                    },
                    {
                        label: labels.recommendations,
                        value: String(bundle.geo.recommendations?.length ?? '–'),
                        tone: 'neutral',
                    },
                ],
                bullets: geoBullets,
                footer,
            },
            maxSlides
        );

        pushChartFromVisual(slides, bundle, labels, footer, 'geoCompetitive', maxSlides);
        if (comprehensive) {
            pushChartFromVisual(slides, bundle, labels, footer, 'geoModelVisibility', maxSlides);
        }
    }

    if (comprehensive && hasAudience(bundle)) {
        const audience = bundle.audience!;
        const selectedPersonas = selectPersonasForPptx(audience.personas);

        pushSlide(
            slides,
            {
                kind: 'section',
                layout: 'SECTION',
                title: labels.audienceReality,
                footer,
            },
            maxSlides
        );

        pushBulletSlides(
            slides,
            labels.audienceReality,
            buildAudienceIntroBullets(audience, labels),
            footer,
            maxSlides,
            labels.chapterIntros.audience
        );

        const targetGroupBullets = buildTargetGroupBullets(audience);
        if (targetGroupBullets.length > 0) {
            pushBulletSlides(slides, labels.audienceTargetGroups, targetGroupBullets, footer, maxSlides);
        }

        if (selectedPersonas.length > 0) {
            pushBulletSlides(
                slides,
                labels.audiencePersonas,
                [],
                footer,
                maxSlides,
                buildPersonasOverviewLead(audience, labels, bundle.locale, selectedPersonas.length)
            );
        }

        for (const persona of selectedPersonas) {
            if (!hasRoom(slides, maxSlides)) break;

            const radar = buildPersonaRadarSlide(
                persona.personaName,
                persona.pillars,
                footer,
                bundle.locale,
                {
                    subtitle: buildPersonaChartSubtitle(persona, labels),
                    bullets: buildPersonaChartBullets(persona, labels),
                }
            );

            if (radar && pushSlide(slides, radar, maxSlides)) {
                const detailBullets = buildPersonaDetailBullets(persona, labels, bundle.locale);
                if (detailBullets.length > 0) {
                    pushBulletSlides(
                        slides,
                        personaDetailSlideTitle(persona.personaName, labels),
                        detailBullets,
                        footer,
                        maxSlides
                    );
                }
                continue;
            }

            pushSlide(
                slides,
                {
                    kind: 'two_column',
                    layout: 'TWO_COLUMN',
                    title: persona.personaName,
                    left: {
                        kind: 'text',
                        text: cleanText(
                            [
                                persona.targetGroupName,
                                persona.headline,
                                persona.personaPerspective,
                            ]
                                .filter(Boolean)
                                .join(' · ')
                        ),
                    },
                    right: {
                        kind: 'bullets',
                        bullets: buildPersonaChartBullets(persona, labels).concat(
                            buildPersonaDetailBullets(persona, labels, bundle.locale)
                        ).slice(0, PPTX_MAX_BULLETS),
                    },
                    footer,
                },
                maxSlides
            );
        }
    }

    const findings = filterFindingsForPdf(
        bundle.narrative?.findings ?? [],
        bundle.narrative?.executiveSummary,
        4
    );
    if (findings.length) {
        const findingBullets = findings.map((f) => `${f.title}: ${cleanText(f.description)}`);
        pushBulletSlides(slides, labels.keyFindings, findingBullets, footer, maxSlides);
    }

    const recommendations = filterRecommendationsForPdf(
        bundle.narrative?.recommendations ?? [],
        findings,
        6
    );
    if (recommendations.length) {
        const recBullets = recommendations.map((r) => `${r.title}: ${cleanText(r.description)}`);
        pushBulletSlides(slides, labels.actionPlan, recBullets, footer, maxSlides);
    }

    if (hasRoom(slides, maxSlides)) {
        const closingBullets: string[] =
            recommendations.length > 0
                ? recommendations.slice(0, 3).map((r) => r.title)
                : [labels.reportTitle, bundle.project.domain].filter(
                      (value): value is string => Boolean(value)
                  );
        slides.push({
            kind: 'closing',
            layout: 'CLOSING',
            title: labels.recommendations,
            bullets: closingBullets,
            footer,
        });
    }

    return {
        locale: bundle.locale,
        variant: bundle.variant,
        projectName: bundle.project.name,
        slides: normalizePptxPlan(slides, { maxSlides, locale: bundle.locale }),
    };
}
