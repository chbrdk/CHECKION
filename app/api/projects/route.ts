/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/projects                                 */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectCreateBodySchema } from '@/lib/api-schemas';
import { listProjects, insertProject } from '@/lib/db/projects';
import { v4 as uuidv4 } from 'uuid';
import { isPlexonAuthConfigured, getPlexonProfile } from '@/lib/plexon-auth';
import {
    extractPlatformCompanyIdFromSearchParams,
    normalizePlatformCompanyId,
} from '@/lib/platform-company-context';

export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const projects = await listProjects(user.id);
    return NextResponse.json({ success: true, data: projects });
}

export async function POST(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const parsed = await parseApiBody(request, projectCreateBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    let platformCompanyId = normalizePlatformCompanyId(parsed.platformCompanyId);
    if (!platformCompanyId) {
        try {
            const reqUrl = new URL(request.url);
            platformCompanyId = extractPlatformCompanyIdFromSearchParams(reqUrl.searchParams);
        } catch {
            /* ignore invalid request.url */
        }
    }
    if (!platformCompanyId && isPlexonAuthConfigured()) {
        const prof = await getPlexonProfile(user.id);
        platformCompanyId = normalizePlatformCompanyId(prof?.default_platform_company_id);
    }

    const id = uuidv4();
    await insertProject(id, user.id, {
        name: parsed.name,
        domain: parsed.domain ?? null,
        industry: parsed.industry ?? undefined,
        tags: parsed.tags,
        platformCompanyId: platformCompanyId ?? undefined,
    });
    return NextResponse.json({
        success: true,
        id,
        name: parsed.name,
        domain: parsed.domain ?? null,
        platformCompanyId: platformCompanyId ?? null,
    });
}
