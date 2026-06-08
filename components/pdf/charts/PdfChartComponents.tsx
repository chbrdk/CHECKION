'use client';

import React from 'react';
import { View, Text, Svg, Rect, Circle, Path, G } from '@react-pdf/renderer';
import type { VisualSpec } from '@/lib/project-report/chart-specs';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';

const CHART_WIDTH = 480;
const CHART_HEIGHT = 130;
const BAR_GAP = 10;
const RING_SIZE = 76;

function polar(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = polar(cx, cy, r, endAngle);
    const end = polar(cx, cy, r, startAngle);
    const large = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function ScoreRing({
    value,
    max = 100,
    color,
    label,
    size = RING_SIZE,
}: {
    value: number | null;
    max?: number;
    color: string;
    label: string;
    size?: number;
}) {
    const cx = size / 2;
    const cy = size / 2;
    const r = (size - 10) / 2;
    const pct = value != null ? Math.min(1, Math.max(0, value / max)) : 0;
    const sweep = Math.max(0.5, pct * 359.5);

    return (
        <View style={{ alignItems: 'center', width: size + 12, marginBottom: 6 }}>
            <View style={{ width: size, height: size, position: 'relative' }}>
                <Svg width={size} height={size}>
                    <Circle cx={cx} cy={cy} r={r} stroke={pdfColors.gray200} strokeWidth={5} fill="none" />
                    {pct > 0 ? (
                        <Path
                            d={describeArc(cx, cy, r, 0, sweep)}
                            stroke={color}
                            strokeWidth={5}
                            fill="none"
                            strokeLinecap="round"
                        />
                    ) : null}
                    <Circle cx={cx} cy={cy} r={r - 14} fill={pdfColors.gray100} />
                </Svg>
                <View
                    style={{
                        position: 'absolute',
                        top: size / 2 - 8,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: pdfColors.gray900 }}>
                        {value != null ? Math.round(value) : '–'}
                    </Text>
                </View>
            </View>
            <Text
                style={{
                    fontSize: 7,
                    color: pdfColors.gray500,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginTop: 6,
                    textAlign: 'center',
                }}
            >
                {label}
            </Text>
        </View>
    );
}

function ScoreRingsGrid({
    items,
}: {
    items: Array<{ label: string; value: number | null; color: string; max?: number }>;
}) {
    return (
        <View style={pdfStyles.chartCard}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8 }}>
                {items.map((item) => (
                    <ScoreRing
                        key={item.label}
                        label={item.label}
                        value={item.value}
                        color={item.color}
                        max={item.max ?? 100}
                    />
                ))}
            </View>
        </View>
    );
}

