/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/rank-tracking/keywords/bulk                   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, rankTrackingKeywordsBulkBodySchema } from '@/lib/api-schemas';
import { getProject } from '@/lib/db/projects';
import { insertKeywords } from '@/lib/db/rank-tracking-keywords';
import { resolveIntentFields } from '@/lib/serp-intent';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const parsed = await parseApiBody(request, rankTrackingKeywordsBulkBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const project = await getProject(parsed.projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const seedLabel =
        parsed.intentLabel?.trim() ||
        parsed.variants[0]?.keyword.trim() ||
        'intent';
    const { intentKey, intentLabel } = resolveIntentFields(
        seedLabel,
        parsed.intentKey,
        parsed.intentLabel ?? seedLabel
    );

    const rows = parsed.variants.map((v) => ({
        id: uuidv4(),
        data: {
            domain: parsed.domain,
            keyword: v.keyword.trim(),
            country: v.country,
            language: v.language,
            intentKey,
            intentLabel,
            device: parsed.device ?? undefined,
        },
    }));

    await insertKeywords(project.userId, parsed.projectId, rows);
    return NextResponse.json({
        success: true,
        intentKey,
        intentLabel,
        ids: rows.map((r) => r.id),
    });
}
