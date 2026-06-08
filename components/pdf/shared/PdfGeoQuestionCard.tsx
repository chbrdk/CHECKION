'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { GeoQuestionDetailFact } from '@/lib/project-report/types';
import type { ProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import {
    chunkPairs,
    formatGeoAvgPosition,
    formatGeoPosition,
    geoPositionColor,
    geoTrendColor,
    geoTrendSymbol,
    splitIndexedIntoColumns,
} from '@/lib/project-report/geo-question-pdf';
import { pdfColors, pdfFontFamilies, pdfStyles } from '@/components/pdf/shared/pdf-styles';

function RankBadge({ position, compact = false }: { position: number | null; compact?: boolean }) {
    const color = geoPositionColor(position);
    return (
        <Text
            style={{
                fontFamily: pdfFontFamilies.headline,
                fontSize: compact ? 7 : 8,
                fontWeight: 'bold',
                color,
            }}
        >
            {formatGeoPosition(position)}
        </Text>
    );
}

function CompactTableHeader({ columns }: { columns: Array<{ label: string; width: string }> }) {
    return (
        <View style={pdfStyles.geoQuestionTableHeader}>
            {columns.map((col) => (
                <Text
                    key={col.label}
                    style={[pdfStyles.geoQuestionTableHeaderCell, { width: col.width }]}
                >
                    {col.label}
                </Text>
            ))}
        </View>
    );
}

function ModelPairRow({
    left,
    right,
    rowIndex,
}: {
    left: GeoQuestionDetailFact['positionsByModel'][number];
    right?: GeoQuestionDetailFact['positionsByModel'][number];
    rowIndex: number;
}) {
    return (
        <View
            style={[
                pdfStyles.geoQuestionTableRow,
                rowIndex % 2 === 1 ? { backgroundColor: pdfColors.gray100 } : {},
            ]}
        >
            <Text style={[pdfStyles.geoQuestionCell, { width: '36%' }]}>{left.modelId}</Text>
            <View style={{ width: '14%' }}>
                <RankBadge position={left.position} compact />
            </View>
            {right ? (
                <>
                    <Text style={[pdfStyles.geoQuestionCell, { width: '36%' }]}>{right.modelId}</Text>
                    <View style={{ width: '14%' }}>
                        <RankBadge position={right.position} compact />
                    </View>
                </>
            ) : (
                <>
                    <Text style={[pdfStyles.geoQuestionCell, { width: '36%' }]} />
                    <View style={{ width: '14%' }} />
                </>
            )}
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
    const trendColor = geoTrendColor(question.trend);
    const modelPairs = chunkPairs(question.positionsByModel);
    const citationCols = splitIndexedIntoColumns(question.topCitedDomains, 2);

    return (
        <View style={pdfStyles.geoQuestionCard}>
            <View style={pdfStyles.geoQuestionHeaderRow}>
                <Text style={pdfStyles.geoQuestionTitle}>{question.queryText}</Text>
                <Text style={pdfStyles.geoQuestionMeta}>
                    <Text style={{ color: trendColor, fontWeight: 'bold' }}>
                        {geoTrendSymbol(question.trend)} {trendLabel}
                    </Text>
                    {' · '}
                    <Text style={{ fontWeight: 'bold', color: pdfColors.gray700 }}>
                        {labels.geoAvgPosition} {avgPosDisplay}
                    </Text>
                </Text>
            </View>

            {question.positionsByModel.length > 0 ? (
                <View style={pdfStyles.geoQuestionTablePanel}>
                    <CompactTableHeader
                        columns={[
                            { label: labels.geoModel, width: '36%' },
                            { label: labels.geoRank, width: '14%' },
                            { label: labels.geoModel, width: '36%' },
                            { label: labels.geoRank, width: '14%' },
                        ]}
                    />
                    {modelPairs.map(([left, right], i) => (
                        <ModelPairRow key={left.modelId} left={left} right={right} rowIndex={i} />
                    ))}
                </View>
            ) : null}

            {question.topCitedDomains.length > 0 ? (
                <View style={[pdfStyles.geoQuestionTablePanel, { marginTop: 4 }]}>
                    <Text style={pdfStyles.geoQuestionSectionLabel}>{labels.geoTopCited}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {citationCols.map((col, colIdx) => (
                            <View key={colIdx} style={{ width: '50%' }}>
                                {col.map((entry, i) => (
                                    <View
                                        key={`${entry.domain}-${entry.rank}`}
                                        style={[
                                            pdfStyles.geoQuestionTableRow,
                                            i % 2 === 1 ? { backgroundColor: pdfColors.gray100 } : {},
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                pdfStyles.geoQuestionCell,
                                                { width: '14%', color: pdfColors.gray500 },
                                            ]}
                                        >
                                            {entry.rank}
                                        </Text>
                                        <Text style={[pdfStyles.geoQuestionCell, { width: '86%' }]}>
                                            {entry.domain}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
            ) : null}
        </View>
    );
}
