import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { listCachedDomainScanSummaries, getCachedDomainScansCount } from '@/lib/cache';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';
import { DOMAIN_SCAN_LIST_QUERY_MAX_LEN, getDomainScansCountAllUsers, listDomainScanSummariesAllUsers } from '@/lib/db/scans';
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
    const allUsersScope = new URL(req.url).searchParams.get('scope') === 'allUsers';
    const allowAllUsers = canListAllUsersDomainScans(req, user?.id ?? null);

    if (allUsersScope && !allowAllUsers) {
        return apiError('Forbidden', API_STATUS.FORBIDDEN);
    }
    if (!allUsersScope && !user) {
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
    const industryRaw = searchParams.get('industry');
    const industry =
        industryRaw && industryRaw.trim().length > 0 ? industryRaw.trim().slice(0, 128) : undefined;
    const tagRaw = searchParams.get('tag');
    const tag = tagRaw && tagRaw.trim().length > 0 ? tagRaw.trim().slice(0, 48) : undefined;

    if (allUsersScope) {
        const [data, total] = await Promise.all([
            listDomainScanSummariesAllUsers({ limit, offset, projectId, q, status, industry, tag }),
            getDomainScansCountAllUsers({ projectId, q, status, industry, tag }),
        ]);
        const totalPages = Math.ceil(total / limit) || 1;
        return NextResponse.json({
            success: true,
            scope: 'allUsers',
            count: data.length,
            data,
            pagination: { total, page, limit, totalPages },
        });
    }

    const [data, total] = await Promise.all([
        listCachedDomainScanSummaries(user!.id, { limit, offset, projectId, q, status, industry, tag }),
        getCachedDomainScansCount(user!.id, { projectId, q, status, industry, tag }),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return NextResponse.json({
        success: true,
        scope: 'mine',
        count: data.length,
        data,
        pagination: { total, page, limit, totalPages },
    });
}
