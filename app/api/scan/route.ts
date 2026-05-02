/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan                                         */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, handleApiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, scanBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { runScan } from '@/lib/scanner';
import {
    insertScanSession,
    persistStandaloneScanRow,
    listScansByGroupId,
} from '@/lib/db/scans';
import { getProject } from '@/lib/db/projects';
import { normalizeTagList } from '@/lib/tag-utils';
import { listCachedStandaloneScanSummaries, getCachedStandaloneScansCount, invalidateScansList } from '@/lib/cache';
import type { Device, ScanDevicePhase, ScanResult } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import {
    DASHBOARD_SCANS_PAGE_SIZE,
    HEADER_CHECKION_SCAN_STREAM,
    HEADER_CHECKION_SCAN_STREAM_OFF,
} from '@/lib/constants';
import { reportUsage } from '@/lib/usage-report';
import { maybeAutoFillProjectClassificationFromStandaloneScan } from '@/lib/project-industry-auto';
import type { ScanNdjsonLine } from '@/lib/scan-progress';
import { resolveStandaloneScanDevices } from '@/lib/standalone-scan-devices';

type ScanBody = z.infer<typeof scanBodySchema>;

/** NDJSON unless client explicitly opts into legacy JSON (`x-checkion-scan-stream: 0`). */
function wantsNdjsonStream(request: Request): boolean {
    return request.headers.get(HEADER_CHECKION_SCAN_STREAM) !== HEADER_CHECKION_SCAN_STREAM_OFF;
}

async function executeStandaloneScan(
    user: { id: string },
    body: ScanBody,
    hooks?: {
        onDeviceProgress?: (e: { phase: ScanDevicePhase; device: Device }) => void;
        afterSessionInsert?: () => void | Promise<void>;
        beforePersist?: () => void | Promise<void>;
    }
): Promise<ScanResult> {
    const groupId = uuidv4();
    const devices: Device[] = resolveStandaloneScanDevices(body);

    await insertScanSession({
        id: groupId,
        userId: user.id,
        url: body.url,
        projectId: body.projectId,
        standard: body.standard ?? null,
        runners: body.runners ?? null,
        targetRegion: body.targetRegion?.trim() || null,
    });

    await hooks?.afterSessionInsert?.();

    let sessionTags: string[] = [];
    if (body.projectId) {
        const proj = await getProject(body.projectId, user.id);
        if (proj) sessionTags = normalizeTagList(proj.tags);
    }

    const results = await Promise.all(
        devices.map((device) =>
            runScan({
                url: body.url,
                standard: body.standard,
                runners: body.runners,
                device,
                groupId,
                targetRegion: body.targetRegion,
                userId: user.id,
                onProgress: hooks?.onDeviceProgress,
            })
        )
    );

    await hooks?.beforePersist?.();

    for (const result of results) {
        await persistStandaloneScanRow(user.id, result, {
            projectId: body.projectId,
            scanSessionId: groupId,
            tags: sessionTags,
        });
    }
    invalidateScansList(user.id);

    try {
        reportUsage({
            userId: user.id,
            eventType: 'scan_wcag',
            rawUnits: { scans: results.length },
        });
    } catch {
        /* never let usage reporting affect the response */
    }

    const desktopResult = results.find((r) => r.device === 'desktop') || results[0];

    if (body.projectId) {
        void maybeAutoFillProjectClassificationFromStandaloneScan({
            userId: user.id,
            projectId: body.projectId,
            scanUrl: body.url,
            scanSessionId: groupId,
            desktopResult,
        });
    }

    return desktopResult;
}

export async function POST(request: Request) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
        }
        const rl = await checkRateLimit(`scan:${user.id}`, 'default');
        if (!rl.allowed) {
            return apiError(
                'Too many requests. Please try again later.',
                API_STATUS.TOO_MANY_REQUESTS,
                rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
            );
        }
        const parsed = await parseApiBody(request, scanBodySchema);
        if (parsed instanceof NextResponse) return parsed;
        const body = parsed;

        if (wantsNdjsonStream(request)) {
            const encoder = new TextEncoder();
            const stream = new ReadableStream<Uint8Array>({
                async start(controller) {
                    const send = (line: ScanNdjsonLine) => {
                        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
                    };
                    try {
                        const desktopResult = await executeStandaloneScan(user, body, {
                            afterSessionInsert: () => {
                                send({ type: 'progress', phase: 'session_created' });
                            },
                            onDeviceProgress: (e) => {
                                send({ type: 'progress', ...e });
                            },
                            beforePersist: () => {
                                send({ type: 'progress', phase: 'saving_results' });
                            },
                        });
                        send({ type: 'complete', data: desktopResult });
                    } catch (err) {
                        const message = err instanceof Error ? err.message : 'Unknown error';
                        console.error('[CHECKION] POST /api/scan (stream) failed:', message);
                        send({ type: 'error', message: `Scan failed: ${message}` });
                    } finally {
                        try {
                            controller.close();
                        } catch {
                            /* already closed */
                        }
                    }
                },
            });
            return new Response(stream, {
                status: 200,
                headers: {
                    'Content-Type': 'application/x-ndjson; charset=utf-8',
                    'Cache-Control': 'no-store',
                },
            });
        }

        const desktopResult = await executeStandaloneScan(user, body);
        return NextResponse.json({
            success: true,
            data: desktopResult,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        const stack = err instanceof Error ? err.stack : undefined;
        console.error('[CHECKION] POST /api/scan failed:', message, stack ?? '');
        return handleApiError(err, {
            context: 'Scan failed',
            publicMessage: `Scan failed: ${message}`,
        });
    }
}

export async function GET(req: NextRequest) {
    const user = await getRequestUser(req);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId')?.trim();
    if (groupId) {
        const devices = await listScansByGroupId(user.id, groupId);
        const total = devices.length;
        return NextResponse.json({
            data: devices,
            pagination: { total, page: 1, limit: Math.max(total, 1), totalPages: 1 },
        });
    }
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || DASHBOARD_SCANS_PAGE_SIZE), 100);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const projectIdParam = searchParams.get('projectId');
    const projectId = projectIdParam === '' || projectIdParam === null ? null : projectIdParam ?? undefined;
    const industryRaw = searchParams.get('industry');
    const industry =
        industryRaw && industryRaw.trim().length > 0 ? industryRaw.trim().slice(0, 128) : undefined;
    const tagRaw = searchParams.get('tag');
    const tag = tagRaw && tagRaw.trim().length > 0 ? tagRaw.trim().slice(0, 48) : undefined;
    const listOpts = { limit, offset, projectId, industry, tag };
    const [list, total] = await Promise.all([
        listCachedStandaloneScanSummaries(user.id, listOpts),
        getCachedStandaloneScansCount(user.id, { projectId, industry, tag }),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        data: list,
        pagination: { total, page, limit, totalPages },
    });
}
