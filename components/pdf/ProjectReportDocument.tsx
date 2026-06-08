'use client';

import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import {
    MsqdxLogoPdf,
    PdfSectionHeader,
    RiskAmpelPills,
} from '@/components/pdf/shared/PdfPrimitives';
import {
    PdfChapterIntroPage,
    PdfContentPage,
    PdfStatGrid,
    PdfLeadText,
    applyReportFooters,
    isChapterIntroPage,
} from '@/components/pdf/shared/PdfLayout';
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

    const pages: React.ReactElement[] = [];

    // Cover
    pages.push(
        <Page key="cover" size="A4" style={pdfStyles.page}>
            <View style={pdfStyles.coverAccentBar} fixed />
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <View style={pdfStyles.coverLogoWrap}>
                    <MsqdxLogoPdf width={110} height={26} />
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
            </View>
        </Page>
    );

    // 01 Executive
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-executive"
            chapterNumber="01"
            title={labels.executiveSummary}
            subtitle={labels.chapterIntros.executive}
            chapter="summary"
        />
    );
    pages.push(
        <PdfContentPage key="executive">
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
        </PdfContentPage>
    );

    // 02 Site Quality
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-quality"
            chapterNumber="02"
            title={labels.siteQuality}
            subtitle={labels.chapterIntros.siteQuality}
            chapter="issues"
        />
    );
    pages.push(
        <PdfContentPage key="quality">
            <PdfSectionHeader title={labels.siteQuality} chapter="issues" />
            {bundle.domain ? (
                <>
                    <PdfStatGrid
                        items={[
                            { label: 'WCAG Score', value: `${bundle.domain.wcagScore}/100`, accent: '#B91C1C' },
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
        </PdfContentPage>
    );

    // 03 SEO
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-seo"
            chapterNumber="03"
            title={labels.seoRankings}
            subtitle={labels.chapterIntros.seo}
            chapter="seo"
        />
    );
    pages.push(
        <PdfContentPage key="seo">
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
        </PdfContentPage>
    );

    // 04 GEO
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-geo"
            chapterNumber="04"
            title={labels.geoEeat}
            subtitle={labels.chapterIntros.geo}
            chapter="geo"
        />
    );
    pages.push(
        <PdfContentPage key="geo">
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
                        ]}
                    />
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
        </PdfContentPage>
    );

    // 05 Topics & Competitors
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-topics"
            chapterNumber="05"
            title={labels.contentTopics}
            subtitle={labels.chapterIntros.topics}
            chapter="structure"
        />
    );
    pages.push(
        <PdfContentPage key="topics">
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
                                    WCAG {c.wcagScore} · SEO {c.seoOnPageScore}
                                </Text>
                            </View>
                        ))}
                </View>
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
        </PdfContentPage>
    );

    // 06 Actions
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-actions"
            chapterNumber="06"
            title={labels.actionPlan}
            subtitle={labels.chapterIntros.actions}
            chapter="summary"
        />
    );
    pages.push(
        <PdfContentPage key="actions">
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
        </PdfContentPage>
    );

    // 07+ Deep dive (comprehensive)
    if (deepPages.length > 0) {
        pages.push(
            <PdfChapterIntroPage
                key="ch-intro-deep"
                chapterNumber="07"
                title={labels.metricsOverview}
                subtitle={labels.chapterIntros.deepDive}
                chapter="visual"
            />
        );
        pages.push(...deepPages);
    }

    // Appendix
    pages.push(
        <PdfChapterIntroPage
            key="ch-intro-appendix"
            chapterNumber={deepPages.length > 0 ? '08' : '07'}
            title={labels.appendix}
            subtitle={labels.chapterIntros.appendix}
            chapter="infra"
        />
    );
    pages.push(
        <PdfContentPage key="appendix">
            <PdfSectionHeader title={labels.dataSources} chapter="infra" />
            <View style={pdfStyles.contentPanel}>
                {bundle.freshness.sources.map((src) => (
                    <View key={src.key} style={pdfStyles.dataTableRow}>
                        <Text style={[pdfStyles.tableLabel, { width: '45%' }]}>{src.label}</Text>
                        <Text style={pdfStyles.tableValue}>
                            {src.available && src.updatedAt
                                ? new Date(src.updatedAt).toLocaleString(dateLocale)
                                : labels.noData}
                        </Text>
                    </View>
                ))}
            </View>
            <PdfSectionHeader title="Links" chapter="infra" />
            <View style={pdfStyles.contentPanel}>
                <View style={pdfStyles.dataTableRow}>
                    <Text style={pdfStyles.tableLabel}>Project</Text>
                    <Text style={pdfStyles.tableValue}>{bundle.links.projectPath}</Text>
                </View>
                {bundle.links.domainScanPath ? (
                    <View style={pdfStyles.dataTableRow}>
                        <Text style={pdfStyles.tableLabel}>Deep Scan</Text>
                        <Text style={pdfStyles.tableValue}>{bundle.links.domainScanPath}</Text>
                    </View>
                ) : null}
                {bundle.links.geoRunPath ? (
                    <View style={pdfStyles.dataTableRow}>
                        <Text style={pdfStyles.tableLabel}>GEO Run</Text>
                        <Text style={pdfStyles.tableValue}>{bundle.links.geoRunPath}</Text>
                    </View>
                ) : null}
                <View style={pdfStyles.dataTableRow}>
                    <Text style={pdfStyles.tableLabel}>Rankings</Text>
                    <Text style={pdfStyles.tableValue}>{bundle.links.rankingsPath}</Text>
                </View>
            </View>
            {(bundle.variant === 'full' || bundle.variant === 'comprehensive') && bundle.rankings ? (
                <>
                    <PdfSectionHeader title={labels.technicalAppendix} chapter="issues" />
                    <View style={pdfStyles.contentPanel}>
                        {bundle.rankings.topKeywords.map((kw) => (
                            <View key={kw.id} style={pdfStyles.dataTableRow}>
                                <Text style={[pdfStyles.tableLabel, { width: '55%' }]}>{kw.keyword}</Text>
                                <Text style={pdfStyles.tableValue}>
                                    {kw.position != null ? `#${kw.position}` : '–'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            ) : null}
        </PdfContentPage>
    );

    const finalPages = applyReportFooters(pages, {
        title: labels.footerTitle,
        locale: bundle.locale,
        skipFooter: (page, index) => index === 0 || isChapterIntroPage(page),
    });

    return <Document>{finalPages}</Document>;
}
