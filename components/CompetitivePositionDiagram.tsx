'use client';

import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_SPACING, MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import type { CompetitiveBenchmarkResult } from '@/lib/types';
import { extractHostname, buildPositionMatrix, type PositionMatrixRow } from '@/lib/geo-eeat/position-matrix';

export { extractHostname, buildPositionMatrix };
export type { PositionMatrixRow } from '@/lib/geo-eeat/position-matrix';

const TABLE_BORDER = `1px solid ${MSQDX_NEUTRAL[200]}`;
const br = MSQDX_SPACING.borderRadius as Record<string, unknown> | undefined;
const TOOLTIP_RADIUS = typeof br?.md === 'number' ? br.md : 12;
const TABLE_RADIUS = typeof br?.sm === 'number' ? br.sm : 4;
const BAR_RADIUS = typeof br?.xs === 'number' ? br.xs : 2;
const scale = MSQDX_SPACING.scale as Record<string, unknown> | undefined;
const spacingSm = typeof scale?.sm === 'number' ? scale.sm : 12;

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

export interface CompetitivePositionDiagramProps {
    competitiveByModel: Record<string, CompetitiveBenchmarkResult>;
    targetUrl: string;
    t: (key: string, params?: Record<string, string | number>) => string;
}

export function CompetitivePositionDiagram({
    competitiveByModel,
    targetUrl,
    t,
}: CompetitivePositionDiagramProps) {
    const targetDomain = useMemo(() => extractHostname(targetUrl), [targetUrl]);
    const { rows, modelIds } = useMemo(
        () => buildPositionMatrix(competitiveByModel, targetDomain),
        [competitiveByModel, targetDomain]
    );

    if (rows.length === 0 || modelIds.length === 0) return null;

    const maxPos = Math.max(
        6,
        ...rows.flatMap((r) =>
            modelIds.map((m) => (typeof r[m] === 'number' ? (r[m] as number) : 0))
        )
    );

    const textPrimary = MSQDX_THEME?.light?.text?.primary ?? 'var(--color-text-on-light)';
    const textTertiary = MSQDX_THEME?.light?.text?.tertiary ?? 'var(--color-text-muted-on-light)';
    const surfacePrimary = MSQDX_THEME?.light?.surface?.primary ?? 'var(--color-card-bg)';
    const borderColor = MSQDX_NEUTRAL[200] ?? 'var(--color-border)';

    return (
        <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
            <MsqdxTypography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 'var(--msqdx-spacing-sm)', color: textPrimary }}
            >
                {t('geoEeat.positionDiagramTitle')}
            </MsqdxTypography>
            <MsqdxTypography
                variant="body2"
                sx={{ color: textTertiary, mb: 'var(--msqdx-spacing-sm)', display: 'block' }}
            >
                {t('geoEeat.positionDiagramDescription')}
            </MsqdxTypography>

            <Box sx={{ width: '100%', height: 320, mb: 'var(--msqdx-spacing-md)' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        margin={{ top: spacingSm, right: spacingSm, left: spacingSm, bottom: spacingSm }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                        <XAxis
                            dataKey="queryLabel"
                            tick={{ fill: textTertiary, fontSize: 12 }}
                            stroke={borderColor}
                        />
                        <YAxis
                            domain={[0, maxPos]}
                            allowDataOverflow
                            tick={{ fill: textTertiary, fontSize: 12 }}
                            stroke={borderColor}
                            label={{
                                value: t('geoEeat.positionDiagramYLabel'),
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: textTertiary, fontSize: 12 },
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                border: TABLE_BORDER,
                                borderRadius: TOOLTIP_RADIUS,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                padding: '10px 14px',
                                fontSize: 11,
                            }}
                            labelStyle={{ color: textPrimary, fontSize: 11 }}
                            formatter={(value, name) => {
                                const num = typeof value === 'number' ? value : undefined;
                                if (num == null || num === 0) {
                                    return [t('geoEeat.positionNotCited'), name];
                                }
                                return [t('geoEeat.positionShort') + ' ' + num, name];
                            }}
                            labelFormatter={(_label, payload) => {
                                const p = payload?.[0]?.payload as PositionMatrixRow | undefined;
                                return p?.queryText ? p.queryText.slice(0, 80) + (p.queryText.length > 80 ? '…' : '') : '';
                            }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: 12 }}
                            formatter={(value) => value}
                            iconType="square"
                        />
                        {modelIds.map((modelId, idx) => (
                            <Bar
                                key={modelId}
                                dataKey={modelId}
                                name={modelId}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                                radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
                                maxBarSize={48}
                                isAnimationActive={true}
                            >
                                {rows.map((entry, i) => {
                                    const num = typeof entry[modelId] === 'number' ? (entry[modelId] as number) : 0;
                                    return (
                                        <Cell
                                            key={`${modelId}-${i}`}
                                            fill={
                                                num === 0
                                                    ? borderColor
                                                    : CHART_COLORS[idx % CHART_COLORS.length]
                                            }
                                            opacity={num === 0 ? 0.4 : 1}
                                        />
                                    );
                                })}
                            </Bar>
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
                <MsqdxTypography
                    variant="caption"
                    sx={{ fontWeight: 600, color: textTertiary, display: 'block', mb: 'var(--msqdx-spacing-xxs)' }}
                >
                    {t('geoEeat.positionDiagramTableCaption')}
                </MsqdxTypography>
                <Box sx={{ border: TABLE_BORDER, borderRadius: `${TABLE_RADIUS}px`, overflow: 'hidden' }}>
                    <Box
                        component="table"
                        sx={{
                            width: '100%',
                            borderCollapse: 'collapse',
                        fontSize: 'var(--msqdx-font-size-sm, 12px)',
                        '& th, & td': {
                            border: TABLE_BORDER,
                            px: 'var(--msqdx-spacing-sm)',
                            py: 'var(--msqdx-spacing-xs)',
                            textAlign: 'left',
                        },
                        '& th': {
                            bgcolor: MSQDX_NEUTRAL[100],
                            color: textTertiary,
                            fontWeight: 600,
                        },
                        '& td': { color: textPrimary },
                        '& tr:hover td': { bgcolor: MSQDX_NEUTRAL[100] },
                    }}
                >
                    <thead>
                        <tr>
                            <th style={{ minWidth: 40 }}>{t('geoEeat.positionDiagramQueryIndex')}</th>
                            <th style={{ minWidth: 120 }}>{t('geoEeat.positionDiagramQuery')}</th>
                            {modelIds.map((m) => (
                                <th key={m} style={{ minWidth: 90 }}>
                                    {m}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.queryIndex}>
                                <td>{row.queryLabel}</td>
                                <td title={row.queryText} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row.queryText.slice(0, 50)}{row.queryText.length > 50 ? '…' : ''}
                                </td>
                                {modelIds.map((modelId) => {
                                    const pos = row[modelId];
                                    const num = typeof pos === 'number' && pos > 0 ? pos : null;
                                    const green = MSQDX_BRAND_PRIMARY?.green ?? '#22c55e';
                                    const bg =
                                        num === 1
                                            ? alpha(green, 0.15)
                                            : num === 2
                                              ? alpha(green, 0.08)
                                              : num != null && num <= 3
                                                ? alpha(MSQDX_BRAND_PRIMARY?.yellow ?? '#f59e0b', 0.08)
                                                : undefined;
                                    return (
                                        <td key={modelId} style={{ backgroundColor: bg }}>
                                            {num != null && num > 0 ? num : '–'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
