/**
 * Optional Redis-backed sliding-window rate limit (shared across Node processes).
 * Used when REDIS_URL is set; otherwise lib/rate-limit.ts uses in-memory stores only.
 */

import { createClient, type RedisClientType } from 'redis';
import { ENV_CHECKION_DISABLE_REDIS_RATE_LIMIT, ENV_REDIS_URL } from '@/lib/constants';
import type { RateLimitBucket } from '@/lib/rate-limit-bucket';

export type RateLimitRedisResult = {
    allowed: boolean;
    retryAfter?: number;
    remaining: number;
};

/** RESP `EVAL` — see https://redis.io/commands/eval */
const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local max = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - windowMs)
local cnt = redis.call('ZCARD', key)
if cnt >= max then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldestTs = tonumber(oldest[2])
  local retryMs = oldestTs + windowMs - now
  if retryMs < 1 then retryMs = 1 end
  return {0, math.ceil(retryMs / 1000), 0}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, windowMs)
return {1, 0, max - cnt - 1}
`;

const CIRCUIT_MS = Math.max(
    60_000,
    Math.min(3_600_000, parseInt(process.env.CHECKION_REDIS_RATE_LIMIT_CIRCUIT_MS ?? '300000', 10) || 300_000)
);

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;
/** While `Date.now() < this`, skip Redis (avoids connect/reconnect log spam on DNS/network failures). */
let redisCircuitOpenUntil = 0;

function isRedisRateLimitDisabled(): boolean {
    const v = process.env[ENV_CHECKION_DISABLE_REDIS_RATE_LIMIT]?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

function getRedisUrl(): string | undefined {
    if (isRedisRateLimitDisabled()) return undefined;
    const u = process.env[ENV_REDIS_URL]?.trim();
    return u || undefined;
}

function redisHostForLog(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return 'invalid-redis-url';
    }
}

/** Errors that usually mean misconfiguration or unreachable Redis — stop retrying for a while. */
function shouldTripCircuit(message: string): boolean {
    return /EAI_AGAIN|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo|WRONGPASS|NOAUTH/i.test(message);
}

function tearDownInstance(c: RedisClientType): void {
    try {
        c.removeAllListeners('error');
    } catch {
        /* ignore */
    }
    void c.disconnect().catch(() => {});
}

function detachClient(c: RedisClientType | null): void {
    if (!c) return;
    tearDownInstance(c);
    if (client === c) client = null;
}

/**
 * Open circuit: no Redis attempts until cooldown. Single WARN per open (no per-tick spam).
 */
function scheduleCircuit(reason: string): void {
    const now = Date.now();
    if (now < redisCircuitOpenUntil) return;
    redisCircuitOpenUntil = now + CIRCUIT_MS;
    const url = process.env[ENV_REDIS_URL]?.trim() ?? '';
    const host = url ? redisHostForLog(url) : '(no-url)';
    console.warn(
        `[CHECKION] Redis rate-limit: ${reason} (host: ${host}). Using in-memory limits for ~${Math.round(
            CIRCUIT_MS / 60_000
        )}m. Fix REDIS_URL / DNS / firewall, unset REDIS_URL, or set ${ENV_CHECKION_DISABLE_REDIS_RATE_LIMIT}=1.`
    );
}

async function getRedisClient(): Promise<RedisClientType | null> {
    const url = getRedisUrl();
    if (!url) return null;
    if (Date.now() < redisCircuitOpenUntil) return null;
    if (client?.isReady) return client;
    if (connectPromise) return connectPromise;
    connectPromise = (async () => {
        let c: RedisClientType | null = null;
        try {
            c = createClient({ url }) as RedisClientType;
            const attached = c;
            attached.on('error', (err) => {
                const msg = err?.message ?? String(err);
                detachClient(attached);
                connectPromise = null;
                if (shouldTripCircuit(msg)) scheduleCircuit(msg);
                else console.error('[CHECKION] Redis rate-limit client error:', msg);
            });
            await attached.connect();
            if (Date.now() < redisCircuitOpenUntil) {
                detachClient(attached);
                return null;
            }
            client = attached;
            return client;
        } catch (e) {
            if (c) detachClient(c);
            const msg = e instanceof Error ? e.message : String(e);
            if (shouldTripCircuit(msg)) scheduleCircuit(msg);
            else console.error('[CHECKION] Redis rate-limit connect failed:', msg);
            return null;
        } finally {
            connectPromise = null;
        }
    })();
    return connectPromise;
}

/** @internal tests */
export function __resetRedisClientForTests(): void {
    connectPromise = null;
    redisCircuitOpenUntil = 0;
    detachClient(client);
}

/**
 * Sliding-window limit in Redis (matches in-memory semantics).
 * @returns null if Redis unavailable or error — caller falls back to memory.
 */
export async function checkRateLimitRedis(
    storageKey: string,
    bucket: RateLimitBucket,
    max: number,
    windowMs: number
): Promise<RateLimitRedisResult | null> {
    const c = await getRedisClient();
    if (!c?.isReady) return null;
    const now = Date.now();
    const member = `${now}-${Math.random().toString(36).slice(2, 12)}`;
    const redisKey = `checkion:rl:${bucket}:${storageKey}`;
    try {
        const raw = (await c.sendCommand([
            'EVAL',
            LUA_SLIDING_WINDOW,
            '1',
            redisKey,
            String(now),
            String(windowMs),
            String(max),
            member,
        ])) as [number, number, number];
        const allowed = raw[0] === 1;
        const retryAfter = raw[1];
        const remaining = raw[2];
        return {
            allowed,
            ...(allowed ? {} : { retryAfter: Math.max(1, retryAfter) }),
            remaining: Math.max(0, remaining),
        };
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        detachClient(c);
        connectPromise = null;
        if (shouldTripCircuit(msg)) scheduleCircuit(msg);
        else console.error('[CHECKION] Redis rate-limit eval failed:', msg);
        return null;
    }
}
