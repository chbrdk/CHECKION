/**
 * PostgreSQL pool size for CHECKION (see lib/db/index.ts).
 * Override via {@link ENV_DATABASE_POOL_MAX} (integer, clamped for safety).
 */

import { ENV_DATABASE_POOL_MAX } from '@/lib/constants';

const DEFAULT_POOL_MAX = 10;
const MIN_POOL_MAX = 1;
const MAX_POOL_MAX = 100;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    if (raw == null || raw.trim() === '') return fallback;
    const n = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(n)) return fallback;
    return n;
}

/** Max concurrent connections per Node process (pg Pool). */
export function getDatabasePoolMax(): number {
    const n = parsePositiveInt(
        typeof process !== 'undefined' ? process.env[ENV_DATABASE_POOL_MAX] : undefined,
        DEFAULT_POOL_MAX
    );
    return Math.min(MAX_POOL_MAX, Math.max(MIN_POOL_MAX, n));
}
