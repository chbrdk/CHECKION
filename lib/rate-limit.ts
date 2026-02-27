/**
 * In-memory rate limiter for scan endpoints.
 * Key = userId (authenticated) or IP (fallback).
 * Limit: RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS.
 *
 * Note: In-memory = per process. For multi-instance deployments, use Redis-based
 * rate limiting (e.g. @upstash/ratelimit).
 */

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_SCAN_MAX ?? '10', 10) || 10;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_SCAN_WINDOW_MS ?? '60000', 10) || 60000;

const store = new Map<string, number[]>();

function prune(key: string, now: number): void {
    const timestamps = store.get(key);
    if (!timestamps) return;
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const kept = timestamps.filter((t) => t > cutoff);
    if (kept.length === 0) store.delete(key);
    else store.set(key, kept);
}

export interface RateLimitResult {
    allowed: boolean;
    retryAfter?: number;
    remaining: number;
}

/**
 * Check rate limit. Call before processing scan/journey/geo-eeat requests.
 * @param key - User ID or IP
 */
export function checkRateLimit(key: string): RateLimitResult {
    const now = Date.now();
    prune(key, now);
    const timestamps = store.get(key) ?? [];
    if (timestamps.length >= RATE_LIMIT_MAX) {
        const oldest = timestamps[0];
        const retryAfter = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
        return { allowed: false, retryAfter: Math.max(1, retryAfter), remaining: 0 };
    }
    timestamps.push(now);
    store.set(key, timestamps);
    return {
        allowed: true,
        remaining: RATE_LIMIT_MAX - timestamps.length,
    };
}
