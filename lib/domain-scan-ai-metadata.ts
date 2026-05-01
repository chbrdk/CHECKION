/**
 * Deep-scan flag: AI-derived project industry + tags after linked scan (persisted on payload).
 */
import type { DomainScanResult } from '@/lib/types';

/** Default true when unset (legacy payloads). */
export function shouldAiFillProjectMetadata(payload: DomainScanResult | null | undefined): boolean {
    return payload?.scanOptions?.aiFillProjectMetadata !== false;
}
