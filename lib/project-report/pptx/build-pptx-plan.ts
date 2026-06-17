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
import type { ProjectReportBundle } from '@/lib/project-report/types';
import {
    PPTX_MAX_BULLETS,
    PPTX_MAX_SLIDES,
    PPTX_MAX_TABLE_ROWS,
    type ProjectReportPptxPlan,
    type ReportSlide,
} from '@/lib/project-report/pptx/types';

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

function splitParagraphToBullets(text: string, max = PPTX_MAX_BULLETS): string[] {
    const normalized = cleanText(text);
    if (!normalized) return [];
    const byLine = normalized
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    if (byLine.length > 1) return byLine.slice(0, max);
    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [normalized];
    return sentences.filter(Boolean).slice(0, max);
}

function chunkBullets(bullets: string[], chunkSize = PPTX_MAX_BULLETS): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < bullets.length; i += chunkSize) {
        chunks.push(bullets.slice(i, i + chunkSize));
    }
    return chunks.length ? chunks : [[]];
}

function pushSlides(plan: ReportSlide[], slides: ReportSlide[]): boolean {
    for (const slide of slides) {
        if (plan.length >= PPTX_MAX_SLIDES) return false;
        plan.push(slide);
    }
    return plan.length < PPTX_MAX_SLIDES;
}

function pushBulletSlides(
    plan: ReportSlide[],
    title: string,
    bullets: string[],
    footer: string,
    lead?: string
): boolean {
    const chunks = chunkBullets(bullets);
    for (let i = 0; i < chunks.length; i += 1) {
        if (plan.length >= PPTX_MAX_SLIDES) return false;
        const suffix = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : '';
        plan.push({
            kind: 'bullets',
            layout: 'CONTENT',
            title: `${title}${suffix}`,
            bullets: chunks[i] ?? [],
            lead: i === 0 ? lead : undefined,
            footer,
        });
    }
    return plan.length < PPTX_MAX_SLIDES;
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
    pushBulletSlides(slides, labels.tableOfContents, agendaBullets, footer);

    const executive = bundle.narrative?.executiveSummary?.trim();
    if (executive) {
        pushBulletSlides(slides, labels.executiveSummary, splitParagraphToBullets(executive), footer);
    }

    const scoreItems = buildExecutiveScoreItems(bundle, labels);
    if (scoreItems.length > 0 && slides.length < PPTX_MAX_SLIDES) {
        slides.push({
            kind: 'metrics',
            layout: 'METRICS',
            title: labels.metricsOverview,
            items: scoreItems,
            footer,
        });
    }

    if (comprehensive && hasMarketSignals(bundle) && slides.length < PPTX_MAX_SLIDES) {
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
            pushBulletSlides(slides, labels.marketSignals, marketBullets, footer);
        }
    }

    if (bundle.domain && slides.length < PPTX_MAX_SLIDES) {
        const qualityBullets: string[] = [];
        if (bundle.narrative?.siteQuality?.summary) {
            qualityBullets.push(...splitParagraphToBullets(bundle.narrative.siteQuality.summary, 3));
        }
        const metrics = [
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
                tone: 'neutral' as const,
            },
        ];
        slides.push({
            kind: 'metrics',
            layout: 'METRICS',
            title: labels.siteQuality,
            items: metrics,
            bullets: qualityBullets.slice(0, 3),
            footer,
        });

        const issues = (bundle.domain.systemicIssues ?? []).slice(0, 5).map((issue) => issue.title);
        if (issues.length) {
            pushBulletSlides(slides, labels.systemicIssues, issues, footer);
        }
    }

    if (bundle.rankings && slides.length < PPTX_MAX_SLIDES) {
        const leftBullets: string[] = [];
        if (bundle.narrative?.seoRankings?.summary) {
            leftBullets.push(...splitParagraphToBullets(bundle.narrative.seoRankings.summary, 4));
        }
        const keywords = (bundle.rankings.topKeywords ?? []).slice(0, PPTX_MAX_TABLE_ROWS);
        const rightBullets = keywords.map((kw) => `${kw.keyword}: #${kw.position ?? '–'}`);
        slides.push({
            kind: 'two_column',
            layout: 'TWO_COLUMN',
            title: labels.seoRankings,
            left: { kind: 'bullets', bullets: leftBullets.length ? leftBullets : [labels.noData] },
            right: {
                kind: 'bullets',
                bullets: rightBullets.length ? rightBullets : [labels.noData],
            },
            footer,
        });
    }

    if (bundle.geo && slides.length < PPTX_MAX_SLIDES) {
        const geoBullets = bundle.narrative?.geo?.summary
            ? splitParagraphToBullets(bundle.narrative.geo.summary, 3)
            : [];
        slides.push({
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
        });
    }

    if (comprehensive && hasAudience(bundle) && slides.length < PPTX_MAX_SLIDES) {
        slides.push({
            kind: 'section',
            layout: 'SECTION',
            title: labels.audienceReality,
            footer,
        });
        for (const persona of bundle.audience!.personas.slice(0, 4)) {
            if (slides.length >= PPTX_MAX_SLIDES) break;
            slides.push({
                kind: 'two_column',
                layout: 'TWO_COLUMN',
                title: persona.personaName,
                left: {
                    kind: 'text',
                    text: cleanText(persona.headline || persona.personaPerspective || ''),
                },
                right: {
                    kind: 'bullets',
                    bullets: persona.pillars
                        .slice(0, PPTX_MAX_BULLETS)
                        .map((p) => `${p.pillar}: ${p.score ?? '–'} (${p.level})`),
                },
                footer,
            });
        }
    }

    const findings = filterFindingsForPdf(
        bundle.narrative?.findings ?? [],
        bundle.narrative?.executiveSummary,
        4
    );
    if (findings.length) {
        const findingBullets = findings.map((f) => `${f.title}: ${cleanText(f.description)}`);
        pushBulletSlides(slides, labels.keyFindings, findingBullets, footer);
    }

    const recommendations = filterRecommendationsForPdf(
        bundle.narrative?.recommendations ?? [],
        findings,
        6
    );
    if (recommendations.length) {
        const recBullets = recommendations.map((r) => `${r.title}: ${cleanText(r.description)}`);
        pushBulletSlides(slides, labels.actionPlan, recBullets, footer);
    }

    if (slides.length < PPTX_MAX_SLIDES) {
        const closingBullets =
            recommendations.length > 0
                ? recommendations.slice(0, 3).map((r) => r.title)
                : [labels.reportTitle, bundle.project.domain].filter(Boolean);
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
        slides: slides.slice(0, PPTX_MAX_SLIDES),
    };
}
