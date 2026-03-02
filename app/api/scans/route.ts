import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listScans } from '@/lib/db/scans';

export async function GET(request: Request) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const scans = await listScans(user.id);
    return NextResponse.json({
        success: true,
        count: scans.length,
        data: scans
    });
}
