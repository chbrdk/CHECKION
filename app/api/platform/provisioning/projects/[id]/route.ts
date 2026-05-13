import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { API_STATUS, apiError } from '@/lib/api-error-handler';
import { getDb } from '@/lib/db';
import { getProject, getProjectRowByPlatformProjectId, insertProject } from '@/lib/db/projects';
import { countScansByProjectId } from '@/lib/db/scans';
import { projects } from '@/lib/db/schema';
import {
    PLEXON_CONTRACT_VERSION_HEADER,
    PLEXON_FEDERATION_CONTRACT_VERSION,
    PLEXON_SERVICE_SECRET_HEADER,
} from '@/lib/plexon-contract';

const upsertSchema = z.object({
    platformCompanyId: z.string().min(1),
    name: z.string().min(1),
    domain: z.string().nullable().optional(),
    status: z.enum(['active', 'archived']),
    ownerUserId: z.string().min(1),
    contractVersion: z.string().min(1),
    source: z.string().min(1),
    requestedAt: z.string().min(1),
});

const PLEXON_USER_HEADER = 'X-Plexon-User-Id';

function isProvisioningAuthorized(request: Request): boolean {
    const expectedSecret = process.env.PLEXON_SERVICE_SECRET?.trim();
    const requestSecret = request.headers.get(PLEXON_SERVICE_SECRET_HEADER)?.trim();
    const contractVersion = request.headers.get(PLEXON_CONTRACT_VERSION_HEADER)?.trim();
    return Boolean(
        expectedSecret &&
            requestSecret &&
            requestSecret === expectedSecret &&
            contractVersion === PLEXON_FEDERATION_CONTRACT_VERSION
    );
}

function jsonWithContract(body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set(PLEXON_CONTRACT_VERSION_HEADER, PLEXON_FEDERATION_CONTRACT_VERSION);
    return NextResponse.json(body, { ...init, headers });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    if (!isProvisioningAuthorized(request)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id: platformProjectIdRaw } = await context.params;
    const platformProjectId = platformProjectIdRaw?.trim();
    if (!platformProjectId) {
        return apiError('platform project id required', API_STATUS.BAD_REQUEST);
    }
    let body: z.infer<typeof upsertSchema>;
    try {
        body = upsertSchema.parse(await request.json());
    } catch {
        return apiError('Invalid provisioning payload', API_STATUS.BAD_REQUEST);
    }
    if (body.contractVersion !== PLEXON_FEDERATION_CONTRACT_VERSION) {
        return apiError('Unsupported provisioning contract version', API_STATUS.BAD_REQUEST);
    }

    const existing = await getProjectRowByPlatformProjectId(platformProjectId);
    const db = getDb();
    const now = new Date();
    if (existing) {
        await db
            .update(projects)
            .set({
                name: body.name.trim(),
                domain: body.domain !== undefined ? body.domain?.trim() || null : existing.domain,
                platformCompanyId: body.platformCompanyId.trim(),
                updatedAt: now,
            })
            .where(eq(projects.id, existing.id));
        return jsonWithContract({
            status: 'applied',
            externalProjectId: existing.id,
            details: 'CHECKION project mirror updated.',
        });
    }

    const newId = randomUUID();
    await insertProject(newId, body.ownerUserId.trim(), {
        name: body.name.trim(),
        domain: body.domain?.trim() || null,
        platformProjectId,
        platformCompanyId: body.platformCompanyId.trim(),
    });

    return jsonWithContract({
        status: 'applied',
        externalProjectId: newId,
        details: 'CHECKION project mirror created.',
    });
}

/**
 * Dashboard / BFF: scan summary for a platform project mirror.
 * Requires service secret + X-Plexon-User-Id with access to the local project.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    if (!isProvisioningAuthorized(request)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const plexonUserId = request.headers.get(PLEXON_USER_HEADER)?.trim();
    if (!plexonUserId) {
        return apiError(`${PLEXON_USER_HEADER} is required`, API_STATUS.BAD_REQUEST);
    }
    const { id: platformProjectIdRaw } = await context.params;
    const platformProjectId = platformProjectIdRaw?.trim();
    if (!platformProjectId) {
        return apiError('platform project id required', API_STATUS.BAD_REQUEST);
    }
    const row = await getProjectRowByPlatformProjectId(platformProjectId);
    if (!row) {
        return apiError('Not found', API_STATUS.NOT_FOUND);
    }
    const allowed = await getProject(row.id, plexonUserId);
    if (!allowed) {
        return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }
    const scanCount = await countScansByProjectId(row.id);
    return jsonWithContract({
        externalProjectId: row.id,
        scanCount,
    });
}
