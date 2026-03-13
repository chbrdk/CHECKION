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
import { extractHostname, buildPositionMatrix } from '@/lib/geo-eeat/position-matrix';
import type { CompetitiveBenchmarkResult } from '@/lib/types';

export interface GeoQuestionHistoryPoint {
    recordedAt: string;
    positionsByModel: Record<string, number | null>;
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
        return NextResponse.json({ success: true, targetDomain: '', questions: [] });
    }

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
        const { rows, modelIds } = buildPositionMatrix(competitiveByModel, targetDomain);
        const recordedAtIso = recordedAt.toISOString();

        for (const row of rows) {
            const text = (row.queryText || `Q${row.queryIndex}`).trim();
            const key = text || `index-${row.queryIndex}`;
            const positionsByModel: Record<string, number | null> = {};
            for (const modelId of modelIds) {
                const v = row[modelId];
                positionsByModel[modelId] = typeof v === 'number' && v > 0 ? v : null;
            }

            let item = byQueryText.get(key);
            if (!item) {
                item = { queryText: text || row.queryLabel, queryIndex: row.queryIndex, points: [] };
                byQueryText.set(key, item);
            }
            item.points.push({ recordedAt: recordedAtIso, positionsByModel });
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
        questions,
    });
}
