import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listScans } from '@/lib/db/scans';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const scans = await listScans(session.user.id);
    return NextResponse.json({
        success: true,
        count: scans.length,
        data: scans
    });
}
