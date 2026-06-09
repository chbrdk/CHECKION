'use client';

import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import {
    PdfProjectReportCoverContent,
} from '@/components/pdf/shared/PdfCoverContent';
import {
    PdfCoverPage,
    PdfContentPage,
    PdfStatGrid,
    PdfLeadText,
    applyReportFooters,
    contentSideForIndex,
    PDF_DOCUMENT_PAGE_LAYOUT,
} from '@/components/pdf/shared/PdfLayout';
import { PdfSectionHeader, PdfSectionIntro, RiskAmpelPills } from '@/components/pdf/shared/PdfPrimitives';
import { PdfScoreCardsFromSpec, PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { buildDeepReportPages } from '@/components/pdf/ProjectReportDeepSections';
import { buildAudienceReportPages } from '@/components/pdf/ProjectReportAudienceSections';
import { PdfTableOfContents } from '@/components/pdf/shared/PdfTableOfContents';
import {
    insertProjectReportTableOfContents,
    type PdfTocResolvedEntry,
} from '@/lib/paths/pdf-table-of-contents';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

interface ProjectReportDocumentProps {
    bundle: ProjectReportBundle;
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

export function buildProjectReportPages(bundle: ProjectReportBundle): React.ReactElement[] {
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

    const coverSubtitle = isComprehensive ? labels.comprehensiveSubtitle : labels.reportSubtitle;
    const projectLine = [bundle.project.name, bundle.project.domain].filter(Boolean).join(' · ');
    const coverLead =
        bundle.project.valueProposition?.trim() ||
        narrative?.executiveSummary?.split(/\n\n+/)[0]?.trim() ||
        null;

    // Deckblatt — gleiche Struktur wie `/dev/pdf-print` Preview
    pages.push(
        <PdfCoverPage key="cover">
            <PdfProjectReportCoverContent
                eyebrow={pdfCoverEyebrow(coverSubtitle)}
                title={labels.reportTitle}
                projectLine={projectLine || bundle.project.name}
                leadText={coverLead}
            />
        </PdfCoverPage>
    );

    pages = pushContent(
        pages,
        'executive',
        <>
            <PdfSectionHeader title={labels.executiveSummary} chapter="summary" />
            <PdfSectionIntro text={labels.chapterIntros.executive} />
            {scoreCards?.kind === 'scoreCards' ? (
                <PdfScoreCardsFromSpec spec={scoreCards} />
            ) : null}
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

    pages = pushContent(
        pages,
        'quality',
        <>
            <PdfSectionHeader title={labels.siteQuality} chapter="issues" />
            <PdfSectionIntro text={labels.chapterIntros.siteQuality} />
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

    pages = pushContent(
        pages,
        'seo',
        <>
            <PdfSectionHeader title={labels.seoRankings} chapter="seo" />
            <PdfSectionIntro text={labels.chapterIntros.seo} />
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

    pages = pushContent(
        pages,
        'geo',
        <>
            <PdfSectionHeader title={labels.geoEeat} chapter="geo" />
            <PdfSectionIntro text={labels.chapterIntros.geo} />
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

    pages = pushContent(
        pages,
        'topics',
        <>
            <PdfSectionHeader title={labels.contentTopics} chapter="structure" />
            <PdfSectionIntro text={labels.chapterIntros.topics} />
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

    if (hasAudience && bundle.audience) {
        pages.push(...buildAudienceReportPages(bundle.audience, labels, pages.length));
    }

    pages = pushContent(
        pages,
        'actions',
        <>
            <PdfSectionHeader title={labels.actionPlan} chapter="summary" />
            <PdfSectionIntro text={labels.chapterIntros.actions} />
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

    if (isComprehensive && bundle.deep) {
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

    return pages;
}

function buildProjectReportTocPages(
    chunks: PdfTocResolvedEntry[][],
    startPageIndex: number,
    title: string
): React.ReactElement[] {
    return chunks.map((entries, chunkIndex) => (
        <PdfContentPage key={`toc-${chunkIndex}`} side={contentSideForIndex(startPageIndex + chunkIndex)}>
            {chunkIndex === 0 ? <PdfSectionHeader title={title} chapter="summary" /> : null}
            <PdfTableOfContents entries={entries} />
        </PdfContentPage>
    ));
}

export function finalizeProjectReportPages(
    pages: React.ReactElement[],
    bundle: ProjectReportBundle
): React.ReactElement[] {
    const labels = getProjectReportPdfLabels(bundle.locale);
    const withToc = insertProjectReportTableOfContents(pages, bundle, labels, (chunks, startPageIndex) =>
        buildProjectReportTocPages(chunks, startPageIndex, labels.tableOfContents)
    );
    return applyReportFooters(withToc, {
        title: labels.footerTitle,
        locale: bundle.locale,
        skipFooter: (_page, index) => index === 0,
    });
}

export function ProjectReportDocument({ bundle }: ProjectReportDocumentProps) {
    return (
        <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>
            {finalizeProjectReportPages(buildProjectReportPages(bundle), bundle)}
        </Document>
    );
}
