'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    getSiteQualitySectionAnalysis,
    resolveSiteQualityInterpretations,
    systemicIssueDescription,
} from '@/lib/project-report/site-quality-interpretations';
import { PdfSectionHeader, PdfSectionIntro } from '@/components/pdf/shared/PdfPrimitives';
import { PdfLeadText, PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import { PdfMetricInterpretationBlock, PdfRecommendationRow } from '@/components/pdf/shared/PdfMetricInterpretation';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

export function ProjectReportQualitySection({
    bundle,
    labels,
}: {
    bundle: ProjectReportBundle;
    labels: ProjectReportPdfLabels;
}) {
    const domain = bundle.domain;
    if (!domain) {
        return <Text style={pdfStyles.metaText}>{labels.noData}</Text>;
    }

    const siteQuality = getSiteQualitySectionAnalysis(bundle);
    const interpretations = resolveSiteQualityInterpretations(bundle);
    const keyFindings = siteQuality?.keyFindings ?? [];

    return (
        <>
            <PdfStatGrid
                items={[
                    { label: labels.domainScore, value: `${domain.score}/100`, accent: '#B91C1C' },
                    { label: labels.pages, value: String(domain.totalPageCount) },
                    {
                        label: labels.wcagErrors,
                        value: `${domain.issueStats.errors} / ${domain.issueStats.warnings}`,
                    },
                    ...(domain.eco?.avgCo2 != null
                        ? [{ label: labels.eco, value: `${domain.eco.avgCo2}g` }]
                        : []),
                ]}
            />

            {interpretations.domainScore ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.domainScore}`}
                    text={interpretations.domainScore}
                />
            ) : null}

            {interpretations.wcagErrors ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.wcagErrors}`}
                    text={interpretations.wcagErrors}
                />
            ) : null}

            {domain.performance ? (
                <View style={pdfStyles.contentPanel}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.performance}</Text>
                    <Text style={pdfStyles.bodyText}>
                        TTFB {domain.performance.avgTtfb ?? '–'} · FCP{' '}
                        {domain.performance.avgFcp ?? '–'} · LCP {domain.performance.avgLcp ?? '–'}
                    </Text>
                    {interpretations.performance ? (
                        <PdfMetricInterpretationBlock
                            label={`${labels.agentAssessment}: ${labels.performance}`}
                            text={interpretations.performance}
                        />
                    ) : null}
                </View>
            ) : null}

            {domain.eco?.avgCo2 != null && interpretations.eco ? (
                <PdfMetricInterpretationBlock
                    label={`${labels.agentAssessment}: ${labels.eco}`}
                    text={interpretations.eco}
                />
            ) : null}

            {siteQuality?.summary ? (
                <View style={[pdfStyles.contentPanel, { marginTop: 8 }]}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.agentAssessment}</Text>
                    <PdfLeadText>{siteQuality.summary}</PdfLeadText>
                </View>
            ) : null}

            {domain.systemicIssues.length > 0 ? (
                <>
                    <PdfSectionHeader title={labels.systemicIssues} chapter="issues" />
                    <PdfSectionIntro text={labels.chapterIntros.systemicIssues} />
                    {interpretations.systemicIssues ? (
                        <PdfMetricInterpretationBlock
                            label={labels.agentAssessment}
                            text={interpretations.systemicIssues}
                        />
                    ) : null}
                    {domain.systemicIssues.map((issue) => (
                        <PdfRecommendationRow
                            key={issue.issueId}
                            title={issue.title}
                            description={systemicIssueDescription(issue, keyFindings, bundle.locale)}
                        />
                    ))}
                </>
            ) : null}
        </>
    );
}
