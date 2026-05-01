/**
 * Central status UI — job kinds and contracts (see knowledge/checkion-central-status-ui.md).
 */

import type { Device, ScanDevicePhase } from '@/lib/types';
import type { ScanMetaPhase } from '@/lib/scan-progress';

/** Extend as new surfaces migrate (domain crawl, journey, geo, …). */
export type StatusJobKind = 'single_page_scan';

export type SinglePageScanUiState = {
    kind: 'single_page_scan';
    open: boolean;
    metaPhase: ScanMetaPhase | null;
    devicePhaseByDevice: Partial<Record<Device, ScanDevicePhase>>;
};

export function initialSinglePageScanUi(): SinglePageScanUiState {
    return {
        kind: 'single_page_scan',
        open: false,
        metaPhase: null,
        devicePhaseByDevice: {},
    };
}
