/* ------------------------------------------------------------------ */
/*  CHECKION – Scan persistence (DB)                                   */
/* ------------------------------------------------------------------ */

import { eq, and, desc, isNull } from 'drizzle-orm';
import { getDb } from './index';
import { scans, domainScans } from './schema';
import type { ScanResult, DomainScanResult } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';

export async function addScan(userId: string, result: ScanResult): Promise<void> {
    const db = getDb();
    await db.insert(scans).values({
        id: result.id,
        userId,
        url: result.url,
        device: result.device,
        groupId: result.groupId ?? null,
        timestamp: result.timestamp,
        result: result as unknown as Record<string, unknown>,
    });
}

export async function getScan(id: string, userId: string): Promise<ScanResult | null> {
    const db = getDb();
    const rows = await db.select().from(scans).where(and(eq(scans.id, id), eq(scans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return rows[0].result as unknown as ScanResult;
}

/** Returns scan result plus llm_summary for API response. */
export async function getScanWithSummary(id: string, userId: string): Promise<{ result: ScanResult; llmSummary: UxCxSummary | null } | null> {
    const db = getDb();
    const rows = await db.select({
        result: scans.result,
        llmSummary: scans.llmSummary,
    }).from(scans).where(and(eq(scans.id, id), eq(scans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return {
        result: rows[0].result as unknown as ScanResult,
        llmSummary: (rows[0].llmSummary as UxCxSummary | null) ?? null,
    };
}

export async function updateScanSummary(id: string, userId: string, summary: UxCxSummary): Promise<boolean> {
    const db = getDb();
    const updated = await db.update(scans)
        .set({ llmSummary: summary as unknown as Record<string, unknown> })
        .where(and(eq(scans.id, id), eq(scans.userId, userId)));
    return (updated.rowCount ?? 0) > 0;
}

export async function listScans(userId: string): Promise<ScanResult[]> {
    const db = getDb();
    const rows = await db.select({ result: scans.result }).from(scans).where(eq(scans.userId, userId)).orderBy(desc(scans.timestamp));
    return rows.map(r => r.result as unknown as ScanResult);
}

/** Only scans that are not part of a domain scan (standalone single-URL scans). */
export async function listStandaloneScans(userId: string): Promise<ScanResult[]> {
    const db = getDb();
    const rows = await db.select({ result: scans.result }).from(scans).where(and(eq(scans.userId, userId), isNull(scans.groupId))).orderBy(desc(scans.timestamp));
    return rows.map(r => r.result as unknown as ScanResult);
}

export async function deleteScan(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db.delete(scans).where(and(eq(scans.id, id), eq(scans.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}

export async function createDomainScan(userId: string, scan: DomainScanResult): Promise<void> {
    const db = getDb();
    await db.insert(domainScans).values({
        id: scan.id,
        userId,
        domain: scan.domain,
        status: scan.status,
        timestamp: scan.timestamp,
        payload: scan as unknown as Record<string, unknown>,
    });
}

export async function updateDomainScan(id: string, userId: string, update: Partial<DomainScanResult>): Promise<boolean> {
    const db = getDb();
    const existing = await db.select().from(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId))).limit(1);
    if (existing.length === 0) return false;
    const merged = { ...(existing[0].payload as DomainScanResult), ...update };
    await db.update(domainScans).set({ payload: merged as unknown as Record<string, unknown>, status: merged.status, timestamp: merged.timestamp }).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return true;
}

export async function getDomainScan(id: string, userId: string): Promise<DomainScanResult | null> {
    const db = getDb();
    const rows = await db.select().from(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId))).limit(1);
    if (rows.length === 0) return null;
    return rows[0].payload as unknown as DomainScanResult;
}

export async function listDomainScans(userId: string): Promise<DomainScanResult[]> {
    const db = getDb();
    const rows = await db.select({ payload: domainScans.payload }).from(domainScans).where(eq(domainScans.userId, userId)).orderBy(desc(domainScans.timestamp));
    return rows.map(r => r.payload as unknown as DomainScanResult);
}

export async function deleteDomainScan(id: string, userId: string): Promise<boolean> {
    const db = getDb();
    const deleted = await db.delete(domainScans).where(and(eq(domainScans.id, id), eq(domainScans.userId, userId)));
    return (deleted.rowCount ?? 0) > 0;
}
