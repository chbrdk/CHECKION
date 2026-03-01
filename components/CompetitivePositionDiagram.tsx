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
import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { CompetitiveBenchmarkResult } from '@/lib/types';

function extractHostname(input: string): string {
    const s = input.trim().toLowerCase();
    try {
        const u = new URL(s.startsWith('http') ? s : `https://${s}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? s;
    }
}

function citationMatchesDomain(citationDomain: string, ourDomain: string): boolean {
    const c = citationDomain.toLowerCase().trim();
    const d = ourDomain.toLowerCase().trim();
    if (c === d) return true;
    if (d.endsWith('.' + c)) return true;
    if (c.endsWith('.' + d)) return true;
    const dBase = d.split('.')[0];
    if (dBase && c === dBase) return true;
    if (dBase && c.startsWith(dBase + '.')) return true;
    return false;
}

/** Get position of target domain in this run's citations (1-based), or null if not cited. */
function getPositionForDomain(
    run: { citations?: Array<{ domain?: string; position?: number }> },
    targetDomain: string
): number | null {
    if (!run.citations?.length) return null;
    const match = run.citations.find((c) =>
        citationMatchesDomain((c.domain ?? '').trim(), targetDomain)
    );
    return match != null && typeof match.position === 'number' && match.position >= 1
        ? match.position
        : null;
}

export interface PositionMatrixRow {
    queryIndex: number;
    queryLabel: string;
    queryText: string;
    /** Position 1-based, or 0 if not cited (for chart/table). */
    [modelId: string]: number | string;
}

/** For chart: use 0 for "not cited". For table: show "–" when value is 0 or null. */
function buildPositionMatrix(
    competitiveByModel: Record<string, CompetitiveBenchmarkResult>,
    targetDomain: string
): { rows: PositionMatrixRow[]; modelIds: string[] } {
    const modelIds = Object.keys(competitiveByModel);
    if (modelIds.length === 0) return { rows: [], modelIds: [] };

    const first = competitiveByModel[modelIds[0]!];
    const runsCount = first?.runs?.length ?? 0;
    if (runsCount === 0) return { rows: [], modelIds: [] };

    const rows: PositionMatrixRow[] = [];
    for (let i = 0; i < runsCount; i++) {
        const row: PositionMatrixRow = {
            queryIndex: i + 1,
            queryLabel: `Q${i + 1}`,
            queryText: first!.runs![i]?.query ?? '',
        };
        for (const modelId of modelIds) {
            const result = competitiveByModel[modelId];
            const run = result?.runs?.[i];
            const pos = run ? getPositionForDomain(run, targetDomain) : null;
            row[modelId] = pos ?? 0;
        }
        rows.push(row);
    }
    return { rows, modelIds };
}

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

    return (
        <Box sx={{ mb: 3 }}>
            <MsqdxTypography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2, color: 'var(--color-text-on-light)' }}
            >
                {t('geoEeat.positionDiagramTitle')}
            </MsqdxTypography>
            <MsqdxTypography
                variant="body2"
                sx={{ color: 'var(--color-text-muted-on-light)', mb: 2, display: 'block' }}
            >
                {t('geoEeat.positionDiagramDescription')}
            </MsqdxTypography>

            <Box sx={{ width: '100%', height: 320, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={rows}
                        margin={{ top: 12, right: 12, left: 8, bottom: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis
                            dataKey="queryLabel"
                            tick={{ fill: 'var(--color-text-muted-on-light)', fontSize: 12 }}
                            stroke="var(--color-border)"
                        />
                        <YAxis
                            domain={[0, maxPos]}
                            allowDataOverflow
                            tick={{ fill: 'var(--color-text-muted-on-light)', fontSize: 12 }}
                            stroke="var(--color-border)"
                            label={{
                                value: t('geoEeat.positionDiagramYLabel'),
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: 'var(--color-text-muted-on-light)', fontSize: 11 },
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-card-bg)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 8,
                            }}
                            labelStyle={{ color: 'var(--color-text-on-light)' }}
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
                                radius={[2, 2, 0, 0]}
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
                                                    ? 'var(--color-border)'
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
                    sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}
                >
                    {t('geoEeat.positionDiagramTableCaption')}
                </MsqdxTypography>
                <Box
                    component="table"
                    sx={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 12,
                        '& th, & td': {
                            border: '1px solid var(--color-border)',
                            px: 1,
                            py: 0.75,
                            textAlign: 'left',
                        },
                        '& th': {
                            bgcolor: 'var(--color-card-bg)',
                            color: 'var(--color-text-muted-on-light)',
                            fontWeight: 600,
                        },
                        '& td': { color: 'var(--color-text-on-light)' },
                        '& tr:hover td': { bgcolor: 'var(--color-border)' },
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
                                    const bg =
                                        num === 1
                                            ? 'rgba(34, 197, 94, 0.15)'
                                            : num === 2
                                              ? 'rgba(34, 197, 94, 0.08)'
                                              : num != null && num <= 3
                                                ? 'rgba(245, 158, 11, 0.08)'
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
    );
}
