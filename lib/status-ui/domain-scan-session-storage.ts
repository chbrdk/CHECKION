import type { DomainScanSessionPayload } from '@/lib/status-ui/types';

export const DOMAIN_SCAN_SESSION_STORAGE_KEY = 'checkion_domain_scan_session_v1';

export function readDomainScanSession(): DomainScanSessionPayload | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(DOMAIN_SCAN_SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DomainScanSessionPayload;
        if (!parsed?.scanId || !parsed?.startUrl) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeDomainScanSession(payload: DomainScanSessionPayload): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(DOMAIN_SCAN_SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* quota / private mode */
    }
}

export function clearDomainScanSession(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(DOMAIN_SCAN_SESSION_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}
