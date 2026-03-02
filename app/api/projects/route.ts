/* ------------------------------------------------------------------ */
/*  CHECKION – GET/POST /api/projects                                 */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectCreateBodySchema } from '@/lib/api-schemas';
import { listProjects, insertProject } from '@/lib/db/projects';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const projects = await listProjects(session.user.id);
    return NextResponse.json({ success: true, data: projects });
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const parsed = await parseApiBody(request, projectCreateBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const id = uuidv4();
    await insertProject(id, session.user.id, {
        name: parsed.name,
        domain: parsed.domain ?? null,
    });
    return NextResponse.json({ success: true, id, name: parsed.name, domain: parsed.domain ?? null });
}
