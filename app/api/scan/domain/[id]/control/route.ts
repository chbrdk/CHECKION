/* POST /api/scan/domain/[id]/control — pause, resume, or cancel an in-flight deep scan */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, domainScanControlBodySchema } from '@/lib/api-schemas';
import { canMutateDomainScanAsOwner, getDomainScanAccess } from '@/lib/domain-scan-access';
import { getDomainScan, updateDomainScan } from '@/lib/db/scans';
import { invalidateDomainScan } from '@/lib/cache';
import type { DomainScanResult, DomainScanStatus } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewer = await getRequestUser(request);
  if (!viewer) {
    return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
  }

  const { id } = await params;
  const body = await parseApiBody(request, domainScanControlBodySchema);
  if (body instanceof NextResponse) return body;

  const access = await getDomainScanAccess(request, id);
  if (!access.ok) {
    return apiError('Scan not found', API_STATUS.NOT_FOUND);
  }
  if (!canMutateDomainScanAsOwner(access)) {
    return apiError('Forbidden', API_STATUS.FORBIDDEN);
  }

  const scan = await getDomainScan(id, access.ownerUserId);
  if (!scan) {
    return apiError('Scan not found', API_STATUS.NOT_FOUND);
  }

  const status = scan.status as DomainScanStatus;
  let nextStatus: DomainScanStatus | null = null;

  if (body.action === 'pause') {
    if (status === 'scanning' || status === 'queued') {
      nextStatus = 'paused';
    } else if (status === 'paused') {
      return NextResponse.json({ success: true, status: 'paused', message: 'Already paused' });
    } else {
      return apiError(`Cannot pause scan in status "${status}"`, API_STATUS.BAD_REQUEST);
    }
  } else if (body.action === 'resume') {
    if (status === 'paused') {
      nextStatus = 'scanning';
    } else if (status === 'scanning') {
      return NextResponse.json({ success: true, status: 'scanning', message: 'Already running' });
    } else {
      return apiError(`Cannot resume scan in status "${status}"`, API_STATUS.BAD_REQUEST);
    }
  } else if (body.action === 'cancel') {
    if (status === 'complete' || status === 'error' || status === 'cancelled') {
      return apiError(`Cannot cancel scan in status "${status}"`, API_STATUS.BAD_REQUEST);
    }
    if (status === 'cancelling') {
      /** Worker may have exited (deploy restart, serverless timeout, crash) before persisting `cancelled`. */
      await updateDomainScan(id, access.ownerUserId, {
        status: 'cancelled',
        error: 'Cancelled by user',
      } as Partial<DomainScanResult>);
      invalidateDomainScan(id);
      return NextResponse.json({
        success: true,
        status: 'cancelled',
        message: 'Scan marked as cancelled',
      });
    }
    nextStatus = 'cancelling';
  }

  if (nextStatus == null) {
    return apiError('Invalid transition', API_STATUS.BAD_REQUEST);
  }

  await updateDomainScan(id, access.ownerUserId, { status: nextStatus });
  invalidateDomainScan(id);

  return NextResponse.json({ success: true, status: nextStatus });
}
