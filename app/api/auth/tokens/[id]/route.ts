/* ------------------------------------------------------------------ */
/*  CHECKION – DELETE /api/auth/tokens/[id] (revoke API token)         */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { revokeApiToken } from '@/lib/db/api-tokens';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(_request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    if (!id) {
        return apiError('Token ID required', API_STATUS.BAD_REQUEST);
    }
    const revoked = await revokeApiToken(id, user.id);
    if (!revoked) {
        return apiError('Token not found or already revoked', API_STATUS.NOT_FOUND);
    }
    return NextResponse.json({ success: true });
}
