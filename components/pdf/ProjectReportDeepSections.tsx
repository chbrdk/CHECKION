'use client';

import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import type { SectionAnalysis } from '@/lib/project-report/narrative-schema';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfHeader, PdfSectionHeader } from '@/components/pdf/shared/PdfPrimitives';
import { PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

function SectionAnalysisBlock({ section }: { section: SectionAnalysis }) {
    return (
        <>
            <Text style={pdfStyles.subsectionTitle}>{section.title}</Text>
            <Text style={pdfStyles.bodyText}>{section.summary}</Text>
            {section.keyFindings.map((f, i) => (
                <View key={i} style={pdfStyles.bulletItem}>
                    <View style={pdfStyles.bulletDot} />
                    <Text style={pdfStyles.bodyText}>{f}</Text>
                </View>
            ))}
        </>
    );
}

export function buildDeepReportPages(
    bundle: ProjectReportBundle,
    labels: ProjectReportPdfLabels,
    visuals: {
        geoQuestionTrend?: VisualSpec;
        competitorRankingScores?: VisualSpec;
        rankTrend?: VisualSpec;
    }
): React.ReactElement[] {
    const deep = bundle.deep;
    if (!deep) return [];

    const pages: React.ReactElement[] = [];
    const narrative = bundle.narrative;
    const sections = narrative?.sections ?? deep.sections;

    pages.push(
        <Page key="metrics" size="A4" style={pdfStyles.page}>
            <PdfHeader />
            <PdfSectionHeader title={labels.metricsOverview} chapter="summary" />
            {deep.metrics.slice(0, 24).map((m) => (
                <View key={m.id} style={pdfStyles.tableRow}>
                    <Text style={[pdfStyles.tableLabel, { width: 200 }]}>{m.label}</Text>
                    <Text style={pdfStyles.tableValue}>
                        {m.value != null ? `${m.value}${m.unit ?? ''}` : '–'}
                        {m.benchmark ? ` (${m.benchmark})` : ''}
                    </Text>
                </View>
            ))}
        </Page>
    );

    if (narrative?.findings && narrative.findings.length > 0) {
        pages.push(
            <Page key="findings" size="A4" style={pdfStyles.page}>
                <PdfHeader />
                <PdfSectionHeader title={labels.keyFindings} chapter="summary" />
                {narrative.findings.map((f, i) => (
                    <View key={i} style={pdfStyles.recommendationRow}>
                        <Text style={pdfStyles.recommendationTitle}>
                            [{f.severity ?? 'info'}] {f.title}
                        </Text>
                        <Text style={pdfStyles.recommendationDesc}>{f.description}</Text>
                    </View>
                ))}
            </Page>
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
            <Page key={`section-${key}`} size="A4" style={pdfStyles.page}>
                <PdfHeader />
                <PdfSectionHeader title={labels.sectionAnalysis} chapter="ux" />
                <SectionAnalysisBlock section={section} />
            </Page>
        );
    }

    if (deep.rankKeywordDetails.length > 0) {
        pages.push(
            <Page key="keywords" size="A4" style={pdfStyles.page}>
                <PdfHeader />
                <PdfSectionHeader title={labels.keywordDetails} chapter="seo" />
                {visuals.competitorRankingScores ? (
                    <PdfVisualSpec spec={visuals.competitorRankingScores} />
                ) : null}
                {deep.rankKeywordDetails.slice(0, 15).map((kw) => (
                    <View key={kw.id} style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableLabel, { width: 160 }]}>{kw.keyword}</Text>
                        <Text style={pdfStyles.tableValue}>
                            {kw.position != null ? `#${kw.position}` : '–'}
                            {kw.positionDelta != null
                                ? ` (${kw.positionDelta > 0 ? '+' : ''}${kw.positionDelta})`
                                : ''}
                            {kw.serpLeaderDomain ? ` · leader: ${kw.serpLeaderDomain}` : ''}
                        </Text>
                    </View>
                ))}
                {visuals.rankTrend ? <PdfVisualSpec spec={visuals.rankTrend} /> : null}
            </Page>
        );
    }

    if (deep.geoQuestionHistory.length > 0 || deep.geoPages.length > 0) {
        pages.push(
            <Page key="geo-deep" size="A4" style={pdfStyles.page}>
                <PdfHeader />
                {deep.geoQuestionHistory.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.geoQuestionHistory} chapter="geo" />
                        {visuals.geoQuestionTrend ? (
                            <PdfVisualSpec spec={visuals.geoQuestionTrend} />
                        ) : null}
                        {deep.geoQuestionHistory.slice(0, 10).map((q) => (
                            <View key={q.queryIndex} style={pdfStyles.tableRow}>
                                <Text style={[pdfStyles.tableLabel, { width: 200 }]}>
                                    {q.queryText.slice(0, 50)}
                                </Text>
                                <Text style={pdfStyles.tableValue}>
                                    {q.latestPosition != null ? `#${q.latestPosition}` : '–'} · {q.trend}
                                </Text>
                            </View>
                        ))}
                    </>
                ) : null}
                {deep.geoPages.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.geoPageAnalysis} chapter="geo" />
                        {deep.geoPages.slice(0, 8).map((p) => (
                            <View key={p.url} style={pdfStyles.recommendationRow}>
                                <Text style={pdfStyles.recommendationTitle}>
                                    {p.title ?? p.url}
                                </Text>
                                <Text style={pdfStyles.recommendationDesc}>
                                    GEO {p.geoFitnessScore ?? '–'} · T{p.trustScore ?? '–'} E
                                    {p.experienceScore ?? '–'} X{p.expertiseScore ?? '–'}
                                </Text>
                            </View>
                        ))}
                    </>
                ) : null}
            </Page>
        );
    }

    if (deep.issueGroups.length > 0 || deep.seoRollup) {
        pages.push(
            <Page key="issues-seo" size="A4" style={pdfStyles.page}>
                <PdfHeader />
                {deep.issueGroups.length > 0 ? (
                    <>
                        <PdfSectionHeader title={labels.issueGroups} chapter="issues" />
                        {deep.issueGroups.map((g) => (
                            <View key={g.groupKey} style={pdfStyles.tableRow}>
                                <Text style={[pdfStyles.tableLabel, { width: 200 }]}>{g.title}</Text>
                                <Text style={pdfStyles.tableValue}>
                                    {g.pageCount} pages · {g.type}
                                    {g.wcagLevel ? ` · ${g.wcagLevel}` : ''}
                                </Text>
                            </View>
                        ))}
                    </>
                ) : null}
                {deep.seoRollup ? (
                    <>
                        <PdfSectionHeader title={labels.seoTechnical} chapter="seo" />
                        {(
                            [
                                ['Missing title', deep.seoRollup.pagesMissingTitle],
                                ['Missing meta', deep.seoRollup.pagesMissingMeta],
                                ['Missing H1', deep.seoRollup.pagesMissingH1],
                                ['Duplicate titles', deep.seoRollup.duplicateTitles],
                                ['Broken links', deep.seoRollup.brokenLinksCount],
                                ['JSON-LD pages', deep.seoRollup.jsonLdPages],
                            ] as const
                        ).map(([label, value]) => (
                            <View key={label} style={pdfStyles.tableRow}>
                                <Text style={pdfStyles.tableLabel}>{label}</Text>
                                <Text style={pdfStyles.tableValue}>{value ?? '–'}</Text>
                            </View>
                        ))}
                    </>
                ) : null}
            </Page>
        );
    }

    return pages;
}
