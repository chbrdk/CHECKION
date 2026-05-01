/* GET /api/scan/domain/[id]/seo-pages — paginated PageSeoSummary rows */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScanAccess } from '@/lib/domain-scan-access';
import { getDomainScan } from '@/lib/db/scans';
import {
    listSeoPageRowsFromDb,
    sliceSeoPagesFromPayload,
    type SeoPagesSortKey,
    type SeoKeysetCursor,
} from '@/lib/db/domain-seo-pages';
import { decodeSeoKeysetCursor, encodeSeoKeysetCursor, seoRowToKeysetPayload } from '@/lib/domain-pagination-cursor';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

function clampOffset(v: string | null): number {
    return Math.max(0, parseInt(v ?? '0', 10) || 0);
}

function clampLimit(v: string | null): number {
    return Math.max(1, Math.min(200, parseInt(v ?? '50', 10) || 50));
}

const SEO_SORT = new Set<string>(['url', 'wordCount']);
function parseSeoSort(v: string | null): SeoPagesSortKey {
    if (v && SEO_SORT.has(v)) return v as SeoPagesSortKey;
    return 'wordCount';
}

function parseDir(v: string | null): 'asc' | 'desc' {
    return v === 'asc' ? 'asc' : 'desc';
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const viewer = await getRequestUser(req);
    if (!viewer && !isAdminApiRequest(req)) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const rl = checkRateLimit(`domain-seo-pages:${viewer?.id ?? 'admin-api'}`, 'default');
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }

    const { id } = await ctx.params;
    if (!id?.trim()) return apiError('Domain scan id is required', API_STATUS.BAD_REQUEST);

    const access = await getDomainScanAccess(req, id);
    if (!access.ok) return apiError('Not found', API_STATUS.NOT_FOUND);
    const owner = access.ownerUserId;

    const url = new URL(req.url);
    const offset = clampOffset(url.searchParams.get('offset'));
    const limit = clampLimit(url.searchParams.get('limit'));
    const sort = parseSeoSort(url.searchParams.get('sort'));
    const sortDir = parseDir(url.searchParams.get('dir'));
    const afterRaw = url.searchParams.get('after')?.trim() ?? '';
    let keysetAfter: SeoKeysetCursor | null = null;
    if (afterRaw) {
        const decoded = decodeSeoKeysetCursor(afterRaw, sort, sortDir);
        if (!decoded) {
            return apiError('Invalid pagination cursor.', API_STATUS.BAD_REQUEST);
        }
        keysetAfter = {
            domainPageId: decoded.id,
            wordCount: decoded.wordCount,
            url: decoded.url,
        };
    }

    const fromDb = await listSeoPageRowsFromDb({
        domainScanId: id,
        userId: owner,
        offset: keysetAfter != null ? 0 : offset,
        limit,
        sort,
        sortDir,
        ...(keysetAfter != null ? { after: keysetAfter } : {}),
    });
    if (fromDb.total > 0) {
        const last = fromDb.rows[fromDb.rows.length - 1];
        const nextPayload =
            last && fromDb.rows.length === limit ? seoRowToKeysetPayload(last, sort, sortDir) : null;
        const nextCursor = nextPayload ? encodeSeoKeysetCursor(nextPayload) : undefined;
        return jsonPrivate({
            success: true,
            data: fromDb.rows,
            total: fromDb.total,
            offset,
            limit,
            sort,
            sortDir,
            source: 'db' as const,
            ...(nextCursor ? { nextCursor } : {}),
        });
    }

    const scan = await getDomainScan(id, owner);
    if (!scan) return apiError('Not found', API_STATUS.NOT_FOUND);

    const sliced = sliceSeoPagesFromPayload(scan, offset, limit, sort, sortDir);
    return jsonPrivate({
        success: true,
        data: sliced.rows,
        total: sliced.total,
        offset,
        limit,
        sort,
        sortDir,
        source: 'payload' as const,
    });
}
