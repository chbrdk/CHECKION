import { createHash } from 'crypto';

/**
 * Stable group key for domain issue grouping.
 * We intentionally hash to keep keys short and URL-safe.
 */
export function buildDomainIssueGroupKey(input: { code: string; type: string; message: string }): string {
    const raw = `${input.code}|${input.type}|${input.message}`;
    return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

