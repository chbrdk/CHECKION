/* ------------------------------------------------------------------ */
/*  Who may list / read any user’s domain scans (ops / integration)   */
/* ------------------------------------------------------------------ */

import { isAdminApiRequest } from '@/lib/auth-admin-api';

/** Comma-separated PLEXON/CHECKION user ids allowed to list all domain scans in the UI. */
const ENV_GLOBAL_DOMAIN_SCAN_USER_IDS = 'CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS';

function parseIdSet(raw: string | undefined): Set<string> {
    if (!raw?.trim()) return new Set();
    return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * - `Authorization: Bearer <CHECKION_ADMIN_API_KEY>` → allowed (PLEXON / scripts).
 * - Or session user id listed in `CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS`.
 */
export function canListAllUsersDomainScans(request: Request, userId: string | null): boolean {
    if (isAdminApiRequest(request)) return true;
    if (!userId) return false;
    return parseIdSet(process.env[ENV_GLOBAL_DOMAIN_SCAN_USER_IDS]).has(userId);
}
