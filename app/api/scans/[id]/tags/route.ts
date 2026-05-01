/* PATCH /api/scans/[id]/tags — standalone WCAG scan tags (owner only). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, domainScanTagsBodySchema } from '@/lib/api-schemas';
import { invalidateScansList } from '@/lib/cache';
import { updateStandaloneScanTags } from '@/lib/db/scans';
import { normalizeTagList } from '@/lib/tag-utils';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id } = await context.params;
    if (!id?.trim()) return apiError('Scan ID required', API_STATUS.BAD_REQUEST);

    const parsed = await parseApiBody(request, domainScanTagsBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const updated = await updateStandaloneScanTags(id, user.id, parsed.tags);
    if (!updated) return apiError('Scan not found', API_STATUS.NOT_FOUND);

    invalidateScansList(user.id);
    return NextResponse.json({ success: true, tags: normalizeTagList(parsed.tags) });
}
