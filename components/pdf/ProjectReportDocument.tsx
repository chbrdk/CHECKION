'use client';

import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import {
    MsqdxLogoPdf,
    PdfFooter,
    PdfHeader,
    PdfSectionHeader,
    RiskAmpelPills,
} from '@/components/pdf/shared/PdfPrimitives';
import { PdfScoreCardsFromSpec, PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import { buildDeepReportPages } from '@/components/pdf/ProjectReportDeepSections';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

interface ProjectReportDocumentProps {
    bundle: ProjectReportBundle;
}

function formatDate(iso: string, locale: 'de' | 'en'): string {
    return new Date(iso).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US');
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
    const competitorRankingScores = bundle.visuals.find((v) => v.kind === 'competitorRankingScores');
    const competitorSeoBarChart = bundle.visuals.find((v) => v.kind === 'competitorSeoBarChart');
    const competitorTopicOverlap = bundle.visuals.find((v) => v.kind === 'competitorTopicOverlap');
    const narrative = bundle.narrative;
    const dateLocale = bundle.locale === 'de' ? 'de-DE' : 'en-US';
    const isComprehensive = bundle.variant === 'comprehensive' || bundle.variant === 'full';
    const deepPages = isComprehensive
        ? buildDeepReportPages(bundle, labels, {
              geoQuestionTrend: geoQuestionTrend as VisualSpec | undefined,
              competitorRankingScores: competitorRankingScores as VisualSpec | undefined,
              competitorSeoBarChart: competitorSeoBarChart as VisualSpec | undefined,
              competitorTopicOverlap: competitorTopicOverlap as VisualSpec | undefined,
              rankTrend: rankTrend as VisualSpec | undefined,
          })
        : [];
    const totalPages = 8 + deepPages.length;

    const pages: React.ReactNode[] = [];

    // Cover
    pages.push(
        <Page key="cover" size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.coverAccentBar} fixed />
            <View style={pdfStyles.coverLogoWrap}>
                <MsqdxLogoPdf width={100} height={24} />
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
                <Text style={[pdfStyles.bodyText, { marginTop: 12 }]}>{bundle.project.valueProposition}</Text>
            ) : null}
        </Page>
    );

    // Executive Summary
    pages.push(
        <Page key="exec" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.executiveSummary} chapter="summary" />
            {narrative?.riskAmpel ? (
                <RiskAmpelPills ampel={narrative.riskAmpel} labels={labels.riskAmpel} />
            ) : null}
            {narrative?.executiveSummary ? (
                <Text style={pdfStyles.bodyText}>{narrative.executiveSummary}</Text>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            {narrative?.competitiveLandscape ? (
                <>
                    <PdfSectionHeader title={labels.competitorComparison} chapter="competitors" />
                    <Text style={pdfStyles.bodyText}>{narrative.competitiveLandscape}</Text>
                </>
            ) : null}
            {bundle.domain?.llmSummary?.summary ? (
                <>
                    <PdfSectionHeader title="Domain Summary" chapter="ux" />
                    <Text style={pdfStyles.bodyText}>{bundle.domain.llmSummary.summary}</Text>
                </>
            ) : null}
            <PdfFooter pageNumber={2} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    // Site Quality
    pages.push(
        <Page key="quality" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.siteQuality} chapter="issues" />
            {bundle.domain ? (
                <>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>WCAG Score</Text>
                        <Text style={pdfStyles.tableValue}>{bundle.domain.wcagScore}/100</Text>
                    </View>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>{labels.pages}</Text>
                        <Text style={pdfStyles.tableValue}>{bundle.domain.totalPageCount}</Text>
                    </View>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>{labels.wcagErrors}</Text>
                        <Text style={pdfStyles.tableValue}>
                            {bundle.domain.issueStats.errors} / {bundle.domain.issueStats.warnings}
                        </Text>
                    </View>
                    {bundle.domain.performance ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>{labels.performance}</Text>
                            <Text style={pdfStyles.tableValue}>
                                {bundle.domain.performance.avgTtfb ?? '–'} /{' '}
                                {bundle.domain.performance.avgFcp ?? '–'} /{' '}
                                {bundle.domain.performance.avgLcp ?? '–'}
                            </Text>
                        </View>
                    ) : null}
                    {bundle.domain.eco ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>{labels.eco}</Text>
                            <Text style={pdfStyles.tableValue}>
                                {bundle.domain.eco.avgCo2 != null ? `${bundle.domain.eco.avgCo2}g` : '–'}
                            </Text>
                        </View>
                    ) : null}
                    {bundle.domain.systemicIssues.length > 0 ? (
                        <>
                            <PdfSectionHeader title={labels.systemicIssues} chapter="issues" />
                            {bundle.domain.systemicIssues.map((issue) => (
                                <View key={issue.issueId} style={pdfStyles.bulletItem}>
                                    <View style={pdfStyles.bulletDot} />
                                    <Text style={pdfStyles.bodyText}>
                                        {issue.title} ({issue.count}×)
                                    </Text>
                                </View>
                            ))}
                        </>
                    ) : null}
                </>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            <PdfFooter pageNumber={3} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    // SEO & Rankings
    pages.push(
        <Page key="seo" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.seoRankings} chapter="seo" />
            {bundle.domain ? (
                <View style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.tableLabel}>SEO On-Page</Text>
                    <Text style={pdfStyles.tableValue}>
                        {bundle.domain.seoOnPageScore}/100 ({bundle.domain.seoOnPageLabel})
                    </Text>
                </View>
            ) : null}
            {bundle.rankings ? (
                <>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>Ranking Score</Text>
                        <Text style={pdfStyles.tableValue}>
                            {bundle.rankings.score ?? '–'}/100 · {bundle.rankings.keywordCount} keywords
                        </Text>
                    </View>
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
            <PdfFooter pageNumber={4} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    // GEO
    pages.push(
        <Page key="geo" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.geoEeat} chapter="geo" />
            {bundle.geo ? (
                <>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>GEO Score</Text>
                        <Text style={pdfStyles.tableValue}>{bundle.geo.score ?? '–'}/100</Text>
                    </View>
                    {geoChart ? <PdfVisualSpec spec={geoChart} /> : null}
                    {bundle.geo.recommendations.length > 0 ? (
                        <>
                            <PdfSectionHeader title={labels.recommendations} chapter="geo" />
                            {bundle.geo.recommendations.map((rec, i) => (
                                <View key={i} style={pdfStyles.recommendationRow}>
                                    <Text style={pdfStyles.recommendationTitle}>{rec.title}</Text>
                                    <Text style={pdfStyles.recommendationDesc}>{rec.description}</Text>
                                </View>
                            ))}
                        </>
                    ) : null}
                </>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            <PdfFooter pageNumber={5} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    // Topics + Competitors
    pages.push(
        <Page key="topics" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.contentTopics} chapter="structure" />
            {topicsChart ? (
                <PdfVisualSpec spec={topicsChart} />
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            <PdfSectionHeader title={labels.competitorComparison} chapter="competitors" />
            {competitorChart ? (
                <PdfVisualSpec spec={competitorChart} />
            ) : (
                bundle.competitors
                    .filter((c) => c.status === 'complete')
                    .map((c) => (
                        <View key={c.domain} style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>{c.domain}</Text>
                            <Text style={pdfStyles.tableValue}>
                                WCAG {c.wcagScore} · SEO {c.seoOnPageScore}
                            </Text>
                        </View>
                    ))
            )}
            <PdfFooter pageNumber={6} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    // Action plan
    pages.push(
        <Page key="actions" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.actionPlan} chapter="summary" />
            {narrative?.recommendations && narrative.recommendations.length > 0 ? (
                narrative.recommendations.map((rec, i) => (
                    <View key={i} style={pdfStyles.recommendationRow}>
                        <Text style={pdfStyles.recommendationTitle}>
                            P{rec.priority}: {rec.title}
                        </Text>
                        <Text style={pdfStyles.recommendationDesc}>{rec.description}</Text>
                        <Text style={pdfStyles.metaText}>{rec.evidenceIds.join(', ')}</Text>
                    </View>
                ))
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            {bundle.journey ? (
                <>
                    <PdfSectionHeader title={labels.journeySummary} chapter="ux" />
                    <Text style={pdfStyles.bodyText}>
                        {bundle.journey.url} — {bundle.journey.task}
                    </Text>
                    {bundle.journey.summary ? (
                        <Text style={pdfStyles.bodyText}>{bundle.journey.summary}</Text>
                    ) : null}
                </>
            ) : null}
            <PdfFooter pageNumber={7} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    deepPages.forEach((deepPage, i) => {
        const pageNum = 8 + i;
        const deepChildren = (deepPage.props as { children?: React.ReactNode }).children;
        pages.push(
            React.cloneElement(deepPage, {}, [
                ...React.Children.toArray(deepChildren),
                <PdfFooter
                    key="footer"
                    pageNumber={pageNum}
                    totalPages={totalPages}
                    title={labels.footerTitle}
                    locale={bundle.locale}
                />,
            ])
        );
    });

    // Appendix (+ technical for full variant)
    pages.push(
        <Page key="appendix" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.appendix} chapter="infra" />
            <PdfSectionHeader title={labels.dataSources} chapter="infra" />
            {bundle.freshness.sources.map((src) => (
                <View key={src.key} style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.tableLabel}>{src.label}</Text>
                    <Text style={pdfStyles.tableValue}>
                        {src.available && src.updatedAt
                            ? new Date(src.updatedAt).toLocaleString(dateLocale)
                            : labels.noData}
                    </Text>
                </View>
            ))}
            <View style={pdfStyles.tableRow}>
                <Text style={pdfStyles.tableLabel}>Project</Text>
                <Text style={pdfStyles.tableValue}>{bundle.links.projectPath}</Text>
            </View>
            {bundle.links.domainScanPath ? (
                <View style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.tableLabel}>Deep Scan</Text>
                    <Text style={pdfStyles.tableValue}>{bundle.links.domainScanPath}</Text>
                </View>
            ) : null}
            {bundle.links.geoRunPath ? (
                <View style={pdfStyles.tableRow}>
                    <Text style={pdfStyles.tableLabel}>GEO Run</Text>
                    <Text style={pdfStyles.tableValue}>{bundle.links.geoRunPath}</Text>
                </View>
            ) : null}
            <View style={pdfStyles.tableRow}>
                <Text style={pdfStyles.tableLabel}>Rankings</Text>
                <Text style={pdfStyles.tableValue}>{bundle.links.rankingsPath}</Text>
            </View>
            {(bundle.variant === 'full' || bundle.variant === 'comprehensive') && bundle.rankings ? (
                <>
                    <PdfSectionHeader title={labels.technicalAppendix} chapter="issues" />
                    {bundle.rankings.topKeywords.map((kw) => (
                        <View key={kw.id} style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>{kw.keyword}</Text>
                            <Text style={pdfStyles.tableValue}>
                                {kw.position != null ? `#${kw.position}` : '–'}
                            </Text>
                        </View>
                    ))}
                    {bundle.domain?.systemicIssues.map((issue) => (
                        <View key={issue.issueId} style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>{issue.title}</Text>
                            <Text style={pdfStyles.tableValue}>{issue.count}</Text>
                        </View>
                    ))}
                </>
            ) : null}
            <PdfFooter pageNumber={8 + deepPages.length} totalPages={totalPages} title={labels.footerTitle} locale={bundle.locale} />
        </Page>
    );

    return <Document>{pages}</Document>;
}
