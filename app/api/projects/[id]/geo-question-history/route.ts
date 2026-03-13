/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/geo-question-history            */
/*  Returns time series of positions per question (like rank positions for SEO). */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import { listCompetitiveRunsByGeoEeatJob } from '@/lib/db/geo-eeat-competitive-runs';
import { extractHostname, buildPositionMatrixMultiDomain } from '@/lib/geo-eeat/position-matrix';
import type { CompetitiveBenchmarkResult } from '@/lib/types';

export interface GeoQuestionHistoryPoint {
    recordedAt: string;
    /** Our domain position per model */
    positionsByModel: Record<string, number | null>;
    /** Competitor domain position per model (for chart: one line per domain) */
    competitorPositionsByModel?: Record<string, Record<string, number | null>>;
}

/** List of competitor domains (normalized hostnames) for the project; included in response for chart legend. */
export interface GeoQuestionHistoryResponse {
    success: boolean;
    targetDomain: string;
    competitorDomains: string[];
    questions: GeoQuestionHistoryItem[];
}

export interface GeoQuestionHistoryItem {
    queryText: string;
    queryIndex: number;
    points: GeoQuestionHistoryPoint[];
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const targetDomain = project.domain
        ? extractHostname(project.domain.includes('://') ? project.domain : `https://${project.domain}`)
        : '';
    if (!targetDomain) {
        return NextResponse.json({ success: true, targetDomain: '', competitorDomains: [], questions: [] });
    }

    const competitorDomains = (project.competitors ?? [])
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        .map((c) => extractHostname(c.trim().startsWith('http') ? c.trim() : `https://${c.trim()}`))
        .filter((d) => d !== targetDomain);
    const domains = [targetDomain, ...competitorDomains];

    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 50;
    const runs = await listGeoEeatRuns(user.id, limit, { projectId });

    /** Collect (recordedAt, competitiveByModel) from main run payload and from competitive runs. */
    const samples: { recordedAt: Date; competitiveByModel: Record<string, CompetitiveBenchmarkResult> }[] = [];

    for (const run of runs) {
        if (run.status !== 'complete') continue;

        if (run.payload?.competitiveByModel && Object.keys(run.payload.competitiveByModel).length > 0) {
            samples.push({
                recordedAt: run.updatedAt ?? run.createdAt,
                competitiveByModel: run.payload.competitiveByModel,
            });
        }

        const competitiveRuns = await listCompetitiveRunsByGeoEeatJob(run.id, user.id, 20);
        for (const cr of competitiveRuns) {
            if (cr.status !== 'complete' || !cr.competitiveByModel || !cr.completedAt) continue;
            samples.push({
                recordedAt: cr.completedAt,
                competitiveByModel: cr.competitiveByModel,
            });
        }
    }

    samples.sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

    const byQueryText = new Map<string, GeoQuestionHistoryItem>();

    for (const { recordedAt, competitiveByModel } of samples) {
        const { rows, modelIds } = buildPositionMatrixMultiDomain(competitiveByModel, domains);
        const recordedAtIso = recordedAt.toISOString();

        for (const row of rows) {
            const text = (row.queryText || `Q${row.queryIndex}`).trim();
            const key = text || `index-${row.queryIndex}`;
            const positionsByModel: Record<string, number | null> = {};
            const competitorPositionsByModel: Record<string, Record<string, number | null>> = {};
            for (const modelId of modelIds) {
                const byDomain = row.positionsByModelByDomain[modelId] ?? {};
                const ourPos = byDomain[targetDomain];
                positionsByModel[modelId] = typeof ourPos === 'number' && ourPos > 0 ? ourPos : null;
                competitorPositionsByModel[modelId] = {};
                for (const dom of competitorDomains) {
                    const pos = byDomain[dom];
                    competitorPositionsByModel[modelId][dom] = typeof pos === 'number' && pos > 0 ? pos : null;
                }
            }

            let item = byQueryText.get(key);
            if (!item) {
                item = { queryText: text || row.queryLabel, queryIndex: row.queryIndex, points: [] };
                byQueryText.set(key, item);
            }
            item.points.push({
                recordedAt: recordedAtIso,
                positionsByModel,
                competitorPositionsByModel: competitorDomains.length > 0 ? competitorPositionsByModel : undefined,
            });
        }
    }

    const questions = Array.from(byQueryText.values()).map((q) => ({
        queryText: q.queryText,
        queryIndex: q.queryIndex,
        points: q.points.sort(
            (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        ),
    }));

    return NextResponse.json({
        success: true,
        targetDomain,
        competitorDomains,
        questions,
    });
}
