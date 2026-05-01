/* ------------------------------------------------------------------ */
/*  Who may list / read any user’s domain scans (ops / integration)   */
/* ------------------------------------------------------------------ */

import { isAdminApiRequest } from '@/lib/auth-admin-api';

/** Comma-separated PLEXON/CHECKION user ids allowed to list all domain scans in the UI. */
const ENV_GLOBAL_DOMAIN_SCAN_USER_IDS = 'CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS';
/**
 * When truthy (`1`, `true`, `yes`), any signed-in user may list/read all users’ domain scans.
 * Use only on trusted / internal deployments — not for multi-tenant SaaS with strict isolation.
 */
const ENV_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED = 'CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED';

function envFlagTruthy(key: string): boolean {
    const v = process.env[key]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function parseIdSet(raw: string | undefined): Set<string> {
    if (!raw?.trim()) return new Set();
    return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * - `Authorization: Bearer <CHECKION_ADMIN_API_KEY>` → allowed (PLEXON / scripts).
 * - Or `CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED` → any session user.
 * - Or session user id listed in `CHECKION_GLOBAL_DOMAIN_SCAN_USER_IDS`.
 */
export function canListAllUsersDomainScans(request: Request, userId: string | null): boolean {
    if (isAdminApiRequest(request)) return true;
    if (!userId) return false;
    if (envFlagTruthy(ENV_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED)) return true;
    return parseIdSet(process.env[ENV_GLOBAL_DOMAIN_SCAN_USER_IDS]).has(userId);
}
