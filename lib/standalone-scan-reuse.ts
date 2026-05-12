/* ------------------------------------------------------------------ */
/*  CHECKION – Cross-user reuse of recent standalone WCAG scans        */
/* ------------------------------------------------------------------ */

import { and, desc, eq, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '@/lib/db';
import { scanSessions, scans, standaloneScanEntitlements } from '@/lib/db/schema';
import { normalizeScanUrl } from '@/lib/url-normalize';
import { resolveStandaloneScanDevices } from '@/lib/standalone-scan-devices';
import {
    ENV_DISABLE_STANDALONE_SCAN_REUSE,
    getStandaloneScanReuseMaxAgeHours,
} from '@/lib/constants';
import type { ScanResult } from '@/lib/types';
import type { z } from 'zod';
import { scanBodySchema } from '@/lib/api-schemas';

type ScanBody = z.infer<typeof scanBodySchema>;

function isReuseDisabled(): boolean {
    const v =
        typeof process !== 'undefined' ? process.env?.[ENV_DISABLE_STANDALONE_SCAN_REUSE]?.trim().toLowerCase() : '';
    return v === '1' || v === 'true' || v === 'yes';
}

/** Stable JSON for comparing runner lists across sessions. */
export function stableRunnersKey(runners: unknown): string {
    if (runners == null) return 'null';
    if (!Array.isArray(runners)) return JSON.stringify(runners);
    return JSON.stringify([...runners].map(String).sort());
}

function standardKey(s: string | null | undefined): string {
    return (s ?? '').trim() || 'WCAG2AA';
}

function targetRegionKey(s: string | null | undefined): string {
    return (s ?? '').trim().toLowerCase();
}

/**
 * If another user completed a matching standalone session recently, grant an entitlement and return the desktop result (no Puppeteer).
 */
export async function tryReuseStandaloneScan(
    userId: string,
    body: ScanBody,
    options?: {
        skipSessionUserId?: string;
    }
): Promise<{ desktopResult: ScanResult } | null> {
    if (isReuseDisabled()) return null;

    const normalizedUrl = normalizeScanUrl(body.url.trim());
    const wantDevices = resolveStandaloneScanDevices(body);
    const wantSet = new Set(wantDevices);
    const runnersKey = stableRunnersKey(body.runners ?? ['axe', 'htmlcs']);
    const stdKey = standardKey(body.standard);
    const trKey = targetRegionKey(body.targetRegion);

    const maxAgeMs = getStandaloneScanReuseMaxAgeHours() * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - maxAgeMs);

    const db = getDb();
    const candidates = await db
        .select({
            sessionId: scanSessions.id,
            sessionUserId: scanSessions.userId,
            sessionUrl: scanSessions.url,
            standard: scanSessions.standard,
            runners: scanSessions.runners,
            targetRegion: scanSessions.targetRegion,
        })
        .from(scanSessions)
        .where(gte(scanSessions.createdAt, cutoff))
        .orderBy(desc(scanSessions.createdAt))
        .limit(400);

    const skipSessionUserId = options?.skipSessionUserId ?? userId;

    for (const c of candidates) {
        if (c.sessionUserId === skipSessionUserId) continue;
        if (normalizeScanUrl(c.sessionUrl) !== normalizedUrl) continue;
        if (standardKey(c.standard) !== stdKey) continue;
        if (stableRunnersKey(c.runners) !== runnersKey) continue;
        if (targetRegionKey(c.targetRegion) !== trKey) continue;

        const deviceRows = await db
            .select({ device: scans.device })
            .from(scans)
            .where(and(eq(scans.scanSessionId, c.sessionId), eq(scans.userId, c.sessionUserId)));

        const have = new Set(deviceRows.map((r) => r.device));
        if (have.size !== wantSet.size) continue;
        let allMatch = true;
        for (const d of wantDevices) {
            if (!have.has(d)) {
                allMatch = false;
                break;
            }
        }
        if (!allMatch) continue;

        const desktopRows = await db
            .select({ id: scans.id, result: scans.result })
            .from(scans)
            .where(
                and(
                    eq(scans.scanSessionId, c.sessionId),
                    eq(scans.userId, c.sessionUserId),
                    eq(scans.device, 'desktop')
                )
            )
            .limit(1);

        if (desktopRows.length === 0) continue;
        const desktopResult = desktopRows[0].result as unknown as ScanResult;
        const desktopId = desktopRows[0].id;

        const already = await db
            .select({ id: standaloneScanEntitlements.id })
            .from(standaloneScanEntitlements)
            .where(
                and(
                    eq(standaloneScanEntitlements.userId, userId),
                    eq(standaloneScanEntitlements.scanSessionId, c.sessionId)
                )
            )
            .limit(1);
        if (already.length === 0) {
            await db.insert(standaloneScanEntitlements).values({
                id: uuidv4(),
                userId,
                projectId: body.projectId ?? null,
                scanSessionId: c.sessionId,
                canonicalDesktopScanId: desktopId,
            });
        }

        return { desktopResult };
    }

    return null;
}
