/**
 * In-memory cache for LLM Vision attention regions by jobId.
 * Used when SALIENCY_LLM_REGIONS is enabled: Generate route stores regions
 * after starting SUM job; Result route reads them when job completes for fusion.
 */

import type { AttentionRegion } from '@/lib/saliency-ai';

const TTL_MS = 15 * 60 * 1000; // 15 min

const cache = new Map<string, { regions: AttentionRegion[]; timestamp: number }>();

export function setVisionRegions(jobId: string, regions: AttentionRegion[]): void {
    cache.set(jobId, { regions, timestamp: Date.now() });
}

export function getVisionRegions(jobId: string): AttentionRegion[] | undefined {
    const entry = cache.get(jobId);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > TTL_MS) {
        cache.delete(jobId);
        return undefined;
    }
    cache.delete(jobId); // one-time read
    return entry.regions;
}
