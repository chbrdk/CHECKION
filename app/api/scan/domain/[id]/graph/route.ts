/* GET /api/scan/domain/[id]/graph — payload.graph only (lazy visual map). */
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';
import { getDomainScanAccess } from '@/lib/domain-scan-access';
import { getDomainScanGraph } from '@/lib/db/scans';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const viewer = await getRequestUser(request);
    if (!viewer && !isAdminApiRequest(request)) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    if (!id?.trim()) {
        return apiError('Domain scan id is required', API_STATUS.BAD_REQUEST);
    }
    const access = await getDomainScanAccess(request, id);
    if (!access.ok) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND, { code: 'DOMAIN_SCAN_NOT_FOUND' });
    }
    const graph = await getDomainScanGraph(id, access.ownerUserId);
    if (!graph) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND, { code: 'DOMAIN_SCAN_NOT_FOUND' });
    }
    return jsonPrivate({ graph });
}
