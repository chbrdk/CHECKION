/* ------------------------------------------------------------------ */
/*  CHECKION – GET /api/scan/domain/[id]/summary                        */
/*  Returns stored payload (slim pages + precomputed aggregated).       */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';
import { getDomainScanWithProjectId } from '@/lib/db/scans';
import { buildDomainSummary, toLightDomainSummaryApiPayload, type DomainSummaryResponse } from '@/lib/domain-summary';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    if (!id?.trim()) {
        return apiError('Domain scan id is required', API_STATUS.BAD_REQUEST);
    }
    const row = await getDomainScanWithProjectId(id, user.id);
    if (!row) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND, { code: 'DOMAIN_SCAN_NOT_FOUND' });
    }
    const summary = buildDomainSummary(row.result);
    // Important: do not ship huge issue arrays in the summary response.
    // The "List & Details" UI is served via paged APIs backed by domain_* tables.
    const safeSummary = {
        ...summary,
        aggregated: summary.aggregated && summary.aggregated.issues
            ? {
                ...summary.aggregated,
                issues: {
                    ...summary.aggregated.issues,
                    issues: [],
                },
            }
            : summary.aggregated,
    };
    const url = new URL(request.url);
    const seoFull = url.searchParams.get('seoFull') === '1';
    if (seoFull) {
        const seo = safeSummary.aggregated?.seo;
        if (!seo) {
            return jsonPrivate({
                projectId: row.projectId,
                aggregated: {},
                summaryMeta: { seoPageRowsOmitted: false },
            });
        }
        return jsonPrivate({
            projectId: row.projectId,
            aggregated: { seo },
            summaryMeta: { seoPageRowsOmitted: false },
        });
    }
    const light = url.searchParams.get('light') === '1';
    const body = light
        ? { ...toLightDomainSummaryApiPayload(safeSummary as DomainSummaryResponse), projectId: row.projectId }
        : { ...safeSummary, projectId: row.projectId };
    return jsonPrivate(body);
}
