'use client';

import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import {
    MsqdxLogoPdf,
    PdfSectionHeader,
    RiskAmpelPills,
} from '@/components/pdf/shared/PdfPrimitives';
import {
    PdfCoverPage,
    PdfContentPage,
    PdfStatGrid,
    PdfLeadText,
    applyReportFooters,
    isChapterIntroPage,
    appendChapterSpread,
    contentSideForIndex,
    PDF_DOCUMENT_PAGE_LAYOUT,
} from '@/components/pdf/shared/PdfLayout';
import { PdfScoreCardsFromSpec, PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import { buildDeepReportPages } from '@/components/pdf/ProjectReportDeepSections';
import { buildAudienceReportPages } from '@/components/pdf/ProjectReportAudienceSections';
import type { VisualSpec } from '@/lib/project-report/chart-specs';
import type { PdfChapterKey } from '@/components/pdf/shared/pdf-styles';

interface ProjectReportDocumentProps {
    bundle: ProjectReportBundle;
}

function formatDate(iso: string, locale: 'de' | 'en'): string {
    return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US');
}

function pushContent(
    pages: React.ReactElement[],
    key: string,
    children: React.ReactNode
): React.ReactElement[] {
    const side = contentSideForIndex(pages.length);
    return [
        ...pages,
        <PdfContentPage key={key} side={side}>
            {children}
        </PdfContentPage>,
    ];
}

export function ProjectReportDocument({ bundle }: ProjectReportDocumentProps) {
    const labels = getProjectReportPdfLabels(bundle.locale);
    const scoreCards = bundle.visuals.find((v) => v.kind === 'scoreCards');
    const competitorChart = bundle.visuals.find((v) => v.kind === 'competitorBarChart');
    const rankingChart = bundle.visuals.find((v) => v.kind === 'rankingKeywords');
    const geoChart = bundle.visuals.find((v) => v.kind === 'geoCompetitive');
    const topicsChart = bundle.visuals.find((v) => v.kind === 'pageTopics');
    const rankTrend = bundle.visuals.find((v) => v.kind === 'rankTrend');
    const geoQuestionTrend = bundle.visuals.find((v) => v.kind === 'geoQuestionTrend');
    const geoModelVisibility = bundle.visuals.find((v) => v.kind === 'geoModelVisibility');
    const geoQuestionTrendSeries = bundle.visuals.find((v) => v.kind === 'geoQuestionTrendSeries');
    const competitorRankingScores = bundle.visuals.find((v) => v.kind === 'competitorRankingScores');
    const competitorSeoBarChart = bundle.visuals.find((v) => v.kind === 'competitorSeoBarChart');
    const competitorTopicOverlap = bundle.visuals.find((v) => v.kind === 'competitorTopicOverlap');
    const narrative = bundle.narrative;
    const isComprehensive = bundle.variant === 'comprehensive' || bundle.variant === 'full';

    let pages: React.ReactElement[] = [];

    const chapter = (props: {
        chapterNumber: string;
        title: string;
        subtitle?: string;
        chapter: PdfChapterKey;
    }) => {
        pages = appendChapterSpread(pages, { ...props, chapterPrefix: labels.chapterPrefix });
    };

    // Deckblatt
    pages.push(
        <PdfCoverPage key="cover">
            <View style={pdfStyles.coverLogoWrap}>
                <Text style={pdfStyles.coverSubtitle}>CHECKION</Text>
            </View>
            <Text style={pdfStyles.coverSubtitle}>
                {isComprehensive ? labels.comprehensiveSubtitle : labels.reportSubtitle}
            </Text>
            <Text style={pdfStyles.coverTitle}>{labels.reportTitle}</Text>
            <View style={pdfStyles.coverUrlBox}>
                <Text style={pdfStyles.coverUrl}>{bundle.project.name}</Text>
            </View>
            <View style={pdfStyles.coverMeta}>
                {bundle.project.domain ? (
                    <Text style={pdfStyles.coverMetaItem}>
                        {labels.domain}: {bundle.project.domain}
                    </Text>
                ) : null}
                {bundle.project.industry ? (
                    <Text style={pdfStyles.coverMetaItem}>
                        {labels.industry}: {bundle.project.industry}
                    </Text>
                ) : null}
                <Text style={pdfStyles.coverMetaItem}>
                    {labels.date}: {formatDate(bundle.generatedAt, bundle.locale)}
                </Text>
            </View>
            <PdfScoreCardsFromSpec spec={scoreCards?.kind === 'scoreCards' ? scoreCards : undefined} />
            {bundle.project.valueProposition ? (
                <Text style={[pdfStyles.leadText, { marginTop: 16 }]}>{bundle.project.valueProposition}</Text>
            ) : null}
            <View style={{ marginTop: 24, alignItems: 'flex-end' }}>
                <MsqdxLogoPdf width={100} height={24} />
            </View>
        </PdfCoverPage>
    );

    // 01 Executive
    chapter({
        chapterNumber: '01',
        title: labels.executiveSummary,
        subtitle: labels.chapterIntros.executive,
        chapter: 'summary',
    });
    pages = pushContent(
        pages,
        'executive',
        <>
            <PdfSectionHeader title={labels.executiveSummary} chapter="summary" />
            {narrative?.riskAmpel ? (
                <RiskAmpelPills ampel={narrative.riskAmpel} labels={labels.riskAmpel} />
            ) : null}
            {narrative?.executiveSummary ? (
                <PdfLeadText>{narrative.executiveSummary}</PdfLeadText>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            {narrative?.competitiveLandscape ? (
                <View style={pdfStyles.contentPanel}>
                    <PdfSectionHeader title={labels.competitorComparison} chapter="competitors" />
                    <PdfLeadText>{narrative.competitiveLandscape}</PdfLeadText>
                </View>
            ) : null}
            {bundle.domain?.llmSummary?.summary ? (
                <View style={pdfStyles.contentPanel}>
                    <PdfSectionHeader title="Domain Summary" chapter="ux" />
                    <PdfLeadText>{bundle.domain.llmSummary.summary}</PdfLeadText>
                </View>
            ) : null}
        </>
    );

    // 02 Site Quality
    chapter({
        chapterNumber: '02',
        title: labels.siteQuality,
        subtitle: labels.chapterIntros.siteQuality,
        chapter: 'issues',
    });
    pages = pushContent(
        pages,
        'quality',
        <>
            <PdfSectionHeader title={labels.siteQuality} chapter="issues" />
            {bundle.domain ? (
                <>
                    <PdfStatGrid
                        items={[
                            { label: labels.domainScore, value: `${bundle.domain.score}/100`, accent: '#B91C1C' },
                            { label: labels.pages, value: String(bundle.domain.totalPageCount) },
                            {
                                label: labels.wcagErrors,
                                value: `${bundle.domain.issueStats.errors} / ${bundle.domain.issueStats.warnings}`,
                            },
                            ...(bundle.domain.eco?.avgCo2 != null
                                ? [{ label: labels.eco, value: `${bundle.domain.eco.avgCo2}g` }]
                                : []),
                        ]}
                    />
                    {bundle.domain.performance ? (
                        <View style={pdfStyles.contentPanel}>
                            <Text style={pdfStyles.subsectionTitle}>{labels.performance}</Text>
                            <Text style={pdfStyles.bodyText}>
                                TTFB {bundle.domain.performance.avgTtfb ?? '–'} · FCP{' '}
                                {bundle.domain.performance.avgFcp ?? '–'} · LCP{' '}
                                {bundle.domain.performance.avgLcp ?? '–'}
                            </Text>
                        </View>
                    ) : null}
                    {bundle.domain.systemicIssues.length > 0 ? (
                        <>
                            <PdfSectionHeader title={labels.systemicIssues} chapter="issues" />
                            {bundle.domain.systemicIssues.map((issue) => (
                                <View key={issue.issueId} style={pdfStyles.recommendationRow}>
                                    <Text style={pdfStyles.recommendationTitle}>{issue.title}</Text>
                                    <Text style={pdfStyles.recommendationDesc}>{issue.count} pages affected</Text>
                                </View>
                            ))}
                        </>
                    ) : null}
                </>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
        </>
    );

    // 03 SEO
    chapter({
        chapterNumber: '03',
        title: labels.seoRankings,
        subtitle: labels.chapterIntros.seo,
        chapter: 'seo',
    });
    pages = pushContent(
        pages,
        'seo',
        <>
            <PdfSectionHeader title={labels.seoRankings} chapter="seo" />
            {bundle.domain ? (
                <PdfStatGrid
                    items={[
                        {
                            label: 'SEO On-Page',
                            value: `${bundle.domain.seoOnPageScore}/100`,
                            accent: '#047857',
                        },
                        { label: 'Label', value: bundle.domain.seoOnPageLabel },
                    ]}
                />
            ) : null}
            {bundle.rankings ? (
                <>
                    <PdfStatGrid
                        items={[
                            {
                                label: 'Ranking Score',
                                value: bundle.rankings.score != null ? `${bundle.rankings.score}/100` : '–',
                            },
                            {
                                label: labels.keywords,
                                value: String(bundle.rankings.keywordCount),
                            },
                        ]}
                    />
                    <PdfSectionHeader title={labels.keywords} chapter="seo" />
                    {rankingChart ? <PdfVisualSpec spec={rankingChart} /> : null}
                </>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            {rankTrend ? (
                <>
                    <PdfSectionHeader title="Rank Trends" chapter="seo" />
                    <PdfVisualSpec spec={rankTrend} />
                </>
            ) : null}
        </>
    );

    // 04 GEO
    chapter({
        chapterNumber: '04',
        title: labels.geoEeat,
        subtitle: labels.chapterIntros.geo,
        chapter: 'geo',
    });
    pages = pushContent(
        pages,
        'geo',
        <>
            <PdfSectionHeader title={labels.geoEeat} chapter="geo" />
            {bundle.geo ? (
                <>
                    <PdfStatGrid
                        items={[
                            {
                                label: 'GEO Score',
                                value: bundle.geo.score != null ? `${bundle.geo.score}/100` : '–',
                                accent: '#0891B2',
                            },
                            ...(bundle.deep?.geoDeep
                                ? [
                                      {
                                          label: 'LLM models',
                                          value: String(bundle.deep.geoDeep.summary.modelCount),
                                      },
                                      {
                                          label: labels.geoQuestionAnalysis,
                                          value: String(bundle.deep.geoDeep.summary.questionCount),
                                      },
                                      {
                                          label: labels.geoOnPageEeat,
                                          value: String(bundle.deep.geoDeep.summary.pageCount),
                                      },
                                  ]
                                : []),
                        ]}
                    />
                    {narrative?.sections?.geo ? (
                        <View style={pdfStyles.contentPanel}>
                            <PdfSectionHeader title={labels.geoAgentAnalysis} chapter="geo" />
                            <Text style={[pdfStyles.subsectionTitle, { marginBottom: 6 }]}>
                                {narrative.sections.geo.title}
                            </Text>
                            <PdfLeadText>{narrative.sections.geo.summary}</PdfLeadText>
                            {narrative.sections.geo.keyFindings.slice(0, 6).map((f, i) => (
                                <View key={i} style={pdfStyles.bulletItem}>
                                    <View style={pdfStyles.bulletDot} />
                                    <Text style={pdfStyles.bodyText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                    {geoModelVisibility ? <PdfVisualSpec spec={geoModelVisibility} /> : null}
                    {geoChart ? <PdfVisualSpec spec={geoChart} /> : null}
                    {bundle.deep?.geoDeep?.deterministicInsights.length ? (
                        <>
                            <PdfSectionHeader title={labels.geoInsights} chapter="geo" />
                            {bundle.deep.geoDeep.deterministicInsights.slice(0, 5).map((ins) => (
                                <View key={ins.id} style={pdfStyles.recommendationRow}>
                                    <Text style={pdfStyles.recommendationTitle}>{ins.title}</Text>
                                    <Text style={pdfStyles.recommendationDesc}>{ins.description}</Text>
                                </View>
                            ))}
                        </>
                    ) : null}
                    {bundle.geo.recommendations.length > 0 ? (
                        <>
                            <PdfSectionHeader title={labels.recommendations} chapter="geo" />
                            {bundle.geo.recommendations.map((rec, i) => (
                                <View key={i} style={pdfStyles.recommendationRow}>
                                    <Text style={pdfStyles.recommendationTitle}>
                                        {rec.priority != null ? `P${rec.priority}: ` : ''}
                                        {rec.title}
                                    </Text>
                                    <Text style={pdfStyles.recommendationDesc}>{rec.description}</Text>
                                </View>
                            ))}
                        </>
                    ) : null}
                </>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
        </>
    );

    // 05 Topics & Competitors
    chapter({
        chapterNumber: '05',
        title: labels.contentTopics,
        subtitle: labels.chapterIntros.topics,
        chapter: 'structure',
    });
    pages = pushContent(
        pages,
        'topics',
        <>
            <PdfSectionHeader title={labels.contentTopics} chapter="structure" />
            {topicsChart ? (
                <PdfVisualSpec spec={topicsChart} />
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            <PdfSectionHeader title={labels.competitorComparison} chapter="competitors" />
            {competitorChart ? (
                <PdfVisualSpec spec={competitorChart} />
            ) : bundle.competitors.filter((c) => c.status === 'complete').length > 0 ? (
                <View style={pdfStyles.contentPanel}>
                    {bundle.competitors
                        .filter((c) => c.status === 'complete')
                        .map((c) => (
                            <View key={c.domain} style={pdfStyles.dataTableRow}>
                                <Text style={[pdfStyles.tableLabel, { width: '40%' }]}>{c.domain}</Text>
                                <Text style={pdfStyles.tableValue}>
                                    {labels.domainScore} {c.score} · SEO {c.seoOnPageScore}
                                </Text>
                            </View>
                        ))}
                </View>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
        </>
    );

    const hasAudience =
        bundle.audience?.available === true && (bundle.audience.personas.length ?? 0) > 0;
    const actionsChapter = hasAudience ? '07' : '06';
    const deepChapter = hasAudience
        ? isComprehensive && bundle.deep
            ? '08'
            : null
        : isComprehensive && bundle.deep
          ? '07'
          : null;

    // 06 Audience
    if (hasAudience && bundle.audience) {
        chapter({
            chapterNumber: '06',
            title: labels.audienceReality,
            subtitle: labels.chapterIntros.audience,
            chapter: 'ux',
        });
        pages.push(...buildAudienceReportPages(bundle.audience, labels, pages.length));
    }

    // Actions
    chapter({
        chapterNumber: actionsChapter,
        title: labels.actionPlan,
        subtitle: labels.chapterIntros.actions,
        chapter: 'summary',
    });
    pages = pushContent(
        pages,
        'actions',
        <>
            <PdfSectionHeader title={labels.actionPlan} chapter="summary" />
            {narrative?.recommendations && narrative.recommendations.length > 0 ? (
                narrative.recommendations.map((rec, i) => (
                    <View key={i} style={pdfStyles.recommendationRow}>
                        <Text style={pdfStyles.recommendationTitle}>
                            P{rec.priority}: {rec.title}
                        </Text>
                        <Text style={pdfStyles.recommendationDesc}>{rec.description}</Text>
                    </View>
                ))
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            {bundle.journey ? (
                <View style={[pdfStyles.contentPanel, { marginTop: 12 }]}>
                    <PdfSectionHeader title={labels.journeySummary} chapter="ux" />
                    <Text style={pdfStyles.bodyText}>
                        {bundle.journey.url} — {bundle.journey.task}
                    </Text>
                    {bundle.journey.summary ? <PdfLeadText>{bundle.journey.summary}</PdfLeadText> : null}
                </View>
            ) : null}
        </>
    );

    // Deep dive
    if (isComprehensive && bundle.deep && deepChapter) {
        chapter({
            chapterNumber: deepChapter,
            title: labels.metricsOverview,
            subtitle: labels.chapterIntros.deepDive,
            chapter: 'visual',
        });
        pages.push(
            ...buildDeepReportPages(bundle, labels, {
                geoQuestionTrend: geoQuestionTrend as VisualSpec | undefined,
                geoModelVisibility: geoModelVisibility as VisualSpec | undefined,
                geoQuestionTrendSeries: geoQuestionTrendSeries as VisualSpec | undefined,
                competitorRankingScores: competitorRankingScores as VisualSpec | undefined,
                competitorSeoBarChart: competitorSeoBarChart as VisualSpec | undefined,
                competitorTopicOverlap: competitorTopicOverlap as VisualSpec | undefined,
                rankTrend: rankTrend as VisualSpec | undefined,
            }, pages.length)
        );
    }

    const finalPages = applyReportFooters(pages, {
        title: labels.footerTitle,
        locale: bundle.locale,
        skipFooter: (page, index) => index === 0 || isChapterIntroPage(page),
    });

    return <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>{finalPages}</Document>;
}
