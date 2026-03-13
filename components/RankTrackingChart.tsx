'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';
import { apiRankTrackingKeywordPositions } from '@/lib/constants';

const CHART_COLORS = [
    '#22c55e', // green – our domain
    '#7c3aed',
    '#0ea5e9',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#14b8a6',
    '#6366f1',
];

export interface PositionPoint {
    recordedAt: string;
    position: number | null;
    competitorPositions?: Record<string, number | null>;
}

const TIME_RANGES = [
    { label: '7d', limit: 7 },
    { label: '30d', limit: 30 },
    { label: '90d', limit: 90 },
    { label: '1J', limit: 365 },
] as const;

export interface RankTrackingChartProps {
    keywordId: string;
    keywordLabel: string;
    ourDomain: string;
    competitorDomains: string[];
    t: (key: string) => string;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatPositionTooltip(value: unknown, name: string): [string, string] {
    const display = typeof value === 'number' ? String(value) : '—';
    return [display, name];
}

function formatTooltipLabel(label: string): string {
    return label;
}

function formatLegendValue(value: string): string {
    return value;
}

export function RankTrackingChart({
    keywordId,
    keywordLabel,
    ourDomain,
    competitorDomains,
    t,
}: RankTrackingChartProps) {
    const [timeRangeIndex, setTimeRangeIndex] = useState(1); // 30d default
    const limit = TIME_RANGES[timeRangeIndex]?.limit ?? 30;
    const [points, setPoints] = useState<PositionPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(apiRankTrackingKeywordPositions(keywordId, limit), { credentials: 'same-origin' })
            .then((res) => res.json())
            .then((data: { success?: boolean; data?: PositionPoint[] }) => {
                if (cancelled) return;
                if (data?.success && Array.isArray(data.data)) {
                    setPoints(data.data);
                } else {
                    setPoints([]);
                }
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
    }, [keywordId, limit, t]);

    const chartData = useMemo(() => {
        const reversed = [...points].reverse();
        return reversed.map((p) => {
            const date = formatDate(p.recordedAt);
            const row: Record<string, string | number | null> = {
                date,
                recordedAt: p.recordedAt,
                [ourDomain]: p.position ?? null,
            };
            if (p.competitorPositions) {
                for (const [dom, pos] of Object.entries(p.competitorPositions)) {
                    row[dom] = pos ?? null;
                }
            }
            return row;
        });
    }, [points, ourDomain]);

    const allDomains = useMemo(() => [ourDomain, ...competitorDomains], [ourDomain, competitorDomains]);
    const textMuted = 'var(--color-text-muted-on-light)';
    const borderColor = 'var(--color-border-subtle, #eee)';
    const tooltipContentStyle = {
        backgroundColor: 'var(--color-card-bg, #fff)',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        fontSize: 12,
    };
    const tooltipLabelStyle = { color: 'var(--color-text-on-light)' };

    if (loading) {
        return (
            <Box sx={{ py: 2 }}>
                <MsqdxTypography variant="body2" sx={{ color: textMuted }}>{t('common.loading')}</MsqdxTypography>
            </Box>
        );
    }
    if (error) {
        return (
            <Box sx={{ py: 2 }}>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-status-error)' }}>{error}</MsqdxTypography>
            </Box>
        );
    }
    if (chartData.length === 0) {
        return (
            <Box sx={{ py: 2 }}>
                <MsqdxTypography variant="body2" sx={{ color: textMuted }}>{t('projects.rankChartNoData')}</MsqdxTypography>
            </Box>
        );
    }

    const maxPos = Math.min(
        100,
        Math.max(
            10,
            ...chartData.flatMap((d) =>
                allDomains.map((dom) => {
                    const v = d[dom];
                    return typeof v === 'number' ? v : 0;
                })
            )
        )
    );

    return (
        <Box sx={{ mt: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                <MsqdxTypography variant="caption" sx={{ color: textMuted }}>
                    {keywordLabel}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {TIME_RANGES.map((tr, idx) => (
                        <MsqdxButton
                            key={tr.label}
                            variant={timeRangeIndex === idx ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => setTimeRangeIndex(idx)}
                            sx={{ minWidth: 40 }}
                        >
                            {tr.label}
                        </MsqdxButton>
                    ))}
                </Box>
            </Box>
            <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: textMuted, fontSize: 11 }}
                            stroke={borderColor}
                        />
                        <YAxis
                            domain={[maxPos, 1]}
                            reversed
                            allowDataOverflow
                            tick={{ fill: textMuted, fontSize: 11 }}
                            stroke={borderColor}
                            label={{
                                value: t('projects.rankChartYAxis'),
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: textMuted, fontSize: 11 },
                            }}
                        />
                        <Tooltip
                            contentStyle={tooltipContentStyle}
                            labelStyle={tooltipLabelStyle}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: 11 }}
                            formatter={formatLegendValue}
                            iconType="line"
                        />
                        <Line
                            type="monotone"
                            dataKey={ourDomain}
                            name={ourDomain}
                            stroke={CHART_COLORS[0]}
                            strokeWidth={2}
                            dot={{ r: 2 }}
                            connectNulls
                        />
                        {competitorDomains.map((dom, idx) => (
                            <Line
                                key={dom}
                                type="monotone"
                                dataKey={dom}
                                name={dom}
                                stroke={CHART_COLORS[(idx + 1) % CHART_COLORS.length]}
                                strokeWidth={1.5}
                                dot={{ r: 2 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}
