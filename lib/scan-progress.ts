/* ------------------------------------------------------------------ */
/*  CHECKION – Single-page scan NDJSON stream types                   */
/* ------------------------------------------------------------------ */

import { SCAN_DEVICE_PHASES, type Device, type ScanDevicePhase, type ScanResult } from '@/lib/types';

export type ScanMetaPhase = 'session_created' | 'saving_results';

export type ScanNdjsonLine =
    | { type: 'progress'; phase: ScanDevicePhase; device: Device }
    | { type: 'progress'; phase: ScanMetaPhase }
    | { type: 'complete'; data: ScanResult }
    | { type: 'error'; message: string };

export function isScanDevicePhase(s: string): s is ScanDevicePhase {
    return (SCAN_DEVICE_PHASES as readonly string[]).includes(s);
}