function VerticalBarChart({
    title,
    items,
    maxValue,
}: {
    title?: string;
    items: Array<{ label: string; value: number; color: string; isHighlight?: boolean }>;
    maxValue?: number;
}) {
    const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);
    const count = items.length;
    const barWidth = Math.min(44, Math.floor((CHART_WIDTH - BAR_GAP * (count + 1)) / Math.max(count, 1)));
    const chartInnerHeight = CHART_HEIGHT - 28;

    return (
        <View style={pdfStyles.chartCard}>
            {title ? <Text style={pdfStyles.chartTitle}>{title}</Text> : null}
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {items.map((item, i) => {
                    const h = Math.max(2, (item.value / max) * chartInnerHeight);
                    const x = BAR_GAP + i * (barWidth + BAR_GAP);
                    const y = chartInnerHeight - h + 4;
                    return (
                        <G key={item.label}>
                            <Rect
                                x={x}
                                y={4}
                                width={barWidth}
                                height={chartInnerHeight}
                                fill={pdfColors.gray100}
                                rx={4}
                            />
                            <Rect x={x} y={y} width={barWidth} height={h} fill={item.color} rx={4} />
                        </G>
                    );
                })}
            </Svg>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {items.map((item) => (
                    <View key={item.label} style={pdfStyles.chartLegendItem}>
                        <View style={[pdfStyles.chartLegendSwatch, { backgroundColor: item.color }]} />
                        <Text style={pdfStyles.chartLegendLabel}>
                            {item.label.length > 18 ? `${item.label.slice(0, 16)}…` : item.label}:{' '}
                            {Math.round(item.value)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

function KeywordVerticalChart({
    items,
}: {
    items: Array<{ keyword: string; position: number | null; barWidth: number }>;
}) {
    const mapped = items.map((item) => ({
        label: item.keyword,
        value: item.barWidth > 0 ? item.barWidth : item.position != null ? Math.max(5, 101 - item.position) : 0,
        color: pdfColors.notice,
        isHighlight: false,
    }));
    return <VerticalBarChart title="Keyword visibility (higher = better rank)" items={mapped} maxValue={100} />;
}

function TopicVerticalChart({
    items,
}: {
    items: Array<{ theme: string; score: number; pageCount: number }>;
}) {
    const mapped = items.map((item) => ({
        label: item.theme,
        value: item.score,
        color: pdfColors.brand,
        isHighlight: false,
    }));
    return <VerticalBarChart title="Content themes (aggregated score)" items={mapped} />;
}

function TopicOverlapVertical({
    rows,
}: {
    rows: Array<{ theme: string; ownScore: number; bestCompetitorScore: number; bestCompetitor: string }>;
}) {
    return (
        <View style={pdfStyles.chartCard}>
            <Text style={pdfStyles.chartTitle}>Topic strength — own vs best competitor</Text>
            {rows.map((row) => {
                const max = Math.max(row.ownScore, row.bestCompetitorScore, 1);
                const ownH = (row.ownScore / max) * 60;
                const compH = (row.bestCompetitorScore / max) * 60;
                return (
                    <View key={row.theme} style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 8, fontWeight: 'bold', marginBottom: 4 }}>{row.theme}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 68 }}>
                            <View style={{ alignItems: 'center', width: 36 }}>
                                <Svg width={28} height={64}>
                                    <Rect x={4} y={64 - ownH} width={20} height={ownH} fill={pdfColors.brand} rx={3} />
                                </Svg>
                                <Text style={{ fontSize: 6, marginTop: 2 }}>Own</Text>
                            </View>
                            <View style={{ alignItems: 'center', width: 36 }}>
                                <Svg width={28} height={64}>
                                    <Rect
                                        x={4}
                                        y={64 - compH}
                                        width={20}
                                        height={compH}
                                        fill={pdfColors.gray500}
                                        rx={3}
                                    />
                                </Svg>
                                <Text style={{ fontSize: 6, marginTop: 2 }}>
                                    {row.bestCompetitor.slice(0, 8)}
                                </Text>
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

function RankTrendChart({
    series,
}: {
    series: Array<{ keyword: string; color: string; points: Array<{ x: number; y: number }> }>;
}) {
    const height = 90;
    const width = CHART_WIDTH;
    return (
        <View style={pdfStyles.chartCard}>
            <Text style={pdfStyles.chartTitle}>Position trends (lower = better citation rank)</Text>
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
                                const x1 = ((prev.x - minX) / spanX) * (width - 24) + 12;
                                const y1 = (Math.min(prev.y, 100) / 100) * (height - 16) + 8;
                                const x2 = ((p.x - minX) / spanX) * (width - 24) + 12;
                                const y2 = (Math.min(p.y, 100) / 100) * (height - 16) + 8;
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
            return <VerticalBarChart title={spec.title} items={spec.items} maxValue={100} />;
        case 'rankingKeywords':
            return <KeywordVerticalChart items={spec.items} />;
        case 'geoCompetitive':
            return <VerticalBarChart title="GEO competitive score" items={spec.items} maxValue={100} />;
        case 'pageTopics':
            return <TopicVerticalChart items={spec.items} />;
        case 'rankTrend':
            return <RankTrendChart series={spec.series} />;
        case 'geoQuestionTrend':
            return <VerticalBarChart title="GEO question visibility" items={spec.items} />;
        case 'geoModelVisibility':
            return <VerticalBarChart title="LLM visibility by model" items={spec.items} maxValue={100} />;
        case 'geoQuestionTrendSeries':
            return <RankTrendChart series={spec.series} />;
        case 'competitorRankingScores':
            return <VerticalBarChart title="Ranking score by domain" items={spec.items} maxValue={100} />;
        case 'competitorSeoBarChart':
            return <VerticalBarChart title={spec.title} items={spec.items} maxValue={100} />;
        case 'competitorTopicOverlap':
            return <TopicOverlapVertical rows={spec.rows} />;
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
        <ScoreRingsGrid
            items={spec.items.map((item) => ({
                label: item.label,
                value: item.value,
                color: item.color,
                max: item.max ?? 100,
            }))}
        />
    );
}
