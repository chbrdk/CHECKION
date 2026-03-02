import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { deleteDomainScan } from '@/lib/db/scans';
import { invalidateDomainScan, invalidateDomainList } from '@/lib/cache';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const success = await deleteDomainScan(id, user.id);

    if (!success) {
        return apiError('Domain scan not found', API_STATUS.NOT_FOUND, { success: false });
    }
    invalidateDomainScan(id);
    invalidateDomainList(user.id);

    return NextResponse.json({ success: true, message: 'Domain scan deleted' });
}
