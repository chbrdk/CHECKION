'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { PdfFlatScoreCards } from '@/components/pdf/charts/PdfChartComponents';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

export function PdfProjectReportCoverContent({
    eyebrow,
    title,
    projectLine,
    scoreCards,
    leadText,
}: {
    eyebrow: string;
    title: string;
    projectLine: string;
    scoreCards?: Extract<VisualSpec, { kind: 'scoreCards' }>;
    leadText?: string | null;
}) {
    return (
        <>
            <Text style={pdfStyles.coverEyebrow}>{eyebrow}</Text>
            <Text style={pdfStyles.coverTitle}>{title}</Text>
            <View style={pdfStyles.coverUrlBox}>
                <Text style={pdfStyles.coverUrl}>{projectLine}</Text>
            </View>
            <PdfFlatScoreCards spec={scoreCards} />
            {leadText ? <Text style={pdfStyles.leadText}>{leadText}</Text> : null}
        </>
    );
}

export function PdfScanReportCoverContent({
    eyebrow,
    title,
    urlLine,
    metaLines,
    scoreItems,
}: {
    eyebrow: string;
    title: string;
    urlLine: string;
    metaLines: string[];
    scoreItems: Array<{ label: string; value: string; valueColor?: string; labelColor?: string }>;
}) {
    return (
        <>
            <Text style={pdfStyles.coverEyebrow}>{eyebrow}</Text>
            <Text style={pdfStyles.coverTitle}>{title}</Text>
            <View style={pdfStyles.coverUrlBox}>
                <Text style={pdfStyles.coverUrl}>{urlLine}</Text>
            </View>
            {metaLines.length > 0 ? (
                <View style={pdfStyles.coverMeta}>
                    {metaLines.map((line) => (
                        <Text key={line} style={pdfStyles.coverMetaItem}>
                            {line}
                        </Text>
                    ))}
                </View>
            ) : null}
            <View style={pdfStyles.scoreGrid}>
                {scoreItems.map((item) => (
                    <View key={item.label} style={pdfStyles.scoreCard}>
                        <Text
                            style={[
                                pdfStyles.scoreCardValue,
                                item.valueColor ? { color: item.valueColor } : {},
                            ]}
                        >
                            {item.value}
                        </Text>
                        <Text
                            style={[
                                pdfStyles.scoreCardLabel,
                                item.labelColor ? { color: item.labelColor } : {},
                            ]}
                        >
                            {item.label}
                        </Text>
                    </View>
                ))}
            </View>
        </>
    );
}
