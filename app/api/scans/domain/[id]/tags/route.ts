/* PATCH /api/scans/domain/[id]/tags — scan-level tags (owner only). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, domainScanTagsBodySchema } from '@/lib/api-schemas';
import { invalidateDomainList } from '@/lib/cache';
import { updateDomainScanTags } from '@/lib/db/scans';
import { normalizeTagList } from '@/lib/tag-utils';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id } = await context.params;
    if (!id?.trim()) return apiError('Domain scan ID required', API_STATUS.BAD_REQUEST);

    const parsed = await parseApiBody(request, domainScanTagsBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const updated = await updateDomainScanTags(id, user.id, parsed.tags);
    if (!updated) return apiError('Domain scan not found', API_STATUS.NOT_FOUND);

    invalidateDomainList(user.id);
    return NextResponse.json({ success: true, tags: normalizeTagList(parsed.tags) });
}
