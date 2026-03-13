'use client';

import { useMemo, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';

const CHART_COLORS = [
    MSQDX_BRAND_PRIMARY?.green ?? '#22c55e',
    MSQDX_BRAND_PRIMARY?.purple ?? '#7c3aed',
    '#0ea5e9',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#14b8a6',
    '#6366f1',
];

const TIME_RANGES = [
    { label: '7d', limit: 7 },
    { label: '30d', limit: 30 },
    { label: '90d', limit: 90 },
    { label: '1J', limit: 365 },
] as const;

export interface GeoQuestionHistoryPoint {
    recordedAt: string;
    positionsByModel: Record<string, number | null>;
}

export interface GeoQuestionCardProps {
    queryText: string;
    queryIndex: number;
    points: GeoQuestionHistoryPoint[];
    t: (key: string, params?: Record<string, string | number>) => string;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Single question card with line chart over time (position per LLM per analysis), like RankTrackingChart. */
export function GeoQuestionCard({ queryText, queryIndex, points, t }: GeoQuestionCardProps) {
    const [timeRangeIndex, setTimeRangeIndex] = useState(1);
    const limit = TIME_RANGES[timeRangeIndex]?.limit ?? 30;

    const { modelIds, chartData, maxPos } = useMemo(() => {
        if (points.length === 0) return { modelIds: [] as string[], chartData: [], maxPos: 10 };
        const modelSet = new Set<string>();
        for (const p of points) {
            for (const k of Object.keys(p.positionsByModel)) modelSet.add(k);
        }
        const ids = Array.from(modelSet);
        const sorted = [...points].sort(
            (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        const sliced = limit < 365 ? sorted.slice(-limit) : sorted;
        const data = sliced.map((p) => {
            const row: Record<string, string | number | null> = {
                date: formatDate(p.recordedAt),
                recordedAt: p.recordedAt,
            };
            for (const m of ids) {
                row[m] = p.positionsByModel[m] ?? null;
            }
            return row;
        });
        let max = 6;
        for (const row of data) {
            for (const m of ids) {
                const v = row[m];
                if (typeof v === 'number' && v > 0 && v > max) max = v;
            }
        }
        return { modelIds: ids, chartData: data, maxPos: Math.max(max, 6) };
    }, [points, limit]);

    const textMuted = 'var(--color-text-muted-on-light)';
    const gridStroke = 'var(--color-border-subtle, #eee)';
    const tooltipContentStyle = {
        backgroundColor: 'var(--color-card-bg, #fff)',
        border: `1px solid ${gridStroke}`,
        borderRadius: 8,
        fontSize: 11,
    };

    if (points.length === 0) {
        return (
            <MsqdxCard
                variant="flat"
                borderRadius="button"
                sx={{
                    p: 2,
                    border: '1px solid var(--color-border-subtle, #eee)',
                    bgcolor: 'var(--color-card-bg)',
                    minHeight: 280,
                }}
            >
                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 1 }}>
                    {queryText || `${t('geoEeat.queryN', { n: queryIndex })}`}
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: textMuted }}>
                    {t('projects.rankChartNoData')}
                </MsqdxTypography>
            </MsqdxCard>
        );
    }

    return (
        <MsqdxCard
            variant="flat"
            borderRadius="button"
            sx={{
                p: 0,
                border: '1px solid var(--color-border-subtle, #eee)',
                bgcolor: 'var(--color-card-bg)',
                color: 'var(--color-text-on-light)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 320,
            }}
        >
            <Box sx={{ px: 'var(--msqdx-spacing-sm)', pt: 'var(--msqdx-spacing-sm)', pb: 0 }}>
                <MsqdxTypography
                    variant="subtitle2"
                    weight="semibold"
                    sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: 0,
                    }}
                >
                    {queryText || `${t('geoEeat.queryN', { n: queryIndex })}`}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 0.5 }}>
                    {TIME_RANGES.map((tr, idx) => (
                        <MsqdxChip
                            key={tr.label}
                            label={tr.label}
                            variant={timeRangeIndex === idx ? 'filled' : 'outlined'}
                            brandColor={timeRangeIndex === idx ? 'green' : undefined}
                            size="small"
                            onClick={() => setTimeRangeIndex(idx)}
                            sx={{ cursor: 'pointer' }}
                        />
                    ))}
                </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 220, width: '100%', px: 'var(--msqdx-spacing-sm)', py: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeWidth={1} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: textMuted, fontSize: 10 }}
                            stroke={gridStroke}
                        />
                        <YAxis
                            domain={[maxPos, 1]}
                            reversed
                            allowDataOverflow
                            tick={{ fill: textMuted, fontSize: 10 }}
                            stroke={gridStroke}
                            width={24}
                        />
                        <Tooltip
                            contentStyle={tooltipContentStyle}
                            formatter={(value: unknown) => (typeof value === 'number' && value > 0 ? `${t('geoEeat.positionShort')} ${value}` : t('geoEeat.positionNotCited'))}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} iconType="line" />
                        {modelIds.map((modelId, idx) => (
                            <Line
                                key={modelId}
                                type="monotone"
                                dataKey={modelId}
                                name={modelId}
                                stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 2.5 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </MsqdxCard>
    );
}
