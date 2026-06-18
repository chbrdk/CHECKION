/**
 * Central status UI — job kinds and contracts (see knowledge/checkion-central-status-ui.md).
 */

import type { Device, DomainScanStatus, ScanDevicePhase } from '@/lib/types';
import type { ScanMetaPhase } from '@/lib/scan-progress';
import { DOMAIN_SCAN_DEFAULT_MAX_PAGES } from '@/lib/domain-scan-max-pages';

/** Extend as new surfaces migrate (domain crawl, journey, geo, …). */
export type StatusJobKind = 'single_page_scan' | 'domain_scan';

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

/** Persisted in sessionStorage so deep-scan snackbar survives navigation and full reload. */
export type DomainScanSessionPayload = {
    scanId: string;
    startUrl: string;
    maxPages: number;
    projectId: string | null;
    classifyPageTopics: boolean;
    aiFillProjectMetadata: boolean;
};

export type DomainScanUiState = {
    kind: 'domain_scan';
    open: boolean;
    scanId: string | null;
    /** Host/domain label from API (`scan.domain`). */
    domainLabel: string | null;
    status: DomainScanStatus;
    scannedCount: number;
    progressTotal: number;
    currentUrl: string | null;
    projectId: string | null;
    startUrl: string | null;
    maxPages: number;
    classifyPageTopics: boolean;
    aiFillProjectMetadata: boolean;
    errorMessage: string | null;
};

export function initialDomainScanUi(): DomainScanUiState {
    return {
        kind: 'domain_scan',
        open: false,
        scanId: null,
        domainLabel: null,
        status: 'queued',
        scannedCount: 0,
        progressTotal: 0,
        currentUrl: null,
        projectId: null,
        startUrl: null,
        maxPages: DOMAIN_SCAN_DEFAULT_MAX_PAGES,
        classifyPageTopics: false,
        aiFillProjectMetadata: true,
        errorMessage: null,
    };
}
