/**
 * Shared GEO question position history for project APIs and report collector.
 */

import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { listCompetitiveRunsByGeoEeatJob } from '@/lib/db/geo-eeat-competitive-runs';
import { extractHostname, buildPositionMatrixMultiDomain } from '@/lib/geo-eeat/position-matrix';
import type { CompetitiveBenchmarkResult } from '@/lib/types';
import type { GeoQuestionHistoryFact } from '@/lib/project-report/types';

export interface BuildGeoQuestionHistoryOptions {
    projectUserId: string;
    projectId: string;
    targetDomain: string;
    competitorDomains: string[];
    runsLimit?: number;
}

function avgPositionFromPoint(
    positionsByModel: Record<string, number | null>
): number | null {
    const vals = Object.values(positionsByModel).filter(
        (p): p is number => p != null && p > 0
    );
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function computeTrend(
    points: Array<{ avgPosition: number | null }>
): GeoQuestionHistoryFact['trend'] {
    const valid = points.filter((p) => p.avgPosition != null) as Array<{ avgPosition: number }>;
    if (valid.length < 2) return 'unknown';
    const first = valid[0]!.avgPosition;
    const last = valid[valid.length - 1]!.avgPosition;
    const delta = last - first;
    if (delta <= -0.5) return 'improving';
    if (delta >= 0.5) return 'declining';
    return 'stable';
}

export async function buildProjectGeoQuestionHistory(
    options: BuildGeoQuestionHistoryOptions
): Promise<GeoQuestionHistoryFact[]> {
    const { projectUserId, projectId, targetDomain, competitorDomains } = options;
    const limit = options.runsLimit ?? 50;
    if (!targetDomain) return [];

    const domains = [targetDomain, ...competitorDomains];
    const runs = await listGeoEeatRuns(projectUserId, limit, { projectId });

    const samples: { recordedAt: Date; competitiveByModel: Record<string, CompetitiveBenchmarkResult> }[] =
        [];

    for (const run of runs) {
        if (run.status !== 'complete') continue;
        if (run.payload?.competitiveByModel && Object.keys(run.payload.competitiveByModel).length > 0) {
            samples.push({
                recordedAt: run.updatedAt ?? run.createdAt,
                competitiveByModel: run.payload.competitiveByModel,
            });
        }
        const competitiveRuns = await listCompetitiveRunsByGeoEeatJob(run.id, projectUserId, 20);
        for (const cr of competitiveRuns) {
            if (cr.status !== 'complete' || !cr.competitiveByModel || !cr.completedAt) continue;
            samples.push({
                recordedAt: cr.completedAt,
                competitiveByModel: cr.competitiveByModel,
            });
        }
    }

    samples.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

    const byQueryText = new Map<
        string,
        { queryText: string; queryIndex: number; points: GeoQuestionHistoryFact['points'] }
    >();

    for (const { recordedAt, competitiveByModel } of samples) {
        const { rows, modelIds } = buildPositionMatrixMultiDomain(competitiveByModel, domains);
        const recordedAtIso = recordedAt.toISOString();

        for (const row of rows) {
            const text = (row.queryText || `Q${row.queryIndex}`).trim();
            const key = text || `index-${row.queryIndex}`;
            const positionsByModel: Record<string, number | null> = {};
            for (const modelId of modelIds) {
                const byDomain = row.positionsByModelByDomain[modelId] ?? {};
                const ourPos = byDomain[targetDomain];
                positionsByModel[modelId] = typeof ourPos === 'number' && ourPos > 0 ? ourPos : null;
            }
            const avgPosition = avgPositionFromPoint(positionsByModel);

            let item = byQueryText.get(key);
            if (!item) {
                item = { queryText: text || row.queryLabel, queryIndex: row.queryIndex, points: [] };
                byQueryText.set(key, item);
            }
            item.points.push({ recordedAt: recordedAtIso, avgPosition });
        }
    }

    return Array.from(byQueryText.values()).map((q, i) => {
        const sorted = q.points.sort(
            (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        const latest = sorted.length > 0 ? sorted[sorted.length - 1]!.avgPosition : null;
        return {
            queryText: q.queryText,
            queryIndex: q.queryIndex,
            points: sorted,
            latestPosition: latest,
            trend: computeTrend(sorted),
            evidenceId: `ev-geo-query-${i}`,
        };
    });
}

export function normalizeProjectDomainHost(domain: string | null): string {
    if (!domain?.trim()) return '';
    return extractHostname(domain.includes('://') ? domain : `https://${domain}`);
}
