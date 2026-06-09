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
import { PdfGeoQuestionCard } from '@/components/pdf/shared/PdfGeoQuestionCard';
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
        geoModelVisibility?: VisualSpec;
        geoQuestionTrendSeries?: VisualSpec;
        competitorRankingScores?: VisualSpec;
        competitorSeoBarChart?: VisualSpec;
        competitorTopicOverlap?: VisualSpec;
        rankTrend?: VisualSpec;
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

    addPage(
        'deep-metrics',
        <>
            <PdfSectionHeader title={labels.metricsOverview} chapter="visual" />
            <PdfSectionIntro text={labels.chapterIntros.deepDive} />
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
        </>
    );

    if (narrative?.findings && narrative.findings.length > 0) {
        addPage(
            'deep-findings',
            <>
                <PdfSectionHeader title={labels.keyFindings} chapter="summary" />
                {narrative.findings.map((f, i) => (
                    <PdfRecommendationRow
                        key={i}
                        title={`[${f.severity ?? 'info'}] ${f.title}`}
                        description={f.description}
                    />
                ))}
            </>
        );
    }

    const benchmark = bundle.deep?.competitiveBenchmark;
    if (benchmark && benchmark.scoreboard.length > 0) {
        addPage(
            'deep-competitive',
            <>
                <PdfSectionHeader title={labels.competitiveBenchmark} chapter="competitors" />
                <PdfStatGrid
                    items={[
                        {
                            label: labels.domainScoreRank,
                            value: `#${benchmark.summary.ownDomainScoreRank}`,
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
                                {labels.domainScore} {row.domainScore}
                                {row.domainScoreDeltaVsOwn != null && !row.isOwn
                                    ? ` (${row.domainScoreDeltaVsOwn > 0 ? '+' : ''}${row.domainScoreDeltaVsOwn})`
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
                            <PdfRecommendationRow
                                key={ins.id}
                                title={`[${ins.kind}] ${ins.title}`}
                                description={ins.description}
                            />
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
            </>
        );
    }

    const sectionEntries: Array<[string, SectionAnalysis | null | undefined]> = [
        ['siteQuality', sections.siteQuality],
        ['seoRankings', sections.seoRankings],
        ['competitive', sections.competitive],
        ['journey', sections.journey],
    ];

    for (const [key, section] of sectionEntries) {
        if (!section) continue;
        addPage(
            `deep-section-${key}`,
            <>
                <PdfSectionHeader title={labels.sectionAnalysis} chapter="ux" />
                <SectionAnalysisBlock section={section} />
            </>
        );
    }

    if (deep.rankKeywordDetails.length > 0) {
        addPage(
            'deep-keywords',
            <>
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
            </>
        );
    }

    const geoDeep = deep.geoDeep;
    if (geoDeep && geoDeep.modelBenchmarks.length > 0) {
        addPage(
            'deep-geo-models',
            <>
                <PdfSectionHeader title={labels.geoModelBenchmark} chapter="geo" />
                {visuals.geoModelVisibility ? <PdfVisualSpec spec={visuals.geoModelVisibility} /> : null}
                <View style={pdfStyles.contentPanel}>
                    <View style={pdfStyles.dataTableHeader}>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '28%' }]}>Model</Text>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '18%' }]}>Visibility</Text>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '18%' }]}>Avg pos.</Text>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '18%' }]}>SoV</Text>
                        <Text style={[pdfStyles.dataTableHeaderCell, { width: '18%' }]}>Mentions</Text>
                    </View>
                    {geoDeep.modelBenchmarks.map((m) => (
                        <View key={m.modelId} style={pdfStyles.dataTableRow}>
                            <Text style={[pdfStyles.tableLabel, { width: '28%' }]}>{m.modelId}</Text>
                            <Text style={[pdfStyles.tableValue, { width: '18%' }]}>
                                {m.visibilityScore ?? '–'}
                            </Text>
                            <Text style={[pdfStyles.tableValue, { width: '18%' }]}>
                                {m.avgPosition ?? '–'}
                            </Text>
                            <Text style={[pdfStyles.tableValue, { width: '18%' }]}>
                                {m.shareOfVoice != null ? `${Math.round(m.shareOfVoice * 100)}%` : '–'}
                            </Text>
                            <Text style={[pdfStyles.tableValue, { width: '18%' }]}>
                                {m.mentionCount ?? '–'}
                            </Text>
                        </View>
                    ))}
                </View>
            </>
        );
    }

    if (geoDeep && geoDeep.questionDetails.length > 0) {
        addPage(
            'deep-geo-questions',
            <>
                <PdfSectionHeader title={labels.geoQuestionAnalysis} chapter="geo" />
                {visuals.geoQuestionTrendSeries ? (
                    <PdfVisualSpec spec={visuals.geoQuestionTrendSeries} />
                ) : visuals.geoQuestionTrend ? (
                    <PdfVisualSpec spec={visuals.geoQuestionTrend} />
                ) : null}
                {geoDeep.questionDetails.slice(0, 16).map((q) => (
                    <PdfGeoQuestionCard key={q.evidenceId} question={q} labels={labels} />
                ))}
            </>
        );
    }

    const geoPages = geoDeep?.pages.length ? geoDeep.pages : deep.geoPages;
    if (geoPages.length > 0) {
        addPage(
            'deep-geo-pages',
            <>
                <PdfSectionHeader title={labels.geoOnPageEeat} chapter="geo" />
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
                {geoPages.slice(0, 10).map((p) => (
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
                                {p.geoFitnessReasoning.slice(0, 280)}
                                {p.geoFitnessReasoning.length > 280 ? '…' : ''}
                            </Text>
                        ) : null}
                        {p.trustReasoning ? (
                            <Text style={pdfStyles.metaText}>Trust: {p.trustReasoning.slice(0, 160)}…</Text>
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

    if (sections.geo && !pages.some((p) => p.key === 'deep-section-geo')) {
        addPage(
            'deep-section-geo',
            <>
                <PdfSectionHeader title={labels.geoAgentAnalysis} chapter="geo" />
                <SectionAnalysisBlock section={sections.geo} />
            </>
        );
    }

    if (deep.issueGroups.length > 0 || deep.seoRollup) {
        addPage(
            'deep-issues-seo',
            <>
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
            </>
        );
    }

    return pages;
}
