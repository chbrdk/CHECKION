/* GET /api/scan/domain/[id]/bundle — single read: light summary + totalSlimRows */
import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } from '@/lib/constants';
import { buildDomainBundleForUser } from '@/lib/domain-bundle';

const jsonPrivate = (body: unknown) =>
    NextResponse.json(body, { headers: { 'Cache-Control': HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON } });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getRequestUser(_request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }
    const { id } = await params;
    if (!id?.trim()) {
        return apiError('Domain scan id is required', API_STATUS.BAD_REQUEST);
    }
    const bundle = await buildDomainBundleForUser(id, user.id);
    if (!bundle) {
        return apiError('Scan not found', API_STATUS.NOT_FOUND, { code: 'DOMAIN_SCAN_NOT_FOUND' });
    }
    return jsonPrivate(bundle);
}
