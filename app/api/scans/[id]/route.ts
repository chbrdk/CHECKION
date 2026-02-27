import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { deleteScan } from '@/lib/db/scans';
import { invalidateScan, invalidateScansList } from '@/lib/cache';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    const success = await deleteScan(id, session.user.id);

    if (!success) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND, { success: false });
    }
    invalidateScan(id);
    invalidateScansList(session.user.id);

    return NextResponse.json({ success: true, message: 'Scan deleted' });
}
