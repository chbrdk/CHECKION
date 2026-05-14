/**
 * PLEXON platform company id for `platform_company_id` / `platformCompanyId` on POST /api/projects.
 * Priority: URL query → sessionStorage → NEXT_PUBLIC_DEFAULT_PLATFORM_COMPANY_ID → profile default (caller).
 * Query keys are centralized; do not hardcode them in components.
 */

export const PLATFORM_COMPANY_ID_STORAGE_KEY = 'checkion_platform_company_id';

export const PLATFORM_COMPANY_ID_QUERY_KEYS = ['platformCompanyId', 'platform_company_id'] as const;

export const PLATFORM_COMPANY_ID_MAX_LEN = 64;

export function normalizePlatformCompanyId(raw: string | null | undefined): string | null {
    const t = (raw ?? '').trim();
    if (!t || t.length > PLATFORM_COMPANY_ID_MAX_LEN) return null;
    return t;
}

export function readPlatformCompanyIdFromSessionStorage(): string | null {
    if (typeof window === 'undefined') return null;
    return normalizePlatformCompanyId(window.sessionStorage.getItem(PLATFORM_COMPANY_ID_STORAGE_KEY));
}

export function writePlatformCompanyIdToSessionStorage(id: string): void {
    const n = normalizePlatformCompanyId(id);
    if (!n || typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(PLATFORM_COMPANY_ID_STORAGE_KEY, n);
    } catch {
        /* quota / private mode */
    }
}

export function extractPlatformCompanyIdFromSearchParams(params: URLSearchParams): string | null {
    for (const key of PLATFORM_COMPANY_ID_QUERY_KEYS) {
        const v = normalizePlatformCompanyId(params.get(key));
        if (v) return v;
    }
    return null;
}

export function persistPlatformCompanyIdFromUrl(params: URLSearchParams): void {
    const fromUrl = extractPlatformCompanyIdFromSearchParams(params);
    if (fromUrl) writePlatformCompanyIdToSessionStorage(fromUrl);
}

export function getDefaultPlatformCompanyIdFromEnv(): string | null {
    if (typeof process === 'undefined') return null;
    return normalizePlatformCompanyId(process.env.NEXT_PUBLIC_DEFAULT_PLATFORM_COMPANY_ID);
}

export type ResolvePlatformCompanyIdOptions = {
    /** From GET /api/auth/profile when PLEXON merges `default_platform_company_id`. */
    plexonDefaultCompanyId?: string | null;
};

export function resolvePlatformCompanyIdForApi(
    params: URLSearchParams | null,
    options?: ResolvePlatformCompanyIdOptions
): string | null {
    const fromUrl = params ? extractPlatformCompanyIdFromSearchParams(params) : null;
    if (fromUrl) return fromUrl;
    const stored = readPlatformCompanyIdFromSessionStorage();
    if (stored) return stored;
    const fromEnv = getDefaultPlatformCompanyIdFromEnv();
    if (fromEnv) return fromEnv;
    return normalizePlatformCompanyId(options?.plexonDefaultCompanyId);
}

/** When profile carries a default and the tab has no explicit company id yet, persist for later navigations. */
export function seedSessionPlatformCompanyFromProfile(user: {
    default_platform_company_id?: string | null;
} | null): void {
    if (!user?.default_platform_company_id || typeof window === 'undefined') return;
    if (readPlatformCompanyIdFromSessionStorage()) return;
    writePlatformCompanyIdToSessionStorage(user.default_platform_company_id);
}
