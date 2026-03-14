/**
 * Start a domain (deep) scan: create DB row and run scan in background.
 * Used by POST /api/scan/domain and POST /api/projects/[id]/domain-scan-all.
 */
import { v4 as uuidv4 } from 'uuid';
import { createDomainScan, updateDomainScan, getDomainScan, addScan } from '@/lib/db/scans';
import { invalidateDomainScan, invalidateDomainList } from '@/lib/cache';
import { buildStoredDomainPayload } from '@/lib/domain-summary';
import { runDomainScan } from '@/lib/spider';
import { reportUsage } from '@/lib/usage-report';
import type { DomainScanResult } from '@/lib/types';

export interface StartDomainScanOptions {
  projectId?: string | null;
  useSitemap?: boolean;
  maxPages?: number;
  /** If set, store this normalized hostname as domain (for competitor dedup). */
  domainOverride?: string;
}

export async function startDomainScan(
  userId: string,
  url: string,
  options: StartDomainScanOptions = {}
): Promise<{ id: string }> {
  const id = uuidv4();
  const domain = options.domainOverride ?? url;
  const initial: DomainScanResult = {
    id,
    domain,
    timestamp: new Date().toISOString(),
    status: 'queued',
    progress: { scanned: 0, total: 0 },
    totalPages: 0,
    score: 0,
    pages: [],
    graph: { nodes: [], links: [] },
    systemicIssues: [],
  };
  await createDomainScan(userId, initial, options.projectId !== undefined ? { projectId: options.projectId } : undefined);
  invalidateDomainList(userId);

  const useSitemap = options.useSitemap ?? true;
  const maxPages = options.maxPages;

  (async () => {
    try {
      await updateDomainScan(id, userId, { status: 'scanning' });
      invalidateDomainScan(id);
      for await (const update of runDomainScan(url, { useSitemap, maxPages })) {
        const currentScan = await getDomainScan(id, userId);
        if (!currentScan) break;
        if (update.type === 'progress') {
          await updateDomainScan(id, userId, {
            progress: { scanned: update.scannedCount, total: 0, currentUrl: update.url },
          });
          invalidateDomainScan(id);
        } else if (update.type === 'complete') {
          const fullPages = update.domainResult.pages;
          for (const page of fullPages) {
            await addScan(userId, { ...page, groupId: id });
          }
          const stored: DomainScanResult = buildStoredDomainPayload(fullPages, {
            id: update.domainResult.id,
            domain: update.domainResult.domain,
            timestamp: update.domainResult.timestamp,
            status: update.domainResult.status,
            progress: update.domainResult.progress,
            totalPages: update.domainResult.totalPages,
            score: update.domainResult.score,
            graph: update.domainResult.graph,
            systemicIssues: update.domainResult.systemicIssues,
            eeat: update.domainResult.eeat,
          });
          await updateDomainScan(id, userId, stored);
          invalidateDomainScan(id);
          try {
            reportUsage({
              userId,
              eventType: 'domain_scan',
              rawUnits: { pages: fullPages.length },
              idempotencyKey: `domain_scan:${id}`,
            });
          } catch { /* never affect response */ }
        }
      }
      await updateDomainScan(id, userId, { status: 'complete' });
      invalidateDomainScan(id);
      invalidateDomainList(userId);
    } catch (e) {
      console.error('Background Scan Error:', e);
      await updateDomainScan(id, userId, {
        status: 'error',
        error: (e as Error).message,
      } as Partial<DomainScanResult>);
      invalidateDomainScan(id);
      invalidateDomainList(userId);
    }
  })();

  return { id };
}
