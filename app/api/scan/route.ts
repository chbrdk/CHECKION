/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan                                         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, handleApiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, scanBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { runScan } from '@/lib/scanner';
import { addScan } from '@/lib/db/scans';
import { listCachedStandaloneScans, getCachedStandaloneScansCount, invalidateScansList } from '@/lib/cache';
import type { Device } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';

export async function POST(request: Request) {
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
    try {
        const parsed = await parseApiBody(request, scanBodySchema);
        if (parsed instanceof NextResponse) return parsed;
        const body = parsed;

        const groupId = uuidv4();
        const devices: Device[] = ['desktop', 'tablet', 'mobile'];

        // Run scans in parallel
        const results = await Promise.all(
            devices.map(device =>
                runScan({
                    url: body.url,
                    standard: body.standard,
                    runners: body.runners,
                    device,
                    groupId,
                    targetRegion: body.targetRegion,
                })
            )
        );

        for (const result of results) {
            await addScan(
                session.user.id,
                result,
                body.projectId !== undefined ? { projectId: body.projectId } : undefined
            );
        }
        invalidateScansList(session.user.id);

        // Saliency heatmap: user starts it on the result page (POST /api/saliency/generate → jobId → poll /api/saliency/result) to avoid timeouts.

        // Find desktop result to return (for redirect)
        const desktopResult = results.find(r => r.device === 'desktop') || results[0];

        return NextResponse.json({
            success: true,
            data: desktopResult
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return handleApiError(err, {
            context: 'Scan failed',
            publicMessage: `Scan failed: ${message}`,
        });
    }
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || DASHBOARD_SCANS_PAGE_SIZE), 100);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam === '' || projectIdParam === null ? null : projectIdParam ?? undefined;
    const [list, total] = await Promise.all([
        listCachedStandaloneScans(session.user.id, { limit, offset, projectId }),
        getCachedStandaloneScansCount(session.user.id, projectId),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        data: list,
        pagination: { total, page, limit, totalPages },
    });
}
