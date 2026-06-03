'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
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
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { apiRankTrackingKeywordPositions } from '@/lib/constants';
import type { PositionPoint } from '@/components/RankTrackingChart';
import { msqdxChipThemeAccentSx } from '@/lib/theme-accent';
import { buildSeriesColorMap } from '@/lib/chart-series-colors';
import { GeoPositionLineTooltip } from '@/components/chart/GeoPositionLineTooltip';

const TIME_RANGES = [
    { label: '7d', limit: 7 },
    { label: '30d', limit: 30 },
    { label: '90d', limit: 90 },
] as const;

export interface RankIntentVariant {
    keywordId: string;
    seriesLabel: string;
}

export interface RankIntentCompareChartProps {
    variants: RankIntentVariant[];
    t: (key: string) => string;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function RankIntentCompareChart({ variants, t }: RankIntentCompareChartProps) {
    const [timeRangeIndex, setTimeRangeIndex] = useState(1);
    const limit = TIME_RANGES[timeRangeIndex]?.limit ?? 30;
    const [seriesById, setSeriesById] = useState<Record<string, PositionPoint[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all(
            variants.map(async (v) => {
                const res = await fetch(apiRankTrackingKeywordPositions(v.keywordId, limit), {
                    credentials: 'same-origin',
                });
                const data = await res.json();
                return {
                    id: v.keywordId,
                    points: data?.success && Array.isArray(data.data) ? (data.data as PositionPoint[]) : [],
                };
            })
        )
            .then((results) => {
                if (cancelled) return;
                const map: Record<string, PositionPoint[]> = {};
                for (const r of results) map[r.id] = r.points;
                setSeriesById(map);
            })
            .catch(() => {
                if (!cancelled) setError(t('common.error'));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [variants, limit, t]);

    const chartData = useMemo(() => {
        const dateMap = new Map<string, Record<string, string | number | null>>();
        for (const v of variants) {
            const points = [...(seriesById[v.keywordId] ?? [])].reverse();
            for (const p of points) {
                const date = formatDate(p.recordedAt);
                const row = dateMap.get(date) ?? { date };
                row[v.seriesLabel] = p.position ?? null;
                dateMap.set(date, row);
            }
        }
        return [...dateMap.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }, [seriesById, variants]);

    const seriesColorMap = useMemo(
        () => buildSeriesColorMap(variants.map((v) => v.seriesLabel)),
        [variants]
    );
    const formatPositionValue = useCallback(
        (value: unknown) => (typeof value === 'number' && value > 0 ? String(value) : '—'),
        []
    );

    const textMuted = 'var(--color-text-muted-on-light)';
    const gridStroke = 'var(--color-border-on-light)';

    if (loading) {
        return (
            <MsqdxTypography variant="body2" sx={{ color: textMuted, py: 2 }}>
                {t('common.loading')}
            </MsqdxTypography>
        );
    }
    if (error) {
        return (
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-status-error)', py: 2 }}>
                {error}
            </MsqdxTypography>
        );
    }
    if (chartData.length === 0) {
        return (
            <MsqdxTypography variant="body2" sx={{ color: textMuted, py: 2 }}>
                {t('projects.rankChartNoData')}
            </MsqdxTypography>
        );
    }

    const maxPos = Math.min(
        100,
        Math.max(
            10,
            ...chartData.flatMap((d) =>
                variants.map((v) => {
                    const val = d[v.seriesLabel];
                    return typeof val === 'number' ? val : 0;
                })
            )
        )
    );

    return (
        <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 1 }}>
                {TIME_RANGES.map((tr, idx) => (
                    <MsqdxChip
                        key={tr.label}
                        label={tr.label}
                        variant={timeRangeIndex === idx ? 'filled' : 'outlined'}
                        size="small"
                        onClick={() => setTimeRangeIndex(idx)}
                        sx={msqdxChipThemeAccentSx(timeRangeIndex === idx)}
                    />
                ))}
            </Box>
            <Box sx={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis dataKey="date" tick={{ fill: textMuted, fontSize: 11 }} stroke={gridStroke} />
                        <YAxis
                            domain={[maxPos, 1]}
                            reversed
                            tick={{ fill: textMuted, fontSize: 11 }}
                            stroke={gridStroke}
                            width={28}
                        />
                        <Tooltip
                            shared={false}
                            content={({ active, payload, label }) => (
                                <GeoPositionLineTooltip
                                    active={active}
                                    payload={payload}
                                    label={label}
                                    formatPositionValue={formatPositionValue}
                                />
                            )}
                        />
                        <Legend />
                        {variants.map((v) => (
                            <Line
                                key={v.keywordId}
                                type="monotone"
                                dataKey={v.seriesLabel}
                                name={v.seriesLabel}
                                stroke={seriesColorMap.get(v.seriesLabel) ?? '#2563eb'}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                activeDot={{ r: 4 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}
