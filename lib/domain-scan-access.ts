/* ------------------------------------------------------------------ */
/*  Read access to a domain scan row (owner or global-list permission)  */
/* ------------------------------------------------------------------ */

import { eq } from 'drizzle-orm';
import { getRequestUser } from '@/lib/auth-api-token';
import { isAdminApiRequest } from '@/lib/auth-admin-api';
import { canListAllUsersDomainScans } from '@/lib/auth-global-domain-list';
import { getDb } from '@/lib/db';
import { domainScans } from '@/lib/db/schema';
import { getDomainScan } from '@/lib/db/scans';

export type DomainScanAccess =
    | { ok: false }
    | { ok: true; ownerUserId: string; viewerUserId: string | null; bypassUserScope: boolean };

/**
 * Resolves whether the request may read this domain scan.
 * If allowed, `ownerUserId` is the row’s `user_id` (use for `getDomainScan(id, ownerUserId)` and related DB helpers).
 */
export async function getDomainScanAccess(request: Request, domainScanId: string): Promise<DomainScanAccess> {
    const viewer = await getRequestUser(request);
    const bypass = canListAllUsersDomainScans(request, viewer?.id ?? null);
    if (!viewer && !bypass) {
        return { ok: false };
    }

    if (bypass) {
        const db = getDb();
        const rows = await db
            .select({ userId: domainScans.userId })
            .from(domainScans)
            .where(eq(domainScans.id, domainScanId))
            .limit(1);
        if (rows.length === 0) {
            return { ok: false };
        }
        return {
            ok: true,
            ownerUserId: rows[0].userId,
            viewerUserId: viewer?.id ?? null,
            bypassUserScope: true,
        };
    }

    const scan = await getDomainScan(domainScanId, viewer!.id);
    if (!scan) {
        return { ok: false };
    }
    return {
        ok: true,
        ownerUserId: viewer!.id,
        viewerUserId: viewer!.id,
        bypassUserScope: false,
    };
}

/** Only the scan owner may pause/cancel/delete/classify (not global viewers). */
export function canMutateDomainScanAsOwner(access: DomainScanAccess & { ok: true }): boolean {
    return access.viewerUserId != null && access.viewerUserId === access.ownerUserId;
}

/** Cookie session or `Authorization: Bearer` admin API key (for read-only domain APIs). */
export async function hasDomainScanViewerOrAdminApi(request: Request): Promise<boolean> {
    const viewer = await getRequestUser(request);
    if (viewer) return true;
    return isAdminApiRequest(request);
}
