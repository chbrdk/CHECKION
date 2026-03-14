/* GET /api/scan/domain/by-domain?domain=... – latest completed scan for this domain (for current user). */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getLatestCompletedDomainScanByDomain } from '@/lib/db/project-domain-references';
import { normalizeDomain } from '@/lib/domain-normalize';

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

  const domainParam = req.nextUrl.searchParams.get('domain');
  if (!domainParam?.trim()) {
    return apiError('Missing or empty domain query', API_STATUS.BAD_REQUEST);
  }

  const normalized = normalizeDomain(domainParam);
  if (!normalized) {
    return apiError('Invalid domain', API_STATUS.BAD_REQUEST);
  }

  const existing = await getLatestCompletedDomainScanByDomain(user.id, normalized);
  if (!existing) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      scanId: existing.id,
      domain: existing.domain,
      timestamp: existing.timestamp,
    },
  });
}
