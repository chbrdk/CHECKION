import type { Device } from '@/lib/types';

const ALL_DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];

/** POST /api/scan optional body: restrict which viewports run (default: all three). */
export type StandaloneScanDeviceRequest = {
    devices?: Device[];
    /** If true and `devices` is omitted, only `desktop` runs (faster, lower cost). */
    quickScan?: boolean;
};

/**
 * Resolves device list for standalone scan: body overrides env `SCAN_STANDALONE_DEVICES`, default all three.
 * `quickScan` implies `['desktop']` when `devices` is not set.
 */
export function resolveStandaloneScanDevices(body?: StandaloneScanDeviceRequest | null): Device[] {
    if (body?.devices && body.devices.length > 0) {
        const seen = new Set<Device>();
        for (const d of body.devices) {
            if (ALL_DEVICES.includes(d)) seen.add(d);
        }
        const out = ALL_DEVICES.filter((d) => seen.has(d));
        if (out.length > 0) return out;
    }
    if (body?.quickScan === true) {
        return ['desktop'];
    }
    const raw = typeof process !== 'undefined' ? process.env?.SCAN_STANDALONE_DEVICES?.trim() : '';
    if (raw) {
        const parts = raw.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
        const map: Record<string, Device> = { desktop: 'desktop', tablet: 'tablet', mobile: 'mobile' };
        const picked: Device[] = [];
        const seen = new Set<Device>();
        for (const p of parts) {
            const d = map[p];
            if (d && !seen.has(d)) {
                seen.add(d);
                picked.push(d);
            }
        }
        if (picked.length > 0) return picked;
    }
    return [...ALL_DEVICES];
}
