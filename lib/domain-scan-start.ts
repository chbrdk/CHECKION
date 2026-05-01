/**
 * Start a domain (deep) scan: create DB row and run scan in background.
 * Used by POST /api/scan/domain and POST /api/projects/[id]/domain-scan-all.
 */
import { v4 as uuidv4 } from 'uuid';
import { createDomainScan, updateDomainScan, getDomainScan, addScan } from '@/lib/db/scans';
import { invalidateDomainScan, invalidateDomainList } from '@/lib/cache';
import {
  buildAggregatedFromFullPages,
  buildStoredDomainPayloadFromAggregated,
} from '@/lib/domain-summary';
import { refineAggregatedPageClassificationWithLlm } from '@/lib/llm/domain-theme-rollup-refine';
import { runDomainScan, resolveDomainScanMaxPages } from '@/lib/spider';
import type { DomainScanControlState } from '@/lib/spider';
import { reportUsage } from '@/lib/usage-report';
import type { DomainScanResult } from '@/lib/types';
import { rebuildDomainIssuesFromPages } from '@/lib/db/domain-issues';
import { runDomainScanPageClassificationJob } from '@/lib/domain-scan-page-classification-job';
import { maybeAutoFillProjectClassificationFromDomainScan } from '@/lib/project-industry-auto';

export interface StartDomainScanOptions {
  projectId?: string | null;
  useSitemap?: boolean;
  maxPages?: number;
  /** If true, reuse prior scan row when HEAD ETag/Last-Modified matches stored hints. */
  skipUnchangedPages?: boolean;
  /** If set, store this normalized hostname as domain (for competitor dedup). */
  domainOverride?: string;
  /** After successful completion, run per-page LLM classification in the background. */
  classifyPageTopics?: boolean;
}

