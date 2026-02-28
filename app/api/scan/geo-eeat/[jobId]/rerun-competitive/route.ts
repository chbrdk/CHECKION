/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat/[jobId]/rerun-competitive       */
/*  Re-runs only the competitive benchmark (questions analysis).      */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getGeoEeatRun, updateGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { runCompetitiveBenchmarkMultiModel } from '@/lib/geo-eeat/competitive-benchmark';
import type { GeoEeatIntensiveResult, CompetitiveBenchmarkResult } from '@/lib/types';

export const maxDuration = 300;

function getQueriesAndCompetitors(payload: GeoEeatIntensiveResult | null): { queries: string[]; competitors: string[] } | null {
    if (!payload) return null;
    const comp: CompetitiveBenchmarkResult | undefined =
        (payload.competitiveByModel && Object.keys(payload.competitiveByModel).length > 0)
            ? Object.values(payload.competitiveByModel)[0]
            : payload.competitive;
    if (!comp?.queries?.length && !comp?.competitors?.length) return null;
    return {
        queries: comp.queries ?? [],
        competitors: comp.competitors ?? [],
    };
}

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { jobId } = await params;
    if (!jobId) {
        return apiError('jobId required.', API_STATUS.BAD_REQUEST);
    }

    const run = await getGeoEeatRun(jobId, session.user.id);
    if (!run) {
        return apiError('Run not found.', API_STATUS.NOT_FOUND);
    }

    const prev = getQueriesAndCompetitors(run.payload);
    if (!prev || (prev.queries.length === 0 && prev.competitors.length === 0)) {
        return apiError(
            'No previous questions analysis to rerun. Run a full analysis with questions and competitors first.',
            API_STATUS.BAD_REQUEST
        );
    }

    const currentPayload: GeoEeatIntensiveResult = run.payload ?? { pages: [], recommendations: [] };

    (async () => {
        try {
            await updateGeoEeatRun(jobId, session.user.id, { status: 'running' });
            const competitiveByModel = await runCompetitiveBenchmarkMultiModel(
                run.url,
                prev.competitors,
                prev.queries
            );
            const nextPayload: GeoEeatIntensiveResult = {
                ...currentPayload,
                competitiveByModel: Object.keys(competitiveByModel).length > 0 ? competitiveByModel : currentPayload.competitiveByModel,
            };
            await updateGeoEeatRun(jobId, session.user.id, {
                status: 'complete',
                payload: nextPayload,
                error: null,
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[CHECKION] GEO/E-E-A-T rerun competitive failed:', e);
            await updateGeoEeatRun(jobId, session.user.id, {
                status: 'error',
                error: message,
            });
        }
    })();

    return NextResponse.json({ success: true, status: 'running' }, { status: 202 });
}
