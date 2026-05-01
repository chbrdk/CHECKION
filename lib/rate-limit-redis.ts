/**
 * Optional Redis-backed sliding-window rate limit (shared across Node processes).
 * Used when REDIS_URL is set; otherwise lib/rate-limit.ts uses in-memory stores only.
 */

import { createClient, type RedisClientType } from 'redis';
import { ENV_REDIS_URL } from '@/lib/constants';
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

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType | null> | null = null;

function getRedisUrl(): string | undefined {
    const u = process.env[ENV_REDIS_URL]?.trim();
    return u || undefined;
}

async function getRedisClient(): Promise<RedisClientType | null> {
    const url = getRedisUrl();
    if (!url) return null;
    if (client?.isReady) return client;
    if (connectPromise) return connectPromise;
    connectPromise = (async () => {
        try {
            const c = createClient({ url });
            c.on('error', (err) => {
                console.error('[CHECKION] Redis rate-limit client error:', err.message);
            });
            await c.connect();
            client = c as RedisClientType;
            return client;
        } catch (e) {
            console.error('[CHECKION] Redis rate-limit connect failed:', e instanceof Error ? e.message : e);
            client = null;
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
    client = null;
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
    if (!c) return null;
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
        console.error('[CHECKION] Redis rate-limit eval failed:', e instanceof Error ? e.message : e);
        return null;
    }
}