export async function startDomainScan(
  userId: string,
  url: string,
  options: StartDomainScanOptions = {}
): Promise<{ id: string }> {
  const id = uuidv4();
  const domain = options.domainOverride ?? url;
  const pageCap = resolveDomainScanMaxPages(options.maxPages);
  const initial: DomainScanResult = {
    id,
    domain,
    timestamp: new Date().toISOString(),
    status: 'queued',
    progress: { scanned: 0, total: pageCap },
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
  const skipUnchangedPages = options.skipUnchangedPages === true;
  const classifyPageTopics = options.classifyPageTopics === true;
  const projectIdForPages =
    options.projectId !== undefined ? options.projectId : undefined;

  (async () => {
    try {
      const initialRow = await getDomainScan(id, userId);
      if (!initialRow) {
        invalidateDomainList(userId);
        return;
      }
      if (initialRow.status === 'cancelling') {
        await updateDomainScan(id, userId, {
          status: 'cancelled',
          error: 'Cancelled by user',
          progress: { scanned: 0, total: pageCap },
        } as Partial<DomainScanResult>);
        invalidateDomainScan(id);
        invalidateDomainList(userId);
        return;
      }
      if (initialRow.status === 'cancelled') {
        invalidateDomainList(userId);
        return;
      }
      const beforeStart = await getDomainScan(id, userId);
      if (beforeStart?.status === 'cancelling') {
        await updateDomainScan(id, userId, {
          status: 'cancelled',
          error: 'Cancelled by user',
          progress: { scanned: 0, total: pageCap },
        } as Partial<DomainScanResult>);
        invalidateDomainScan(id);
        invalidateDomainList(userId);
        return;
      }
      const liveBeforeSpider = await getDomainScan(id, userId);
      if (liveBeforeSpider?.status !== 'paused') {
        await updateDomainScan(id, userId, { status: 'scanning', progress: { scanned: 0, total: pageCap } });
      }
      invalidateDomainScan(id);
      for await (const update of runDomainScan(url, {
        useSitemap,
        maxPages,
        domainScanId: id,
        userId,
        projectId: projectIdForPages,
        skipUnchangedPages,
        getScanControl: async (): Promise<DomainScanControlState> => {
          const row = await getDomainScan(id, userId);
          if (!row) return 'cancel';
          if (row.status === 'cancelling' || row.status === 'cancelled') return 'cancel';
          if (row.status === 'paused') return 'pause';
          return 'run';
        },
      })) {
        const currentScan = await getDomainScan(id, userId);
        if (!currentScan) break;
        if (update.type === 'progress') {
          await updateDomainScan(id, userId, {
            progress: {
              scanned: update.scannedCount,
              total: update.total,
              currentUrl: update.url,
            },
          });
          invalidateDomainScan(id);
        } else if (update.type === 'page_complete') {
          try {
            reportUsage({
              userId,
              eventType: 'domain_scan_page',
              rawUnits: {
                pages: 1,
                domain_scan_id: id,
                page_index: update.pageIndex,
                ok: update.ok,
                url: update.url,
                ...(update.reusedUnchanged ? { reused_unchanged: true } : {}),
              },
              idempotencyKey: `domain_scan_page:${id}:${update.pageIndex}`,
            });
          } catch {
            /* never affect scan */
          }
        } else if (update.type === 'complete') {
          const fullPages = update.domainResult.pages;
          for (const page of fullPages) {
            await addScan(userId, { ...page, groupId: id }, {
              projectId: projectIdForPages ?? null,
            });
          }
          // Persist raw issues + domain_pages first; then omit duplicate SlimPage[] from payload when safe.
          let domainPagesPersisted = false;
          try {
            await rebuildDomainIssuesFromPages({ userId, domainScanId: id, pages: fullPages });
            domainPagesPersisted = true;
          } catch (e) {
            console.error('[CHECKION] domain issues persist failed', e);
          }
          let aggregatedRaw = buildAggregatedFromFullPages(fullPages);
          if (aggregatedRaw.pageClassification) {
            aggregatedRaw = {
              ...aggregatedRaw,
              pageClassification: await refineAggregatedPageClassificationWithLlm(
                aggregatedRaw.pageClassification,
                {
                  domainOrigin: update.domainResult.domain,
                  userId,
                  domainScanId: id,
                },
              ),
            };
          }
          const stored: DomainScanResult = buildStoredDomainPayloadFromAggregated(
            aggregatedRaw,
            fullPages,
            {
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
            },
            { omitSlimPages: domainPagesPersisted },
          );
          await updateDomainScan(id, userId, stored);
          invalidateDomainScan(id);
          if (projectIdForPages && !classifyPageTopics) {
            void maybeAutoFillProjectClassificationFromDomainScan({ userId, domainScanId: id });
          }
          if (classifyPageTopics) {
            void runDomainScanPageClassificationJob({ domainScanId: id, userId });
          }
        } else if (update.type === 'cancelled') {
          const fullPages = update.domainResult.pages;
          let aggregatedCancelled = buildAggregatedFromFullPages(fullPages);
          if (aggregatedCancelled.pageClassification) {
            aggregatedCancelled = {
              ...aggregatedCancelled,
              pageClassification: await refineAggregatedPageClassificationWithLlm(
                aggregatedCancelled.pageClassification,
                {
                  domainOrigin: update.domainResult.domain,
                  userId,
                  domainScanId: id,
                },
              ),
            };
          }
          const stored: DomainScanResult = buildStoredDomainPayloadFromAggregated(
            aggregatedCancelled,
            fullPages,
            {
              id: update.domainResult.id,
              domain: update.domainResult.domain,
              timestamp: update.domainResult.timestamp,
              status: 'cancelled',
              progress: update.domainResult.progress,
              totalPages: update.domainResult.totalPages,
              score: update.domainResult.score,
              graph: update.domainResult.graph,
              systemicIssues: update.domainResult.systemicIssues,
              eeat: update.domainResult.eeat,
            },
            { omitSlimPages: false },
          );
          await updateDomainScan(id, userId, { ...stored, error: 'Cancelled by user' });
          invalidateDomainScan(id);
        }
      }
      const finalRow = await getDomainScan(id, userId);
      if (
        finalRow &&
        (finalRow.status === 'scanning' ||
          finalRow.status === 'queued' ||
          finalRow.status === 'cancelling')
      ) {
        await updateDomainScan(id, userId, {
          status: 'error',
          error: 'Scan ended unexpectedly',
        } as Partial<DomainScanResult>);
        invalidateDomainScan(id);
      }
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
