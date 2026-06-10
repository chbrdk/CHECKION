'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ProjectReportBundle } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { buildEchonMarketPdfContent } from '@/lib/project-report/pdf-echon-display';
import { PdfLeadText, PdfStatGrid } from '@/components/pdf/shared/PdfLayout';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';

interface ProjectReportMarketSectionProps {
    bundle: ProjectReportBundle;
    labels: ProjectReportPdfLabels;
}

function BulletList({ items }: { items: string[] }) {
    if (items.length === 0) return null;
    return (
        <View style={pdfStyles.contentPanel}>
            {items.map((item, i) => (
                <View key={i} style={pdfStyles.bulletItem}>
                    <View style={pdfStyles.bulletDot} />
                    <Text style={pdfStyles.bodyText}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

export function ProjectReportMarketSection({ bundle, labels }: ProjectReportMarketSectionProps) {
    const content = buildEchonMarketPdfContent(bundle.marketContext, {
        executiveSummaryNarrative: bundle.narrative?.executiveSummary,
    });

    if (!content.show) return null;

    const metaStats: { label: string; value: string }[] = [];
    if (content.citationCount != null && content.citationCount > 0) {
        metaStats.push({
            label: labels.marketSignalsSources,
            value: String(content.citationCount),
        });
    }
    if (content.confidence != null) {
        metaStats.push({
            label: labels.marketSignalsConfidence,
            value: `${Math.round(content.confidence * 100)}%`,
        });
    }

    return (
        <>
            <Text style={pdfStyles.metaText}>{labels.marketSignalsSource}</Text>
            {metaStats.length > 0 ? <PdfStatGrid items={metaStats} /> : null}
            {content.executiveSummary ? (
                <PdfLeadText>{content.executiveSummary}</PdfLeadText>
            ) : null}
            {content.implications ? (
                <View style={pdfStyles.contentPanel}>
                    <Text style={pdfStyles.subsectionTitle}>{labels.marketSignalsImplications}</Text>
                    <Text style={pdfStyles.bodyText}>{content.implications}</Text>
                </View>
            ) : null}
            {content.keyFindings.length > 0 ? (
                <>
                    <Text style={pdfStyles.subsectionTitle}>{labels.marketSignalsFindings}</Text>
                    <BulletList items={content.keyFindings} />
                </>
            ) : null}
            {content.watchlist.length > 0 ? (
                <>
                    <Text style={pdfStyles.subsectionTitle}>{labels.marketSignalsWatchlist}</Text>
                    <BulletList items={content.watchlist} />
                </>
            ) : null}
            {content.contradictions.length > 0 ? (
                <>
                    <Text style={pdfStyles.subsectionTitle}>{labels.marketSignalsContradictions}</Text>
                    <BulletList items={content.contradictions} />
                </>
            ) : null}
            {content.evidenceGaps.length > 0 ? (
                <>
                    <Text style={pdfStyles.subsectionTitle}>{labels.marketSignalsEvidenceGaps}</Text>
                    <BulletList items={content.evidenceGaps} />
                </>
            ) : null}
        </>
    );
}

export function shouldShowMarketSignalsPage(bundle: ProjectReportBundle): boolean {
    return buildEchonMarketPdfContent(bundle.marketContext, {
        executiveSummaryNarrative: bundle.narrative?.executiveSummary,
    }).show;
}
