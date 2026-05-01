/**
 * In-memory rate limiter for API routes.
 *
 * Buckets:
 * - `default` — scans, domain APIs, classify, etc. Uses RATE_LIMIT_SCAN_MAX / RATE_LIMIT_SCAN_WINDOW_MS.
 * - `register` — POST /api/auth/register per IP. Uses RATE_LIMIT_REGISTER_MAX / RATE_LIMIT_REGISTER_WINDOW_MS.
 *
 * Note: In-memory = per process. For multi-instance deployments, use Redis-based
 * rate limiting (e.g. @upstash/ratelimit).
 */

export type RateLimitBucket = 'default' | 'register';

const stores: Record<RateLimitBucket, Map<string, number[]>> = {
    default: new Map(),
    register: new Map(),
};

/** Reads env on each call so tests and deploy-time overrides apply without stale module state. */
function limitsForBucket(bucket: RateLimitBucket): { max: number; windowMs: number } {
    if (bucket === 'register') {
        const max = parseInt(process.env.RATE_LIMIT_REGISTER_MAX ?? '5', 10) || 5;
        const windowMs = parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS ?? '900000', 10) || 900000;
        return { max, windowMs };
    }
    const max = parseInt(process.env.RATE_LIMIT_SCAN_MAX ?? '10', 10) || 10;
    const windowMs = parseInt(process.env.RATE_LIMIT_SCAN_WINDOW_MS ?? '60000', 10) || 60000;
    return { max, windowMs };
}

function prune(store: Map<string, number[]>, key: string, now: number, windowMs: number): void {
    const timestamps = store.get(key);
    if (!timestamps) return;
    const cutoff = now - windowMs;
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
 * Best-effort client IP for rate limiting (trust X-Forwarded-For when present).
 */
export function getClientIpForRateLimit(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0]?.trim();
        if (first) return first;
    }
    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;
    return 'unknown';
}

/**
 * Check rate limit. Call before processing expensive or abuse-prone requests.
 * @param key — Unique key within the bucket (e.g. `scan:${userId}`, `domain-slim-pages:${id}`).
 * @param bucket — `default` for scan-style limits; `register` for registration per IP.
 */
export function checkRateLimit(key: string, bucket: RateLimitBucket = 'default'): RateLimitResult {
    const { max, windowMs } = limitsForBucket(bucket);
    const store = stores[bucket];
    const now = Date.now();
    prune(store, key, now, windowMs);
    const timestamps = store.get(key) ?? [];
    if (timestamps.length >= max) {
        const oldest = timestamps[0];
        const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
        return { allowed: false, retryAfter: Math.max(1, retryAfter), remaining: 0 };
    }
    timestamps.push(now);
    store.set(key, timestamps);
    return {
        allowed: true,
        remaining: max - timestamps.length,
    };
}

/** Clears in-memory counters (Vitest only). */
export function __resetRateLimitStoresForTests(): void {
    stores.default.clear();
    stores.register.clear();
}
