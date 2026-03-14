/* ------------------------------------------------------------------ */
/*  CHECKION – Project ↔ domain scan references (competitor deep scans) */
/* ------------------------------------------------------------------ */

import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './index';
import { domainScans, projectDomainScanReferences } from './schema';
import { normalizeDomain } from '@/lib/domain-normalize';

const MAX_RECENT_SCANS = 500;

/**
 * Returns the latest completed domain scan for the given user and normalized domain (hostname).
 * Used to reuse existing scans for competitors instead of creating duplicates.
 */
export async function getLatestCompletedDomainScanByDomain(
  userId: string,
  normalizedDomain: string,
  options?: { maxAgeDays?: number }
): Promise<{ id: string; domain: string; timestamp: string } | null> {
  if (!normalizedDomain) return null;
  const db = getDb();
  const rows = await db
    .select({
      id: domainScans.id,
      domain: domainScans.domain,
      timestamp: domainScans.timestamp,
    })
    .from(domainScans)
    .where(and(eq(domainScans.userId, userId), eq(domainScans.status, 'complete')))
    .orderBy(desc(domainScans.timestamp))
    .limit(MAX_RECENT_SCANS);

  const cutoff = options?.maxAgeDays
    ? new Date(Date.now() - options.maxAgeDays * 24 * 60 * 60 * 1000)
    : null;

  for (const row of rows) {
    if (normalizeDomain(row.domain) !== normalizedDomain) continue;
    if (cutoff && new Date(row.timestamp) < cutoff) return null;
    return { id: row.id, domain: row.domain, timestamp: row.timestamp };
  }
  return null;
}

export async function upsertProjectDomainScanReference(
  projectId: string,
  domain: string,
  domainScanId: string
): Promise<void> {
  const db = getDb();
  await db
    .insert(projectDomainScanReferences)
    .values({
      projectId,
      domain,
      domainScanId,
    })
    .onConflictDoUpdate({
      target: [projectDomainScanReferences.projectId, projectDomainScanReferences.domain],
      set: {
        domainScanId,
      },
    });
}

export async function getProjectDomainScanReferences(
  projectId: string
): Promise<Array<{ domain: string; domainScanId: string }>> {
  const db = getDb();
  const rows = await db
    .select({
      domain: projectDomainScanReferences.domain,
      domainScanId: projectDomainScanReferences.domainScanId,
    })
    .from(projectDomainScanReferences)
    .where(eq(projectDomainScanReferences.projectId, projectId));
  return rows.map((r) => ({ domain: r.domain, domainScanId: r.domainScanId }));
}
