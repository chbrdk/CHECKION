/* POST /api/scans/domain/compare — metrics for two domain scans (same user). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, domainScanCompareBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDomainScan } from '@/lib/db/scans';
import { buildDomainScanCompareDto } from '@/lib/domain-compare-dto';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';

export async function POST(req: NextRequest) {
    const user = await getRequestUser(req);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const rl = checkRateLimit(`domain-compare:${user.id}`);
    if (!rl.allowed) {
        return apiError(
            'Too many requests. Please try again later.',
            API_STATUS.TOO_MANY_REQUESTS,
            rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
        );
    }
    const parsed = await parseApiBody(req, domainScanCompareBodySchema);
    if (parsed instanceof Response) return parsed;
    const [idA, idB] = parsed.ids;
    const [rowA, rowB] = await Promise.all([getDomainScan(idA, user.id), getDomainScan(idB, user.id)]);
    if (!rowA || !rowB) {
        return apiError('One or both domain scans were not found.', API_STATUS.NOT_FOUND);
    }
    const scans = [buildDomainScanCompareDto(rowA), buildDomainScanCompareDto(rowB)];
    return NextResponse.json(
        { success: true, data: { scans } },
        { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } }
    );
}
