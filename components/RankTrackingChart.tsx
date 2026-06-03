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
import { THEME_ACCENT_CSS, msqdxChipThemeAccentSx } from '@/lib/theme-accent';
import { buildSeriesColorMap } from '@/lib/chart-series-colors';
import { GeoPositionLineTooltip } from '@/components/chart/GeoPositionLineTooltip';

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
    const seriesColorMap = useMemo(
        () =>
            buildSeriesColorMap(allDomains, {
                highlightKey: ourDomain,
                highlightColor: THEME_ACCENT_CSS,
            }),
        [allDomains, ourDomain]
    );
    const formatPositionValue = useCallback(
        (value: unknown) => (typeof value === 'number' && value > 0 ? String(value) : '—'),
        []
    );
    const textMuted = 'var(--color-text-muted-on-light)';
    const gridStroke = 'var(--color-border-on-light)';

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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
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
            </Box>
            <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeWidth={1} />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: textMuted, fontSize: 11 }}
                            stroke={gridStroke}
                        />
                        <YAxis
                            domain={[maxPos, 1]}
                            reversed
                            allowDataOverflow
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
                        <Legend
                            wrapperStyle={{ fontSize: 11 }}
                            formatter={formatLegendValue}
                            iconType="line"
                        />
                        {allDomains.map((dom) => (
                            <Line
                                key={dom}
                                type="monotone"
                                dataKey={dom}
                                name={dom}
                                stroke={seriesColorMap.get(dom) ?? THEME_ACCENT_CSS}
                                strokeWidth={dom === ourDomain ? 2.5 : 2}
                                dot={{ r: dom === ourDomain ? 3 : 2.5 }}
                                activeDot={{ r: dom === ourDomain ? 5 : 4 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </Box>
        </Box>
    );
}
