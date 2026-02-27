import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listCachedDomainScanSummaries, getCachedDomainScansCount } from '@/lib/cache';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || DASHBOARD_SCANS_PAGE_SIZE), 100);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
        listCachedDomainScanSummaries(session.user.id, { limit, offset }),
        getCachedDomainScansCount(session.user.id),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        success: true,
        count: data.length,
        data,
        pagination: { total, page, limit, totalPages },
    });
}
