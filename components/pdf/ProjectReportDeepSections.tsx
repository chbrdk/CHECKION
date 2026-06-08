'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import type { SectionAnalysis } from '@/lib/project-report/narrative-schema';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfSectionHeader } from '@/components/pdf/shared/PdfPrimitives';
import { PdfContentPage, PdfLeadText, PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import { PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

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
        geoQuestionTrend?: VisualSpec;
        competitorRankingScores?: VisualSpec;
        competitorSeoBarChart?: VisualSpec;
        competitorTopicOverlap?: VisualSpec;
        rankTrend?: VisualSpec;
    }
): React.ReactElement[] {
    const deep = bundle.deep;
    if (!deep) return [];

    const pages: React.ReactElement[] = [];
    const narrative = bundle.narrative;
    const sections = narrative?.sections ?? deep.sections;

    pages.push(
        <PdfContentPage key="deep-metrics">
            <PdfSectionHeader title={labels.metricsOverview} chapter="visual" />
            <View style={pdfStyles.contentPanel}>
                <View style={pdfStyles.dataTableHeader}>
                    <Text style={[pdfStyles.dataTableHeaderCell, { width: '50%' }]}>{labels.metricLabel}</Text>
                    <Text style={[pdfStyles.dataTableHeaderCell, { width: '50%' }]}>{labels.metricValue}</Text>
                </View>
                {deep.metrics.slice(0, 24).map((m) => (
                    <View key={m.id} style={pdfStyles.dataTableRow}>
                        <Text style={[pdfStyles.tableLabel, { width: '50%' }]}>{m.label}</Text>
                        <Text style={[pdfStyles.tableValue, { width: '50%' }]}>
                            {m.value != null ? `${m.value}${m.unit ?? ''}` : '–'}
                            {m.benchmark ? ` · ${m.benchmark}` : ''}
                        </Text>
                    </View>
                ))}
            </View>
        </PdfContentPage>
    );

    if (narrative?.findings && narrative.findings.length > 0) {
        pages.push(
            <PdfContentPage key="deep-findings">
                <PdfSectionHeader title={labels.keyFindings} chapter="summary" />
                {narrative.findings.map((f, i) => (
                    <View key={i} style={pdfStyles.recommendationRow}>
                        <Text style={pdfStyles.recommendationTitle}>
                            [{f.severity ?? 'info'}] {f.title}
                        </Text>
                        <Text style={pdfStyles.recommendationDesc}>{f.description}</Text>
                    </View>
                ))}
            </PdfContentPage>
        );
    }

    const benchmark = bundle.deep?.competitiveBenchmark;
    if (benchmark && benchmark.scoreboard.length > 0) {
        pages.push(
            <PdfContentPage key="deep-competitive">
                <PdfSectionHeader title={labels.competitiveBenchmark} chapter="competitors" />
                <PdfStatGrid
                    items={[
                        {
                            label: 'WCAG rank',
                            value: `#${benchmark.summary.ownWcagRank}`,
                            accent: '#7C3AED',
                        },
                        {
                            label: 'SEO rank',
                            value: `#${benchmark.summary.ownSeoRank}`,
                        },
                        {
                            label: 'Shared themes',
                            value: String(benchmark.summary.sharedThemeCount),
                        },
                        {
                            label: 'Competitors scanned',
                            value: String(benchmark.summary.completeCompetitorCount),
                        },
                    ]}
                />
                <PdfSectionHeader title={labels.scoreboard} chapter="competitors" />
                <View style={pdfStyles.contentPanel}>
                    {benchmark.scoreboard.map((row) => (
                        <View key={row.domain} style={pdfStyles.dataTableRow}>
                            <Text style={[pdfStyles.tableLabel, { width: '35%' }]}>
                                {row.isOwn ? `${row.domain} (own)` : row.domain}
                            </Text>
                            <Text style={pdfStyles.tableValue}>
                                WCAG {row.wcagScore}
                                {row.wcagDeltaVsOwn != null && !row.isOwn
                                    ? ` (${row.wcagDeltaVsOwn > 0 ? '+' : ''}${row.wcagDeltaVsOwn})`
                                    : ''}{' '}
                                · SEO {row.seoOnPageScore}
                            </Text>
                        </View>
                    ))}
                </View>
                {visuals.competitorSeoBarChart ? (
                    <PdfVisualSpec spec={visuals.competitorSeoBarChart} />
                ) : null}
                {benchmark.deterministicInsights.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.competitiveInsights} chapter="competitors" />
                        {benchmark.deterministicInsights.map((ins) => (
                            <View key={ins.id} style={pdfStyles.recommendationRow}>
                                <Text style={pdfStyles.recommendationTitle}>
                                    [{ins.kind}] {ins.title}
                                </Text>
                                <Text style={pdfStyles.recommendationDesc}>{ins.description}</Text>
                            </View>
                        ))}
                    </>
                ) : null}
                {benchmark.topicOverlap.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.topicOverlap} chapter="structure" />
                        {visuals.competitorTopicOverlap ? (
                            <PdfVisualSpec spec={visuals.competitorTopicOverlap} />
                        ) : null}
                    </>
                ) : null}
            </PdfContentPage>
        );
    }

    const sectionEntries: Array<[string, SectionAnalysis | null | undefined]> = [
        ['siteQuality', sections.siteQuality],
        ['seoRankings', sections.seoRankings],
        ['geo', sections.geo],
        ['competitive', sections.competitive],
        ['journey', sections.journey],
    ];

    for (const [key, section] of sectionEntries) {
        if (!section) continue;
        pages.push(
            <PdfContentPage key={`deep-section-${key}`}>
                <PdfSectionHeader title={labels.sectionAnalysis} chapter="ux" />
                <SectionAnalysisBlock section={section} />
            </PdfContentPage>
        );
    }

    if (deep.rankKeywordDetails.length > 0) {
        pages.push(
            <PdfContentPage key="deep-keywords">
                <PdfSectionHeader title={labels.keywordDetails} chapter="seo" />
                {visuals.competitorRankingScores ? (
                    <PdfVisualSpec spec={visuals.competitorRankingScores} />
                ) : null}
                <View style={pdfStyles.contentPanel}>
                    {deep.rankKeywordDetails.slice(0, 15).map((kw) => (
                        <View key={kw.id} style={pdfStyles.dataTableRow}>
                            <Text style={[pdfStyles.tableLabel, { width: '40%' }]}>{kw.keyword}</Text>
                            <Text style={pdfStyles.tableValue}>
                                {kw.position != null ? `#${kw.position}` : '–'}
                                {kw.positionDelta != null
                                    ? ` (${kw.positionDelta > 0 ? '+' : ''}${kw.positionDelta})`
                                    : ''}
                            </Text>
                        </View>
                    ))}
                </View>
                {visuals.rankTrend ? <PdfVisualSpec spec={visuals.rankTrend} /> : null}
            </PdfContentPage>
        );
    }

    if (deep.geoQuestionHistory.length > 0 || deep.geoPages.length > 0) {
        pages.push(
            <PdfContentPage key="deep-geo">
                {deep.geoQuestionHistory.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.geoQuestionHistory} chapter="geo" />
                        {visuals.geoQuestionTrend ? (
                            <PdfVisualSpec spec={visuals.geoQuestionTrend} />
                        ) : null}
                    </>
                ) : null}
                {deep.geoPages.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.geoPageAnalysis} chapter="geo" />
                        {deep.geoPages.slice(0, 8).map((p) => (
                            <View key={p.url} style={pdfStyles.recommendationRow}>
                                <Text style={pdfStyles.recommendationTitle}>{p.title ?? p.url}</Text>
                                <Text style={pdfStyles.recommendationDesc}>
                                    GEO {p.geoFitnessScore ?? '–'} · Trust {p.trustScore ?? '–'}
                                </Text>
                            </View>
                        ))}
                    </>
                ) : null}
            </PdfContentPage>
        );
    }

    if (deep.issueGroups.length > 0 || deep.seoRollup) {
        pages.push(
            <PdfContentPage key="deep-issues-seo">
                {deep.issueGroups.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.issueGroups} chapter="issues" />
                        <View style={pdfStyles.contentPanel}>
                            {deep.issueGroups.map((g) => (
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
                {deep.seoRollup ? (
                    <>
                        <PdfSectionHeader title={labels.seoTechnical} chapter="seo" />
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
            </PdfContentPage>
        );
    }

    return pages;
}
