'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    getSeoSectionAnalysis,
    keywordInsightDescription,
    resolveSeoInterpretations,
} from '@/lib/project-report/seo-rankings-interpretations';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfLeadText, PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import {
    PdfMetricInterpretationGroup,
    pdfInterpretationTexts,
    PdfRecommendationRow,
} from '@/components/pdf/shared/PdfMetricInterpretation';
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
    const seoSection = getSeoSectionAnalysis(bundle);
    const interpretations = resolveSeoInterpretations(bundle);
    const keyFindings = seoSection?.keyFindings ?? [];

    if (!domain && !rankings) {
        return <Text style={pdfStyles.metaText}>{labels.noData}</Text>;
    }

    return (
        <>
            {domain ? (
                <>
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
                        texts={pdfInterpretationTexts(interpretations.seoOnPage)}
                    />
                </>
            ) : null}

            {rankings ? (
                <>
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
                        texts={pdfInterpretationTexts(interpretations.rankingScore)}
                    />

                    <PdfSectionHeader title={labels.keywords} chapter="seo" />
                    <PdfSectionIntro text={labels.chapterIntros.keywords} />
                    <PdfMetricInterpretationGroup texts={pdfInterpretationTexts(interpretations.keywords)} />
                    {rankingChart}
                    {rankings.topKeywords.slice(0, 5).map((kw) => {
                        const insight = keywordInsightDescription(
                            kw.keyword,
                            kw.position,
                            keyFindings,
                            bundle.locale
                        );
                        if (!insight) return null;
                        return (
                            <PdfRecommendationRow
                                key={kw.id}
                                title={`${kw.keyword}${kw.position != null ? ` · #${kw.position}` : ''}`}
                                description={insight}
                            />
                        );
                    })}
                </>
            ) : domain ? null : (
                <Text style={pdfStyles.metaText}>{labels.noData}</Text>
            )}

            {seoSection?.summary ? (
                <View style={[pdfStyles.contentPanel, { marginTop: 8 }]}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.agentAssessment}</Text>
                    <PdfLeadText>{seoSection.summary}</PdfLeadText>
                </View>
            ) : null}

            {rankTrendChart ? (
                <>
                    <PdfSectionHeader title={labels.rankTrends} chapter="seo" />
                    <PdfSectionIntro text={labels.chapterIntros.rankTrends} />
                    <PdfMetricInterpretationGroup texts={pdfInterpretationTexts(interpretations.rankTrend)} />
                    {rankTrendChart}
                </>
            ) : null}
        </>
    );
}
