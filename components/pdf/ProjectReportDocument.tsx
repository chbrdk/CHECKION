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
import { PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
import { PdfSectionHeader, PdfSectionIntro, RiskAmpelPills } from '@/components/pdf/shared/PdfPrimitives';
import { PdfScoreCardsFromSpec, PdfVisualSpec } from '@/components/pdf/charts/PdfChartComponents';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { buildDeepReportPages } from '@/components/pdf/ProjectReportDeepSections';
import { buildAudienceReportPages } from '@/components/pdf/ProjectReportAudienceSections';
import { ProjectReportQualitySection } from '@/components/pdf/ProjectReportQualitySection';
import { ProjectReportSeoSection } from '@/components/pdf/ProjectReportSeoSection';
import { ProjectReportGeoSection } from '@/components/pdf/ProjectReportGeoSection';
import { PdfTableOfContents } from '@/components/pdf/shared/PdfTableOfContents';
import {
    insertProjectReportTableOfContents,
    type PdfTocResolvedEntry,
} from '@/lib/paths/pdf-table-of-contents';
import { buildProjectReportOutline } from '@/lib/paths/pdf-chapter-numbering';
import { PdfChapterNumberingProvider } from '@/components/pdf/shared/PdfChapterNumbering';
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
            <PdfSectionHeader outlineId="executive" title={labels.executiveSummary} chapter="summary" />
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
                    <PdfSectionHeader
                        outlineId="executive.competitors"
                        level={1}
                        title={labels.competitorComparison}
                        chapter="competitors"
                    />
                    <PdfLeadText>{narrative.competitiveLandscape}</PdfLeadText>
                </View>
            ) : null}
            {bundle.domain?.llmSummary?.summary ? (
                <View style={pdfStyles.contentPanel}>
                    <PdfSectionHeader
                        outlineId="executive.domain-summary"
                        level={1}
                        title="Domain Summary"
                        chapter="ux"
                    />
                    <PdfLeadText>{bundle.domain.llmSummary.summary}</PdfLeadText>
                </View>
            ) : null}
        </>
    );

    pages = pushContent(
        pages,
        'quality',
        <>
            <PdfSectionHeader outlineId="quality" title={labels.siteQuality} chapter="issues" />
            <PdfSectionIntro text={labels.chapterIntros.siteQuality} />
            <ProjectReportQualitySection bundle={bundle} labels={labels} />
        </>
    );

    pages = pushContent(
        pages,
        'seo',
        <>
            <PdfSectionHeader outlineId="seo" title={labels.seoRankings} chapter="seo" />
            <PdfSectionIntro text={labels.chapterIntros.seo} />
            <ProjectReportSeoSection
                bundle={bundle}
                labels={labels}
                rankingChart={rankingChart ? <PdfVisualSpec spec={rankingChart} /> : undefined}
                rankTrendChart={rankTrend ? <PdfVisualSpec spec={rankTrend} /> : undefined}
            />
        </>
    );

    pages = pushContent(
        pages,
        'geo',
        <>
            <PdfSectionHeader outlineId="geo" title={labels.geoEeat} chapter="geo" />
            <PdfSectionIntro text={labels.chapterIntros.geo} />
            <ProjectReportGeoSection
                bundle={bundle}
                labels={labels}
                geoModelVisibilityChart={
                    geoModelVisibility ? <PdfVisualSpec spec={geoModelVisibility} /> : undefined
                }
                geoCompetitiveChart={geoChart ? <PdfVisualSpec spec={geoChart} /> : undefined}
            />
        </>
    );

    pages = pushContent(
        pages,
        'topics',
        <>
            <PdfSectionHeader outlineId="topics" title={labels.contentTopics} chapter="structure" />
            <PdfSectionIntro text={labels.chapterIntros.topics} />
            {topicsChart ? (
                <PdfVisualSpec spec={topicsChart} />
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            <PdfSectionHeader
                outlineId="topics.competitors"
                level={1}
                title={labels.competitorComparison}
                chapter="competitors"
            />
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
            <PdfSectionHeader outlineId="actions" title={labels.actionPlan} chapter="summary" />
            <PdfSectionIntro text={labels.chapterIntros.actions} />
            {narrative?.recommendations && narrative.recommendations.length > 0 ? (
                narrative.recommendations.map((rec, i) => (
                    <PdfRecommendationRow
                        key={i}
                        title={`P${rec.priority}: ${rec.title}`}
                        description={rec.description}
                    />
                ))
            ) : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}
            {bundle.journey ? (
                <View style={[pdfStyles.contentPanel, { marginTop: 12 }]}>
                    <PdfSectionHeader
                        outlineId="actions.journey"
                        level={1}
                        title={labels.journeySummary}
                        chapter="ux"
                    />
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
    const outline = buildProjectReportOutline(bundle, getProjectReportPdfLabels(bundle.locale));
    const pages = finalizeProjectReportPages(buildProjectReportPages(bundle), bundle);

    return (
        <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>
            <PdfChapterNumberingProvider outline={outline}>{pages}</PdfChapterNumberingProvider>
        </Document>
    );
}
