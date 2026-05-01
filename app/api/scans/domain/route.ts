import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listCachedDomainScanSummaries, getCachedDomainScansCount } from '@/lib/cache';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';
import { DOMAIN_SCAN_LIST_QUERY_MAX_LEN } from '@/lib/db/scans';
import type { DomainScanStatus } from '@/lib/types';

const DOMAIN_SCAN_STATUS_SET: ReadonlySet<string> = new Set<DomainScanStatus>([
    'queued',
    'scanning',
    'cancelling',
    'paused',
    'complete',
    'error',
    'cancelled',
]);

export async function GET(req: NextRequest) {
    const user = await getRequestUser(req);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || DASHBOARD_SCANS_PAGE_SIZE), 100);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const offset = (page - 1) * limit;
    const projectIdParam = searchParams.get('projectId');
    /** Absent → no project filter (all scans). Empty string → unassigned only. UUID → that project. */
    const projectId =
        projectIdParam === null
            ? undefined
            : projectIdParam === ''
              ? null
              : projectIdParam;
    const qRaw = searchParams.get('q');
    const q =
        qRaw && qRaw.trim().length > 0 ? qRaw.trim().slice(0, DOMAIN_SCAN_LIST_QUERY_MAX_LEN) : undefined;
    const statusRaw = searchParams.get('status');
    const status =
        statusRaw && DOMAIN_SCAN_STATUS_SET.has(statusRaw) ? (statusRaw as DomainScanStatus) : undefined;
    const [data, total] = await Promise.all([
        listCachedDomainScanSummaries(user.id, { limit, offset, projectId, q, status }),
        getCachedDomainScansCount(user.id, { projectId, q, status }),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        success: true,
        count: data.length,
        data,
        pagination: { total, page, limit, totalPages },
    });
}
