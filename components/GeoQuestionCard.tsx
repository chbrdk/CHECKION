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
    /** modelId -> competitorDomain -> position (only when API returns competitors) */
    competitorPositionsByModel?: Record<string, Record<string, number | null>>;
}

export interface GeoQuestionCardProps {
    queryText: string;
    queryIndex: number;
    points: GeoQuestionHistoryPoint[];
    targetDomain: string;
    competitorDomains: string[];
    /** When set, model is controlled from parent (central selector); card does not show model chips. */
    selectedModelId?: string | null;
    t: (key: string, params?: Record<string, string | number>) => string;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** Single question card: line chart over time (our domain + competitors per model), like RankTrackingChart. */
export function GeoQuestionCard({ queryText, queryIndex, points, targetDomain, competitorDomains, selectedModelId: controlledModelId, t }: GeoQuestionCardProps) {
    const [timeRangeIndex, setTimeRangeIndex] = useState(1);
    const limit = TIME_RANGES[timeRangeIndex]?.limit ?? 30;

    const hasCompetitors = competitorDomains.length > 0 && points.some((p) => p.competitorPositionsByModel);

    const modelIds = useMemo(() => {
        const set = new Set<string>();
        for (const p of points) {
            for (const k of Object.keys(p.positionsByModel)) set.add(k);
        }
        return Array.from(set);
    }, [points]);

    const [localModelIndex, setLocalModelIndex] = useState(0);
    const isModelControlled = controlledModelId !== undefined && controlledModelId !== null;
    const selectedModel = isModelControlled
        ? (modelIds.includes(controlledModelId!) ? controlledModelId! : modelIds[0] ?? null)
        : (modelIds[Math.min(localModelIndex, modelIds.length - 1)] ?? null);

    const allDomains = useMemo(
        () => [targetDomain, ...competitorDomains],
        [targetDomain, competitorDomains]
    );

    const { chartData, maxPos } = useMemo(() => {
        if (points.length === 0) return { chartData: [], maxPos: 10 };
        const sorted = [...points].sort(
            (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        const sliced = limit < 365 ? sorted.slice(-limit) : sorted;

        if (hasCompetitors && selectedModel) {
            const data = sliced.map((p) => {
                const row: Record<string, string | number | null> = {
                    date: formatDate(p.recordedAt),
                    recordedAt: p.recordedAt,
                };
                row[targetDomain] = p.positionsByModel[selectedModel] ?? null;
                const compByModel = p.competitorPositionsByModel?.[selectedModel];
                for (const dom of competitorDomains) {
                    row[dom] = compByModel?.[dom] ?? null;
                }
                return row;
            });
            let max = 6;
            for (const row of data) {
                for (const dom of allDomains) {
                    const v = row[dom];
                    if (typeof v === 'number' && v > 0 && v > max) max = v;
                }
            }
            return { chartData: data, maxPos: Math.max(max, 6) };
        }

        const data = sliced.map((p) => {
            const row: Record<string, string | number | null> = {
                date: formatDate(p.recordedAt),
                recordedAt: p.recordedAt,
            };
            for (const m of modelIds) {
                row[m] = p.positionsByModel[m] ?? null;
            }
            return row;
        });
        let max = 6;
        for (const row of data) {
            for (const m of modelIds) {
                const v = row[m];
                if (typeof v === 'number' && v > 0 && v > max) max = v;
            }
        }
        return { chartData: data, maxPos: Math.max(max, 6) };
    }, [points, limit, hasCompetitors, selectedModel, targetDomain, competitorDomains, allDomains, modelIds]);

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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, mt: 1, mb: 0.5 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
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
                    {hasCompetitors && modelIds.length > 0 && !isModelControlled && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {modelIds.map((modelId, idx) => (
                                <MsqdxChip
                                    key={modelId}
                                    label={modelId}
                                    variant={localModelIndex === idx ? 'filled' : 'outlined'}
                                    size="small"
                                    onClick={() => setLocalModelIndex(idx)}
                                    sx={{ cursor: 'pointer', fontSize: 10 }}
                                />
                            ))}
                        </Box>
                    )}
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
                            width={28}
                        />
                        <Tooltip
                            contentStyle={tooltipContentStyle}
                            formatter={(value: unknown) => (typeof value === 'number' && value > 0 ? `${t('geoEeat.positionShort')} ${value}` : t('geoEeat.positionNotCited'))}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} iconType="line" />
                        {hasCompetitors && selectedModel
                            ? allDomains.map((dom, idx) => (
                                  <Line
                                      key={dom}
                                      type="monotone"
                                      dataKey={dom}
                                      name={dom}
                                      stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                      strokeWidth={dom === targetDomain ? 2.5 : 2}
                                      dot={{ r: dom === targetDomain ? 3 : 2.5 }}
                                      connectNulls
                                  />
                              ))
                            : modelIds.map((modelId, idx) => (
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
