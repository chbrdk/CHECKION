import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { deleteScan } from '@/lib/db/scans';
import { invalidateScan, invalidateScansList } from '@/lib/cache';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const success = await deleteScan(id, user.id);

    if (!success) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND, { success: false });
    }
    invalidateScan(id);
    invalidateScansList(user.id);

    return NextResponse.json({ success: true, message: 'Scan deleted' });
}
