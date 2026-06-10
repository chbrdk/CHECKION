'use client';

import React from 'react';
import { Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { resolveSeoInterpretations } from '@/lib/project-report/seo-rankings-interpretations';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import {
    PdfMetricInterpretationGroup,
    pdfInterpretationTexts,
} from '@/components/pdf/shared/PdfMetricInterpretation';
import { selectKeywordSerpRows } from '@/lib/project-report/pdf-competitive-display';
import { PdfKeywordSerpTable } from '@/components/pdf/shared/PdfCompetitiveTables';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

export function ProjectReportSeoSection({
    bundle,
    labels,
    rankingChart,
    rankTrendChart,
}: {
    bundle: ProjectReportBundle;
    labels: ProjectReportPdfLabels;
    rankingChart?: React.ReactNode;
    rankTrendChart?: React.ReactNode;
}) {
    const domain = bundle.domain;
    const rankings = bundle.rankings;
    const interpretations = resolveSeoInterpretations(bundle);
    const rankKeywordDetails = bundle.deep?.rankKeywordDetails ?? [];
    const hasSerpTable = rankKeywordDetails.length > 0;

    if (!domain && !rankings) {
        return <Text style={pdfStyles.metaText}>{labels.noData}</Text>;
    }

    return (
        <>
            {domain ? (
                <>
                    <PdfSectionHeader
                        outlineId="seo.on-page"
                        level={1}
                        title={labels.seoOnPageSection}
                        chapter="seo"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.seoOnPage} />
                    <PdfStatGrid
                        items={[
                            {
                                label: labels.seoOnPage,
                                value: `${domain.seoOnPageScore}/100`,
                                accent: '#047857',
                            },
                            { label: labels.seoOnPageLabel, value: domain.seoOnPageLabel },
                        ]}
                    />
                    <PdfMetricInterpretationGroup
                        texts={pdfInterpretationTexts(
                            interpretations.seoOnPageOverview,
                            interpretations.seoOnPage
                        )}
                    />
                </>
            ) : null}

            {rankings ? (
                <>
                    <PdfSectionHeader
                        outlineId="seo.serp-rankings"
                        level={1}
                        title={labels.serpKeywordRankings}
                        chapter="seo"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.serpRankings} />
                    <PdfStatGrid
                        items={[
                            {
                                label: labels.rankingScore,
                                value: rankings.score != null ? `${rankings.score}/100` : '–',
                            },
                            {
                                label: labels.keywords,
                                value: String(rankings.keywordCount),
                            },
                        ]}
                    />
                    <PdfMetricInterpretationGroup
                        texts={pdfInterpretationTexts(interpretations.serpRankingsOverview)}
                    />
                    {rankingChart}
                    {hasSerpTable ? (
                        <>
                            <PdfMetricInterpretationGroup
                                texts={pdfInterpretationTexts(interpretations.serpCompetition)}
                            />
                            <PdfKeywordSerpTable
                                rows={selectKeywordSerpRows(rankKeywordDetails)}
                                labels={labels}
                            />
                        </>
                    ) : null}
                </>
            ) : null}

            {rankTrendChart ? (
                <>
                    <PdfSectionHeader
                        outlineId="seo.rank-trends"
                        level={1}
                        title={labels.rankTrends}
                        chapter="seo"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.rankTrends} />
                    <PdfMetricInterpretationGroup texts={pdfInterpretationTexts(interpretations.rankTrend)} />
                    {rankTrendChart}
                </>
            ) : null}
        </>
    );
}
