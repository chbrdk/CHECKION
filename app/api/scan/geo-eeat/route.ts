/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat (GEO / E-E-A-T intensive)      */
/*  Starts a GEO/E-E-A-T run: Stufe 1 (technical) in background.     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, geoEeatBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { runScan } from '@/lib/scanner';
import { insertGeoEeatRun, updateGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { buildGeoEeatResultFromScan } from '@/lib/geo-eeat/stage1';
import { runLlmStages } from '@/lib/geo-eeat/run-llm-stages';
import { runCompetitiveBenchmarkMultiModel } from '@/lib/geo-eeat/competitive-benchmark';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const rl = checkRateLimit(`scan:${session.user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const parsed = await parseApiBody(request, geoEeatBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const { url, domainScanId, runCompetitive, competitors, queries } = parsed;

    const jobId = uuidv4();
    await insertGeoEeatRun(jobId, session.user.id, url, {
        domainScanId: domainScanId ?? undefined,
    });

    (async () => {
        try {
            await updateGeoEeatRun(jobId, session.user.id, { status: 'running' });
            const scan = await runScan({
                url,
                standard: 'WCAG2AA',
                runners: ['axe', 'htmlcs'],
                device: 'desktop',
            });
            let payload = buildGeoEeatResultFromScan(scan);
            try {
                payload = await runLlmStages(payload);
            } catch (e) {
                console.error('[CHECKION] GEO/E-E-A-T LLM stages error:', e);
            }
            if (runCompetitive && ((queries?.length ?? 0) > 0 || (competitors?.length ?? 0) > 0)) {
                const competitiveByModel = await runCompetitiveBenchmarkMultiModel(
                    url,
                    competitors ?? [],
                    queries ?? []
                );
                if (Object.keys(competitiveByModel).length > 0) payload.competitiveByModel = competitiveByModel;
            }
            await updateGeoEeatRun(jobId, session.user.id, {
                status: 'complete',
                payload,
            });
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[CHECKION] GEO/E-E-A-T run failed:', e);
            await updateGeoEeatRun(jobId, session.user.id, {
                status: 'error',
                error: message,
            });
        }
    })();

    return NextResponse.json(
        { success: true, jobId },
        { status: 202 }
    );
}
