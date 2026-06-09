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
import { PdfLeadText, PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import { PdfMetricInterpretationBlock, PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
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

            {interpretations.geoScore ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.geoScore}`}
                    text={interpretations.geoScore}
                />
            ) : null}

            {interpretations.llmVisibility ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.llmModels}`}
                    text={interpretations.llmVisibility}
                />
            ) : null}

            {interpretations.geoQuestions ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.geoQuestionAnalysis}`}
                    text={interpretations.geoQuestions}
                />
            ) : null}

            {interpretations.geoOnPageEeat ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.geoOnPageEeat}`}
                    text={interpretations.geoOnPageEeat}
                />
            ) : null}

            {geoSection?.summary ? (
                <View style={[pdfStyles.contentPanel, { marginTop: 8 }]}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.agentAssessment}</Text>
                    <PdfLeadText>{geoSection.summary}</PdfLeadText>
                </View>
            ) : null}

            {geoModelVisibilityChart ? (
                <>
                    <PdfSectionHeader title={labels.geoModelBenchmark} chapter="geo" />
                    <PdfSectionIntro text={labels.chapterIntros.geoModelVisibility} />
                    {geoModelVisibilityChart}
                </>
            ) : null}

            {geoCompetitiveChart ? (
                <>
                    <PdfSectionHeader title={labels.competitorComparison} chapter="geo" />
                    <PdfSectionIntro text={labels.chapterIntros.geoCompetitive} />
                    {interpretations.geoCompetitive ? (
                        <PdfMetricInterpretationBlock
                            label={labels.agentAssessment}
                            text={interpretations.geoCompetitive}
                        />
                    ) : null}
                    {geoCompetitiveChart}
                </>
            ) : null}

            {geoDeep && geoDeep.deterministicInsights.length > 0 ? (
                <>
                    <PdfSectionHeader title={labels.geoInsights} chapter="geo" />
                    <PdfSectionIntro text={labels.chapterIntros.geoInsights} />
                    {interpretations.geoInsights ? (
                        <PdfMetricInterpretationBlock
                            label={labels.agentAssessment}
                            text={interpretations.geoInsights}
                        />
                    ) : null}
                    {geoDeep.deterministicInsights.slice(0, 5).map((ins) => (
                        <PdfRecommendationRow
                            key={ins.id}
                            title={ins.title}
                            description={geoInsightDescription(ins, keyFindings, bundle.locale)}
                        />
                    ))}
                </>
            ) : null}

            {geo.recommendations.length > 0 ? (
                <>
                    <PdfSectionHeader title={labels.recommendations} chapter="geo" />
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
