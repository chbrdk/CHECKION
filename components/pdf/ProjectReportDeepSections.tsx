'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import type { SectionAnalysis } from '@/lib/project-report/narrative-schema';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfContentPage, PdfLeadText, PdfStatGrid, contentSideForIndex } from '@/components/pdf/shared/PdfLayout';
import { PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import type { VisualSpec } from '@/lib/project-report/chart-specs';
import {
    PdfCompetitiveScoreboardTable,
    PdfScanChangesTable,
    PdfTopicOverlapTable,
} from '@/components/pdf/shared/PdfCompetitiveTables';
import {
    competitiveInsightRowsForPdf,
    getCompetitiveSectionAnalysis,
    resolveCompetitiveInterpretations,
} from '@/lib/project-report/competitive-interpretations';
import {
    PDF_GEO_DEEP_PAGE_LIMIT,
    PDF_GEO_DEEP_REASONING_MAX,
} from '@/lib/project-report/pdf-geo-display';
import { filterIssueGroupsForPdfAppendix } from '@/lib/project-report/pdf-issue-groups-display';
import {
    filterSupplementaryMetricsForPdf,
    hasSupplementaryMetricsForPdf,
} from '@/lib/project-report/pdf-metrics-display';
import {
    formatCompetitiveInsightKind,
    filterScanChangesForPdf,
    hasSeoRollupData,
    prioritizeTopicOverlapRows,
    selectCompetitiveInsightsForPdf,
    stripPdfEvidenceMarkers,
} from '@/lib/project-report/pdf-competitive-display';
import {
    PdfMetricInterpretationGroup,
    pdfInterpretationTexts,
} from '@/components/pdf/shared/PdfMetricInterpretation';

function SectionAnalysisBlock({ section }: { section: SectionAnalysis }) {
    return (
        <View style={pdfStyles.contentPanel}>
            <Text style={[pdfStyles.subsectionTitle, { fontSize: 11, marginBottom: 8 }]}>{section.title}</Text>
            <PdfLeadText>{section.summary}</PdfLeadText>
            {section.keyFindings.length > 0 ? (
                <>
                    <Text style={[pdfStyles.statTileLabel, { marginTop: 8, marginBottom: 4 }]}>
                        Key findings
                    </Text>
                    {section.keyFindings.map((f, i) => (
                        <View key={i} style={pdfStyles.bulletItem}>
                            <View style={pdfStyles.bulletDot} />
                            <Text style={pdfStyles.bodyText}>{f}</Text>
                        </View>
                    ))}
                </>
            ) : null}
        </View>
    );
}

export function buildDeepReportPages(
    bundle: ProjectReportBundle,
    labels: ProjectReportPdfLabels,
    visuals: {
        competitorRankingScores?: VisualSpec;
        competitorSeoBarChart?: VisualSpec;
    },
    startPageIndex: number
): React.ReactElement[] {
    const deep = bundle.deep;
    if (!deep) return [];

    const pages: React.ReactElement[] = [];
    let pageOffset = 0;
    const addPage = (key: string, children: React.ReactNode) => {
        pages.push(
            <PdfContentPage key={key} side={contentSideForIndex(startPageIndex + pageOffset)}>
                {children}
            </PdfContentPage>
        );
        pageOffset += 1;
    };

    const narrative = bundle.narrative;
    const sections = narrative?.sections ?? deep.sections;

    const supplementaryMetrics = filterSupplementaryMetricsForPdf(deep.metrics);
    if (hasSupplementaryMetricsForPdf(deep.metrics)) {
        addPage(
            'deep-metrics',
            <>
                <PdfSectionHeader outlineId="deep.metrics" title={labels.metricsOverview} chapter="visual" />
                <PdfSectionIntro text={labels.chapterIntros.deepDive} />
                <View style={pdfStyles.contentPanel}>
                    <View style={pdfStyles.dataTableHeader}>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '50%' }]}>
                            {labels.metricLabel}
                        </Text>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '50%' }]}>
                            {labels.metricValue}
                        </Text>
                    </View>
                    {supplementaryMetrics.map((m) => (
                        <View key={m.id} style={pdfStyles.dataTableRow}>
                            <Text style={[pdfStyles.tableLabel, { width: '50%' }]}>{m.label}</Text>
                            <Text style={[pdfStyles.tableValue, { width: '50%' }]}>
                                {m.value != null ? `${m.value}${m.unit ?? ''}` : '–'}
                                {m.benchmark ? ` · ${m.benchmark}` : ''}
                            </Text>
                        </View>
                    ))}
                </View>
            </>
        );
    }

    const benchmark = bundle.deep?.competitiveBenchmark;
    if (benchmark && benchmark.scoreboard.length > 0) {
        const competitiveSection = getCompetitiveSectionAnalysis(bundle);
        const competitiveInterpretations = resolveCompetitiveInterpretations(bundle);
        const competitiveOverviewTexts = pdfInterpretationTexts(
            competitiveInterpretations.competitiveOverview,
            !competitiveInterpretations.competitiveOverview && competitiveSection?.summary
                ? stripPdfEvidenceMarkers(competitiveSection.summary)
                : undefined
        );
        const competitiveInsightCards = selectCompetitiveInsightsForPdf(
            benchmark.deterministicInsights
        );
        const competitiveInsightRows = competitiveInsightRowsForPdf(competitiveInsightCards, bundle);
        const scanChangesRows = filterScanChangesForPdf(benchmark.scanChanges);

        addPage(
            'deep-competitive',
            <>
                <PdfSectionHeader
                    outlineId="deep.competitive"
                    title={labels.competitiveBenchmark}
                    chapter="competitors"
                />
                <PdfStatGrid
                    items={[
                        {
                            label: labels.domainScoreRank,
                            value: `#${benchmark.summary.ownDomainScoreRank}`,
                            accent: '#7C3AED',
                        },
                        {
                            label: labels.seoRank,
                            value: `#${benchmark.summary.ownSeoRank}`,
                        },
                        {
                            label: labels.uniqueOwnThemes,
                            value: String(benchmark.summary.uniqueOwnThemes),
                        },
                        {
                            label: labels.themesOnlyCompetitorsHave,
                            value: String(benchmark.summary.themesOnlyCompetitorsHave),
                        },
                    ]}
                />
                {competitiveOverviewTexts.length > 0 ? (
                    <PdfMetricInterpretationGroup texts={competitiveOverviewTexts} />
                ) : null}
                <PdfSectionHeader
                    outlineId="deep.competitive.scoreboard"
                    level={1}
                    title={labels.scoreboard}
                    chapter="competitors"
                />
                <PdfMetricInterpretationGroup
                    texts={pdfInterpretationTexts(competitiveInterpretations.scoreboard)}
                />
                <PdfCompetitiveScoreboardTable rows={benchmark.scoreboard} labels={labels} />
                {scanChangesRows.length > 0 ? (
                    <>
                        <PdfSectionHeader
                            outlineId="deep.competitive.scanChanges"
                            level={1}
                            title={labels.competitiveScanChanges}
                            chapter="competitors"
                        />
                        <PdfScanChangesTable rows={scanChangesRows} labels={labels} />
                    </>
                ) : null}
                {visuals.competitorSeoBarChart && benchmark.scoreboard.length <= 1 ? (
                    <PdfVisualSpec spec={visuals.competitorSeoBarChart} />
                ) : null}
                {competitiveInsightCards.length > 0 ? (
                    <>
                        <PdfSectionHeader
                            outlineId="deep.competitive.insights"
                            level={1}
                            title={labels.competitiveInsights}
                            chapter="competitors"
                        />
                        <PdfMetricInterpretationGroup
                            texts={pdfInterpretationTexts(competitiveInterpretations.insightsOverview)}
                        />
                        {competitiveInsightRows.map(({ insight, description }) => (
                            <PdfRecommendationRow
                                key={insight.id}
                                title={`[${formatCompetitiveInsightKind(insight.kind, bundle.locale)}] ${insight.title}`}
                                description={description}
                            />
                        ))}
                    </>
                ) : null}
                {benchmark.topicOverlap.length > 0 ? (
                    <>
                        <PdfSectionHeader
                            outlineId="deep.competitive.topics"
                            level={1}
                            title={labels.topicOverlap}
                            chapter="structure"
                        />
                        {competitiveInsightCards.length === 0 ? (
                            <PdfMetricInterpretationGroup
                                texts={pdfInterpretationTexts(competitiveInterpretations.topicOverlap)}
                            />
                        ) : null}
                        <PdfTopicOverlapTable
                            rows={prioritizeTopicOverlapRows(benchmark.topicOverlap)}
                            labels={labels}
                        />
                    </>
                ) : null}
            </>
        );
    }

    const redundantSectionKeys = new Set(['siteQuality', 'seoRankings', 'competitive']);
    const sectionEntries: Array<[string, SectionAnalysis | null | undefined]> = [
        ['journey', sections.journey],
    ];

    for (const [key, section] of sectionEntries) {
        if (!section || redundantSectionKeys.has(key)) continue;
        addPage(
            `deep-section-${key}`,
            <>
                <PdfSectionHeader title={labels.sectionAnalysis} chapter="ux" />
                <SectionAnalysisBlock section={section} />
            </>
        );
    }

    if (visuals.competitorRankingScores) {
        addPage(
            'deep-ranking-competitors',
            <>
                <PdfSectionHeader
                    outlineId="deep.ranking-competitors"
                    title={labels.rankingCompetitorComparison}
                    chapter="seo"
                />
                <PdfVisualSpec spec={visuals.competitorRankingScores} />
            </>
        );
    }

    const geoDeep = deep.geoDeep;
    // LLM model benchmark chart is shown in the main GEO chapter — skip duplicate deep page.

    const geoPages = geoDeep?.pages.length ? geoDeep.pages : deep.geoPages;
    if (geoPages.length > 0) {
        addPage(
            'deep-geo-pages',
            <>
                <PdfSectionHeader outlineId="deep.geo-pages" title={labels.geoOnPageEeat} chapter="geo" />
                <PdfStatGrid
                    items={[
                        {
                            label: 'Avg GEO fitness',
                            value:
                                geoDeep?.summary.avgGeoFitness != null
                                    ? String(geoDeep.summary.avgGeoFitness)
                                    : '–',
                        },
                        {
                            label: 'Avg trust',
                            value:
                                geoDeep?.summary.avgTrust != null
                                    ? `${geoDeep.summary.avgTrust}/5`
                                    : '–',
                        },
                        {
                            label: 'Pages below threshold',
                            value: String(geoDeep?.summary.pagesBelowGeoThreshold ?? 0),
                        },
                    ]}
                />
                {geoPages.slice(0, PDF_GEO_DEEP_PAGE_LIMIT).map((p) => (
                    <View key={p.url} style={pdfStyles.recommendationRow}>
                        <View style={pdfStyles.recommendationTitleBlock}>
                            <Text style={pdfStyles.recommendationTitle}>{p.title ?? p.url}</Text>
                        </View>
                        <View style={pdfStyles.recommendationDescBlock}>
                            <Text style={pdfStyles.recommendationDesc}>
                                GEO {p.geoFitnessScore ?? '–'}/100 · Trust {p.trustScore ?? '–'}/5 · Exp{' '}
                                {p.experienceScore ?? '–'} · Expertise {p.expertiseScore ?? '–'}
                                {p.authoritativenessScore != null
                                    ? ` · Auth ${p.authoritativenessScore}`
                                    : ''}
                            </Text>
                        </View>
                        {p.geoFitnessReasoning ? (
                            <Text style={[pdfStyles.bodyText, { marginTop: 4 }]}>
                                {p.geoFitnessReasoning.slice(0, PDF_GEO_DEEP_REASONING_MAX)}
                                {p.geoFitnessReasoning.length > PDF_GEO_DEEP_REASONING_MAX ? '…' : ''}
                            </Text>
                        ) : null}
                        {p.missingElements.length > 0 ? (
                            <Text style={pdfStyles.metaText}>
                                Missing: {p.missingElements.join(', ')}
                            </Text>
                        ) : null}
                        <Text style={pdfStyles.metaText}>
                            Privacy {p.hasPrivacy ? '✓' : '✗'} · Impressum {p.hasImpressum ? '✓' : '✗'}
                        </Text>
                    </View>
                ))}
            </>
        );
    }

    const appendixIssueGroups = filterIssueGroupsForPdfAppendix(
        deep.issueGroups,
        bundle.domain?.systemicIssues.map((issue) => issue.title) ?? []
    );
    if (appendixIssueGroups.length > 0 || hasSeoRollupData(deep.seoRollup)) {
        addPage(
            'deep-issues-seo',
            <>
                <PdfSectionHeader
                    outlineId="deep.issues-seo"
                    title={labels.technicalAppendix}
                    chapter="issues"
                />
                {appendixIssueGroups.length > 0 ? (
                    <>
                        <PdfSectionHeader
                            outlineId="deep.issues-seo.groups"
                            level={1}
                            title={labels.issueGroups}
                            chapter="issues"
                        />
                        <View style={pdfStyles.contentPanel}>
                            {appendixIssueGroups.map((g) => (
                                <View key={g.groupKey} style={pdfStyles.dataTableRow}>
                                    <Text style={[pdfStyles.tableLabel, { width: '45%' }]}>{g.title}</Text>
                                    <Text style={pdfStyles.tableValue}>
                                        {g.pageCount} pages · {g.type}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                ) : null}
                {hasSeoRollupData(deep.seoRollup) && deep.seoRollup ? (
                    <>
                        <PdfSectionHeader
                            outlineId="deep.issues-seo.technical"
                            level={1}
                            title={labels.seoTechnical}
                            chapter="seo"
                        />
                        <PdfStatGrid
                            items={(
                                [
                                    ['Missing title', deep.seoRollup.pagesMissingTitle],
                                    ['Missing meta', deep.seoRollup.pagesMissingMeta],
                                    ['Missing H1', deep.seoRollup.pagesMissingH1],
                                    ['Duplicate titles', deep.seoRollup.duplicateTitles],
                                    ['Broken links', deep.seoRollup.brokenLinksCount],
                                    ['JSON-LD pages', deep.seoRollup.jsonLdPages],
                                ] as const
                            ).map(([label, value]) => ({
                                label,
                                value: value != null ? String(value) : '–',
                            }))}
                        />
                    </>
                ) : null}
            </>
        );
    }

    return pages;
}
