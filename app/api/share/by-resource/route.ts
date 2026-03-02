/* ------------------------------------------------------------------ */
/*  GET /api/share/by-resource?type=single|domain|journey&id=xxx       */
/*  Auth required. Returns existing share for this resource or 404.   */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getShareByResource } from '@/lib/db/shares';
import type { ShareResourceType } from '@/lib/db/shares';
import { SHARE_PATH } from '@/lib/constants';

export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ShareResourceType | null;
    const id = searchParams.get('id')?.trim() ?? '';
    if (!id || (type !== 'single' && type !== 'domain' && type !== 'journey' && type !== 'geo_eeat')) {
        return apiError('Query type (single|domain|journey|geo_eeat) and id required', API_STATUS.BAD_REQUEST);
    }

    const share = await getShareByResource(user.id, type, id);
    if (!share) {
        return NextResponse.json({ token: null, url: null, hasPassword: false, createdAt: null });
    }

    const origin = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const baseUrl = origin ? `${protocol}://${origin}` : '';
    const url = baseUrl ? `${baseUrl}${SHARE_PATH}/${encodeURIComponent(share.token)}` : `${SHARE_PATH}/${share.token}`;

    return NextResponse.json({
        token: share.token,
        url,
        hasPassword: share.hasPassword,
        createdAt: share.createdAt.toISOString(),
    });
}
