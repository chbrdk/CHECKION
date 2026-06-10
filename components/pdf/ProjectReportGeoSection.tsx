'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    geoInsightDescription,
    getGeoSectionAnalysis,
    resolveGeoInterpretations,
} from '@/lib/project-report/geo-interpretations';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import {
    PdfMetricInterpretationGroup,
    pdfInterpretationTexts,
    PdfRecommendationRow,
} from '@/components/pdf/shared/PdfMetricInterpretation';
import { selectGeoInsightsForPdf } from '@/lib/project-report/pdf-geo-display';
import { sortGeoCompetitiveDomains } from '@/lib/project-report/pdf-competitive-display';
import { PdfGeoCompetitiveTable } from '@/components/pdf/shared/PdfCompetitiveTables';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

export function ProjectReportGeoSection({
    bundle,
    labels,
    geoModelVisibilityChart,
    geoCompetitiveChart,
}: {
    bundle: ProjectReportBundle;
    labels: ProjectReportPdfLabels;
    geoModelVisibilityChart?: React.ReactNode;
    geoCompetitiveChart?: React.ReactNode;
}) {
    const geo = bundle.geo;
    const geoDeep = bundle.deep?.geoDeep;
    const geoSection = getGeoSectionAnalysis(bundle);
    const interpretations = resolveGeoInterpretations(bundle);
    const keyFindings = geoSection?.keyFindings ?? [];

    if (!geo) {
        return <Text style={pdfStyles.metaText}>{labels.noData}</Text>;
    }

    return (
        <>
            <PdfStatGrid
                items={[
                    {
                        label: labels.geoScore,
                        value: geo.score != null ? `${geo.score}/100` : '–',
                        accent: '#0891B2',
                    },
                    ...(geoDeep
                        ? [
                              {
                                  label: labels.llmModels,
                                  value: String(geoDeep.summary.modelCount),
                              },
                              {
                                  label: labels.geoQuestionAnalysis,
                                  value: String(geoDeep.summary.questionCount),
                              },
                              {
                                  label: labels.geoOnPageEeat,
                                  value: String(geoDeep.summary.pageCount),
                              },
                          ]
                        : []),
                ]}
            />

            <PdfMetricInterpretationGroup
                texts={pdfInterpretationTexts(
                    interpretations.geoScore,
                    interpretations.llmVisibility,
                    interpretations.geoQuestions,
                    interpretations.geoOnPageEeat,
                )}
            />

            {geoModelVisibilityChart ? (
                <>
                    <PdfSectionHeader
                        outlineId="geo.model-benchmark"
                        level={1}
                        title={labels.geoModelBenchmark}
                        chapter="geo"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.geoModelVisibility} />
                    {geoModelVisibilityChart}
                </>
            ) : null}

            {geoCompetitiveChart ? (
                <>
                    <PdfSectionHeader
                        outlineId="geo.competitive"
                        level={1}
                        title={labels.competitorComparison}
                        chapter="geo"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.geoCompetitive} />
                    {geoCompetitiveChart}
                    <PdfMetricInterpretationGroup
                        texts={pdfInterpretationTexts(interpretations.geoCompetitive)}
                    />
                    <PdfGeoCompetitiveTable
                        domains={sortGeoCompetitiveDomains(geo.competitiveDomains)}
                        labels={labels}
                    />
                </>
            ) : null}

            {geoDeep && geoDeep.deterministicInsights.length > 0 ? (
                <>
                    <PdfSectionHeader outlineId="geo.insights" level={1} title={labels.geoInsights} chapter="geo" />
                    <PdfSectionIntro text={labels.chapterIntros.geoInsights} />
                    <PdfMetricInterpretationGroup
                        texts={pdfInterpretationTexts(interpretations.geoInsights)}
                    />
                    {selectGeoInsightsForPdf(geoDeep.deterministicInsights).map((ins) => (
                        <PdfRecommendationRow
                            key={ins.id}
                            title={ins.title}
                            description={geoInsightDescription(ins, keyFindings, bundle.locale)}
                        />
                    ))}
                </>
            ) : null}

            {geo.recommendations.length > 0 && !(bundle.narrative?.recommendations?.length) ? (
                <>
                    <PdfSectionHeader
                        outlineId="geo.recommendations"
                        level={1}
                        title={labels.recommendations}
                        chapter="geo"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.geoRecommendations} />
                    {geo.recommendations.map((rec, i) => (
                        <PdfRecommendationRow
                            key={i}
                            title={`${rec.priority != null ? `P${rec.priority}: ` : ''}${rec.title}`}
                            description={rec.description}
                        />
                    ))}
                </>
            ) : null}
        </>
    );
}
