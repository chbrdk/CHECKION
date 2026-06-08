'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { GeoQuestionDetailFact } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    formatGeoAvgPosition,
    formatGeoPosition,
    geoPositionColor,
    geoTrendColor,
    geoTrendSymbol,
} from '@/lib/project-report/geo-question-pdf';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';

function RankBadge({ position }: { position: number | null }) {
    const color = geoPositionColor(position);
    const bg =
        position == null
            ? pdfColors.gray100
            : position <= 1
              ? 'rgba(5, 150, 105, 0.12)'
              : position <= 3
                ? 'rgba(37, 99, 235, 0.12)'
                : position <= 10
                  ? 'rgba(217, 119, 6, 0.12)'
                  : 'rgba(220, 38, 38, 0.12)';

    return (
        <View
            style={{
                backgroundColor: bg,
                borderRadius: 4,
                paddingVertical: 2,
                paddingHorizontal: 6,
                alignSelf: 'flex-start',
                minWidth: 28,
                alignItems: 'center',
            }}
        >
            <Text style={{ fontSize: 8, fontWeight: 'bold', color }}>{formatGeoPosition(position)}</Text>
        </View>
    );
}

function TrendBadge({
    trend,
    label,
}: {
    trend: GeoQuestionDetailFact['trend'];
    label: string;
}) {
    const color = geoTrendColor(trend);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color }}>{geoTrendSymbol(trend)}</Text>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: pdfColors.gray900 }}>{label}</Text>
        </View>
    );
}

function InnerTableHeader({ columns }: { columns: Array<{ label: string; width: string }> }) {
    return (
        <View style={[pdfStyles.dataTableHeader, { marginTop: 0 }]}>
            {columns.map((col) => (
                <Text
                    key={col.label}
                    style={[pdfStyles.dataTableHeaderCell, { width: col.width }]}
                >
                    {col.label}
                </Text>
            ))}
        </View>
    );
}

export function PdfGeoQuestionCard({
    question,
    labels,
}: {
    question: GeoQuestionDetailFact;
    labels: ProjectReportPdfLabels;
}) {
    const trendLabel = labels.geoTrendLabels[question.trend];
    const avgPos = formatGeoAvgPosition(question.latestPosition);
    const avgPosDisplay = question.latestPosition != null ? avgPos : labels.geoNotCited;

    return (
        <View style={pdfStyles.geoQuestionCard}>
            <Text style={pdfStyles.geoQuestionTitle}>{question.queryText}</Text>

            <View style={pdfStyles.geoQuestionSummaryRow}>
                <View style={pdfStyles.geoQuestionSummaryCell}>
                    <Text style={pdfStyles.statTileLabel}>{labels.geoTrend}</Text>
                    <TrendBadge trend={question.trend} label={trendLabel} />
                </View>
                <View style={[pdfStyles.geoQuestionSummaryCell, pdfStyles.geoQuestionSummaryCellBorder]}>
                    <Text style={pdfStyles.statTileLabel}>{labels.geoAvgPosition}</Text>
                    <Text style={pdfStyles.geoQuestionSummaryValue}>{avgPosDisplay}</Text>
                </View>
            </View>

            {question.positionsByModel.length > 0 ? (
                <View style={pdfStyles.geoQuestionTablePanel}>
                    <InnerTableHeader
                        columns={[
                            { label: labels.geoModel, width: '62%' },
                            { label: labels.geoRank, width: '38%' },
                        ]}
                    />
                    {question.positionsByModel.map((row, i) => (
                        <View
                            key={row.modelId}
                            style={[
                                pdfStyles.dataTableRow,
                                i % 2 === 1 ? { backgroundColor: pdfColors.gray100 } : {},
                            ]}
                        >
                            <Text style={[pdfStyles.tableValue, { width: '62%', fontSize: 8 }]}>
                                {row.modelId}
                            </Text>
                            <View style={{ width: '38%' }}>
                                <RankBadge position={row.position} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : null}

            {question.topCitedDomains.length > 0 ? (
                <View style={[pdfStyles.geoQuestionTablePanel, { marginTop: 8 }]}>
                    <Text style={[pdfStyles.statTileLabel, { marginBottom: 4 }]}>{labels.geoTopCited}</Text>
                    <InnerTableHeader
                        columns={[
                            { label: '#', width: '10%' },
                            { label: labels.geoDomain, width: '90%' },
                        ]}
                    />
                    {question.topCitedDomains.map((domain, i) => (
                        <View
                            key={`${domain}-${i}`}
                            style={[
                                pdfStyles.dataTableRow,
                                i % 2 === 1 ? { backgroundColor: pdfColors.gray100 } : {},
                            ]}
                        >
                            <Text
                                style={[
                                    pdfStyles.tableValue,
                                    { width: '10%', fontSize: 8, color: pdfColors.gray500 },
                                ]}
                            >
                                {i + 1}
                            </Text>
                            <Text style={[pdfStyles.tableValue, { width: '90%', fontSize: 8 }]}>
                                {domain}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
}
