'use client';

import React from 'react';
import { View, Text, Svg, Rect } from '@react-pdf/renderer';
import type { VisualSpec } from '@/lib/project-report/chart-specs';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';

const CHART_WIDTH = 480;
const BAR_HEIGHT = 14;
const BAR_GAP = 6;

function HorizontalBarChart({
    title,
    items,
}: {
    title?: string;
    items: Array<{ label: string; value: number; color: string; isHighlight?: boolean }>;
}) {
    const max = Math.max(...items.map((i) => i.value), 1);
    return (
        <View style={pdfStyles.cardBox}>
            {title ? <Text style={pdfStyles.subsectionTitle}>{title}</Text> : null}
            {items.map((item) => (
                <View key={item.label} style={{ marginBottom: BAR_GAP }}>
                    <View style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableLabel, { width: 120 }]}>{item.label}</Text>
                        <Text style={pdfStyles.tableValue}>{item.value}</Text>
                    </View>
                    <Svg width={CHART_WIDTH} height={BAR_HEIGHT}>
                        <Rect
                            x={0}
                            y={0}
                            width={CHART_WIDTH}
                            height={BAR_HEIGHT}
                            fill={pdfColors.gray100}
                            rx={3}
                        />
                        <Rect
                            x={0}
                            y={0}
                            width={(item.value / max) * CHART_WIDTH}
                            height={BAR_HEIGHT}
                            fill={item.color}
                            rx={3}
                        />
                    </Svg>
                </View>
            ))}
        </View>
    );
}

function KeywordBars({ items }: { items: Array<{ keyword: string; position: number | null; barWidth: number }> }) {
    return (
        <View style={pdfStyles.cardBox}>
            {items.map((item) => (
                <View key={item.keyword} style={{ marginBottom: BAR_GAP }}>
                    <View style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableLabel, { width: 160 }]}>{item.keyword}</Text>
                        <Text style={pdfStyles.tableValue}>
                            {item.position != null ? `#${item.position}` : '–'}
                        </Text>
                    </View>
                    {item.barWidth > 0 ? (
                        <Svg width={CHART_WIDTH} height={8}>
                            <Rect x={0} y={0} width={CHART_WIDTH} height={8} fill={pdfColors.gray100} rx={2} />
                            <Rect
                                x={0}
                                y={0}
                                width={(item.barWidth / 100) * CHART_WIDTH}
                                height={8}
                                fill={pdfColors.notice}
                                rx={2}
                            />
                        </Svg>
                    ) : null}
                </View>
            ))}
        </View>
    );
}

function TopicBars({ items }: { items: Array<{ theme: string; score: number; pageCount: number }> }) {
    const max = Math.max(...items.map((i) => i.score), 1);
    return (
        <View style={pdfStyles.cardBox}>
            {items.map((item) => (
                <View key={item.theme} style={{ marginBottom: BAR_GAP }}>
                    <View style={pdfStyles.tableRow}>
                        <Text style={[pdfStyles.tableLabel, { width: 140 }]}>{item.theme}</Text>
                        <Text style={pdfStyles.tableValue}>
                            {item.pageCount} pages · score {Math.round(item.score)}
                        </Text>
                    </View>
                    <Svg width={CHART_WIDTH} height={BAR_HEIGHT}>
                        <Rect x={0} y={0} width={CHART_WIDTH} height={BAR_HEIGHT} fill={pdfColors.gray100} rx={3} />
                        <Rect
                            x={0}
                            y={0}
                            width={(item.score / max) * CHART_WIDTH}
                            height={BAR_HEIGHT}
                            fill={pdfColors.brand}
                            rx={3}
                        />
                    </Svg>
                </View>
            ))}
        </View>
    );
}

function RankTrendChart({
    series,
}: {
    series: Array<{ keyword: string; color: string; points: Array<{ x: number; y: number }> }>;
}) {
    const height = 80;
    const width = CHART_WIDTH;
    return (
        <View style={pdfStyles.cardBox}>
            {series.map((s) => {
                if (s.points.length < 2) return null;
                const xs = s.points.map((p) => p.x);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const spanX = maxX - minX || 1;
                return (
                    <View key={s.keyword} style={{ marginBottom: 10 }}>
                        <Text style={pdfStyles.subsectionTitle}>{s.keyword}</Text>
                        <Svg width={width} height={height}>
                            {s.points.slice(1).map((p, i) => {
                                const prev = s.points[i]!;
                                const x1 = ((prev.x - minX) / spanX) * (width - 20) + 10;
                                const y1 = (Math.min(prev.y, 100) / 100) * (height - 20) + 10;
                                const x2 = ((p.x - minX) / spanX) * (width - 20) + 10;
                                const y2 = (Math.min(p.y, 100) / 100) * (height - 20) + 10;
                                return (
                                    <Rect
                                        key={i}
                                        x={Math.min(x1, x2)}
                                        y={Math.min(y1, y2)}
                                        width={Math.max(Math.abs(x2 - x1), 2)}
                                        height={Math.max(Math.abs(y2 - y1), 2)}
                                        fill={s.color}
                                    />
                                );
                            })}
                        </Svg>
                    </View>
                );
            })}
        </View>
    );
}

export function PdfVisualSpec({ spec }: { spec: VisualSpec }) {
    switch (spec.kind) {
        case 'competitorBarChart':
            return <HorizontalBarChart title={spec.title} items={spec.items} />;
        case 'rankingKeywords':
            return <KeywordBars items={spec.items} />;
        case 'geoCompetitive':
            return <HorizontalBarChart title="GEO Competitive Score" items={spec.items} />;
        case 'pageTopics':
            return <TopicBars items={spec.items} />;
        case 'rankTrend':
            return <RankTrendChart series={spec.series} />;
        case 'geoQuestionTrend':
            return <HorizontalBarChart title="GEO Question Visibility" items={spec.items} />;
        case 'competitorRankingScores':
            return <HorizontalBarChart title="Ranking Score by Domain" items={spec.items} />;
        case 'competitorSeoBarChart':
            return <HorizontalBarChart title={spec.title} items={spec.items} />;
        case 'competitorTopicOverlap':
            return (
                <View style={pdfStyles.cardBox}>
                    {spec.rows.map((row) => (
                        <View key={row.theme} style={{ marginBottom: BAR_GAP }}>
                            <View style={pdfStyles.tableRow}>
                                <Text style={[pdfStyles.tableLabel, { width: 140 }]}>{row.theme}</Text>
                                <Text style={pdfStyles.tableValue}>
                                    Own {Math.round(row.ownScore)} · {row.bestCompetitor}{' '}
                                    {Math.round(row.bestCompetitorScore)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            );
        case 'scoreCards':
        default:
            return null;
    }
}

export function PdfScoreCardsFromSpec({
    spec,
}: {
    spec: Extract<VisualSpec, { kind: 'scoreCards' }> | undefined;
}) {
    if (!spec) return null;
    return (
        <View style={pdfStyles.scoreGrid}>
            {spec.items.map((item) => (
                <View
                    key={item.label}
                    style={[pdfStyles.scoreCard, { borderLeftColor: item.color }]}
                >
                    <Text style={pdfStyles.scoreCardValue}>
                        {item.value != null ? `${item.value}` : '–'}
                    </Text>
                    <Text style={pdfStyles.scoreCardLabel}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
}
