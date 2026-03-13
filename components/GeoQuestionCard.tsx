'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxCard } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { PositionMatrixRow } from '@/components/CompetitivePositionDiagram';

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

export interface GeoQuestionCardProps {
    row: PositionMatrixRow;
    modelIds: string[];
    t: (key: string, params?: Record<string, string | number>) => string;
}

/** Single question card with mini bar chart (position per LLM), like one keyword card on rankings page. */
export function GeoQuestionCard({ row, modelIds, t }: GeoQuestionCardProps) {
    const chartData = useMemo(
        () =>
            modelIds.map((modelId, idx) => {
                const pos = row[modelId];
                const num = typeof pos === 'number' && pos > 0 ? pos : 0;
                return { modelId, position: num, fill: CHART_COLORS[idx % CHART_COLORS.length] };
            }),
        [modelIds, row]
    );

    const maxPos = Math.max(1, ...chartData.map((d) => d.position));

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
                minHeight: 280,
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
                    {row.queryText || `${t('geoEeat.queryN', { n: row.queryIndex })}`}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                    {t('geoEeat.positionDiagramYLabel')}
                </MsqdxTypography>
            </Box>
            <Box sx={{ flex: 1, minHeight: 180, width: '100%', px: 'var(--msqdx-spacing-sm)', py: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                    >
                        <XAxis type="number" domain={[0, Math.max(maxPos, 5)]} hide />
                        <YAxis
                            type="category"
                            dataKey="modelId"
                            width={80}
                            tick={{ fontSize: 11, fill: 'var(--color-text-muted-on-light)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            formatter={(value: number | undefined) => (value != null && value > 0 ? `${t('geoEeat.positionShort')} ${value}` : t('geoEeat.positionNotCited'))}
                            labelFormatter={(label) => String(label)}
                        />
                        <Bar dataKey="position" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive>
                            {chartData.map((entry, idx) => (
                                <Cell
                                    key={entry.modelId}
                                    fill={entry.position > 0 ? entry.fill : alpha(MSQDX_NEUTRAL[200] ?? '#e5e7eb', 0.5)}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
            <Box
                component="table"
                sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 11,
                    '& td': {
                        borderTop: '1px solid var(--color-border-subtle, #eee)',
                        px: 'var(--msqdx-spacing-sm)',
                        py: 'var(--msqdx-spacing-xs)',
                        color: 'var(--color-text-on-light)',
                    },
                    '& td:first-of-type': { color: 'var(--color-text-muted-on-light)' },
                }}
            >
                <tbody>
                    {chartData.map(({ modelId, position }) => {
                        const pos = position > 0 ? position : null;
                        const green = MSQDX_BRAND_PRIMARY?.green ?? '#22c55e';
                        const bg =
                            pos === 1
                                ? alpha(green, 0.15)
                                : pos === 2
                                  ? alpha(green, 0.08)
                                  : pos != null && pos <= 3
                                    ? alpha(MSQDX_BRAND_PRIMARY?.yellow ?? '#f59e0b', 0.08)
                                    : undefined;
                        return (
                            <tr key={modelId}>
                                <td>{modelId}</td>
                                <td style={{ backgroundColor: bg, fontWeight: 600 }}>
                                    {pos != null && pos > 0 ? pos : '–'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </Box>
        </MsqdxCard>
    );
}
