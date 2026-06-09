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
import {
    PdfMetricInterpretationGroup,
    pdfInterpretationTexts,
    PdfRecommendationRow,
} from '@/components/pdf/shared/PdfMetricInterpretation';
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

            <PdfMetricInterpretationGroup
                texts={pdfInterpretationTexts(interpretations.domainScore, interpretations.wcagErrors)}
            />

            {domain.performance ? (
                <View style={pdfStyles.contentPanel}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.performance}</Text>
                    <Text style={pdfStyles.bodyText}>
                        TTFB {domain.performance.avgTtfb ?? '–'} · FCP{' '}
                        {domain.performance.avgFcp ?? '–'} · LCP {domain.performance.avgLcp ?? '–'}
                    </Text>
                    <PdfMetricInterpretationGroup
                        texts={pdfInterpretationTexts(interpretations.performance)}
                    />
                </View>
            ) : null}

            {domain.eco?.avgCo2 != null ? (
                <PdfMetricInterpretationGroup texts={pdfInterpretationTexts(interpretations.eco)} />
            ) : null}

            {siteQuality?.summary ? (
                <View style={[pdfStyles.contentPanel, { marginTop: 8 }]}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.agentAssessment}</Text>
                    <PdfLeadText>{siteQuality.summary}</PdfLeadText>
                </View>
            ) : null}

            {domain.systemicIssues.length > 0 ? (
                <>
                    <PdfSectionHeader
                        outlineId="quality.systemic-issues"
                        level={1}
                        title={labels.systemicIssues}
                        chapter="issues"
                    />
                    <PdfSectionIntro text={labels.chapterIntros.systemicIssues} />
                    <PdfMetricInterpretationGroup
                        texts={pdfInterpretationTexts(interpretations.systemicIssues)}
                    />
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
