/* ------------------------------------------------------------------ */
/*  CHECKION – In-memory scan result store                            */
/* ------------------------------------------------------------------ */

import type { ScanResult } from './types';

/**
 * Simple in-memory store for scan results.
 * Persists only for the lifetime of the server process.
 * Replace with a database for production use.
 */
class ScanStore {
    private results: ScanResult[] = [];
    private byId: Map<string, ScanResult> = new Map();

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
}

// Singleton – survives hot reloads in development via globalThis
const globalForStore = globalThis as unknown as { __checkionStore: ScanStore };
export const scanStore = globalForStore.__checkionStore ?? new ScanStore();
globalForStore.__checkionStore = scanStore;
