/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/projects/[id]/geo-summary                     */
/*  Returns GEO score (0–100) from latest competitive run + latest runs list. */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';
import type { GeoEeatIntensiveResult, CompetitiveBenchmarkResult, CompetitiveMetrics } from '@/lib/types';

const RUNS_LIMIT = 5;

function normalizeDomain(urlOrDomain: string): string {
    let s = urlOrDomain.trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? '';
    return s;
}

/** Derive 0–100 score from competitive metrics for a domain. Uses shareOfVoice (0–1 → *100) or avgPosition (1→100, 2→90, …). */
function scoreFromMetrics(metrics: CompetitiveMetrics | undefined): number | null {
    if (!metrics) return null;
    if (typeof metrics.shareOfVoice === 'number' && metrics.shareOfVoice >= 0) {
        return Math.min(100, Math.round(metrics.shareOfVoice * 100));
    }
    if (typeof metrics.avgPosition === 'number' && metrics.avgPosition >= 1) {
        if (metrics.avgPosition <= 10) return 110 - 10 * metrics.avgPosition;
        return 0;
    }
    return null;
}

function getScoreFromCompetitive(
    payload: GeoEeatIntensiveResult | null,
    projectDomain: string
): number | null {
    if (!payload) return null;
    const byModel = payload.competitiveByModel ?? (payload.competitive ? { default: payload.competitive } : null);
    if (!byModel || typeof byModel !== 'object') return null;

    const normalizedProject = normalizeDomain(projectDomain);
    if (!normalizedProject) return null;

    const scores: number[] = [];
    for (const result of Object.values(byModel) as CompetitiveBenchmarkResult[]) {
        if (!result?.metrics || !Array.isArray(result.metrics)) continue;
        const forDomain = result.metrics.find(
            (m) => normalizeDomain(m.domain) === normalizedProject
        );
        const s = scoreFromMetrics(forDomain);
        if (s != null) scores.push(s);
    }
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
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

    const runs = await listGeoEeatRuns(user.id, RUNS_LIMIT, { projectId });

    let score: number | null = null;
    const projectDomain = project.domain ?? '';
    for (const run of runs) {
        if (run.status !== 'complete' || !run.payload) continue;
        const s = getScoreFromCompetitive(run.payload, projectDomain);
        if (s != null) {
            score = s;
            break;
        }
    }

    return NextResponse.json({
        success: true,
        data: {
            score,
            runs: runs.map((r) => ({
                id: r.id,
                url: r.url,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
            })),
        },
    });
}
