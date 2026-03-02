/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/projects                                 */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectCreateBodySchema } from '@/lib/api-schemas';
import { listProjects, insertProject } from '@/lib/db/projects';
import { v4 as uuidv4 } from 'uuid';

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
    const id = uuidv4();
    await insertProject(id, user.id, {
        name: parsed.name,
        domain: parsed.domain ?? null,
    });
    return NextResponse.json({ success: true, id, name: parsed.name, domain: parsed.domain ?? null });
}
