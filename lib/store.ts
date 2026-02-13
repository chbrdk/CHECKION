/* ------------------------------------------------------------------ */
/*  CHECKION – In-memory scan result store                            */
/* ------------------------------------------------------------------ */

import type { DomainScanResult, ScanResult } from './types';

/**
 * Simple in-memory store for scan results.
 * Persists only for the lifetime of the server process.
 * Replace with a database for production use.
 */
class ScanStore {
    private results: ScanResult[] = [];
    private byId: Map<string, ScanResult> = new Map();

    // Domain Scans
    private domainScans: Map<string, DomainScanResult> = new Map();

    // Single Page Actions
    add(result: ScanResult): void {
        this.results.unshift(result); // newest first
        this.byId.set(result.id, result);
    }

    get(id: string): ScanResult | undefined {
        return this.byId.get(id);
    }

    list(): ScanResult[] {
        return [...this.results];
    }

    count(): number {
        return this.results.length;
    }

    // Domain Actions
    createDomainScan(id: string, domain: string): DomainScanResult {
        const scan: DomainScanResult = {
            id,
            domain,
            timestamp: new Date().toISOString(),
            status: 'queued',
            progress: { scanned: 0, total: 0 },
            totalPages: 0,
            score: 0,
            pages: [],
            graph: { nodes: [], links: [] },
            systemicIssues: []
        };
        this.domainScans.set(id, scan);
        return scan;
    }

    updateDomainScan(id: string, update: Partial<DomainScanResult>): void {
        const scan = this.domainScans.get(id);
        if (scan) {
            Object.assign(scan, update);
            this.domainScans.set(id, scan);
        }
    }

    getDomainScan(id: string): DomainScanResult | undefined {
        return this.domainScans.get(id);
    }
}

// Singleton – survives hot reloads in development via globalThis
const globalForStore = globalThis as unknown as { __checkionStore: ScanStore };
export const scanStore = globalForStore.__checkionStore ?? new ScanStore();
globalForStore.__checkionStore = scanStore;
