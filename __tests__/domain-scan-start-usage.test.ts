import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/cache', () => ({
  invalidateDomainScan: vi.fn(),
  invalidateDomainList: vi.fn(),
}));

vi.mock('@/lib/db/domain-issues', () => ({
  rebuildDomainIssuesFromPages: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/domain-summary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/domain-summary')>();
  return {
    ...actual,
    buildStoredDomainPayload: vi.fn((_pages: unknown, partial: unknown) => ({ ...partial })),
  };
});

vi.mock('@/lib/db/scans', () => ({
  createDomainScan: vi.fn().mockResolvedValue(undefined),
  updateDomainScan: vi.fn().mockResolvedValue(true),
  getDomainScan: vi.fn().mockResolvedValue({ id: 'scan-row' }),
  addScan: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/spider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/spider')>();
  return {
    ...actual,
    runDomainScan: vi.fn(),
  };
});

vi.mock('@/lib/usage-report', () => ({
  reportUsage: vi.fn(),
}));

vi.mock('@/lib/domain-scan-page-classification-job', () => ({
  runDomainScanPageClassificationJob: vi.fn().mockResolvedValue(undefined),
}));

import { reportUsage } from '@/lib/usage-report';
import { runDomainScanPageClassificationJob } from '@/lib/domain-scan-page-classification-job';
import { runDomainScan } from '@/lib/spider';
import { startDomainScan } from '@/lib/domain-scan-start';
import type { DomainScanResultWithFullPages } from '@/lib/types';
import type { DomainScanStreamUpdate } from '@/lib/spider';

describe('startDomainScan usage', () => {
  beforeEach(() => {
    vi.mocked(reportUsage).mockClear();
    vi.mocked(runDomainScanPageClassificationJob).mockClear();
  });

  it('reports domain_scan_page per finished page with per-page idempotency keys', async () => {
    const domainResult: DomainScanResultWithFullPages = {
      id: 'spider-internal-id',
      domain: 'https://example.com',
      timestamp: new Date().toISOString(),
      status: 'complete',
      progress: { scanned: 2, total: 2 },
      totalPages: 2,
      score: 50,
      pages: [],
      graph: { nodes: [], links: [] },
      systemicIssues: [],
    };

    async function* gen(
      domainScanId: string
    ): AsyncGenerator<DomainScanStreamUpdate, DomainScanResultWithFullPages, unknown> {
      yield {
        type: 'page_complete' as const,
        pageIndex: 0,
        url: 'https://example.com/',
        normalizedUrl: 'https://example.com',
        ok: true,
      };
      yield {
        type: 'page_complete' as const,
        pageIndex: 1,
        url: 'https://example.com/about',
        normalizedUrl: 'https://example.com/about',
        ok: false,
      };
      const fr: DomainScanResultWithFullPages = { ...domainResult, id: domainScanId };
      yield { type: 'complete' as const, domainResult: fr };
      return fr;
    }

    vi.mocked(runDomainScan).mockImplementation((url, opts) => {
      const id = (opts as { domainScanId?: string }).domainScanId ?? 'wrong-id';
      return gen(id);
    });

    const { id } = await startDomainScan('user-plexon-1', 'https://example.com');

    await vi.waitFor(() => expect(vi.mocked(reportUsage)).toHaveBeenCalledTimes(2));

    expect(vi.mocked(reportUsage)).toHaveBeenNthCalledWith(1, {
      userId: 'user-plexon-1',
      eventType: 'domain_scan_page',
      rawUnits: {
        pages: 1,
        domain_scan_id: id,
        page_index: 0,
        ok: true,
        url: 'https://example.com/',
      },
      idempotencyKey: `domain_scan_page:${id}:0`,
    });
    expect(vi.mocked(reportUsage)).toHaveBeenNthCalledWith(2, {
      userId: 'user-plexon-1',
      eventType: 'domain_scan_page',
      rawUnits: {
        pages: 1,
        domain_scan_id: id,
        page_index: 1,
        ok: false,
        url: 'https://example.com/about',
      },
      idempotencyKey: `domain_scan_page:${id}:1`,
    });
    expect(vi.mocked(runDomainScanPageClassificationJob)).not.toHaveBeenCalled();
  });

  it('runs page classification job after complete when classifyPageTopics is true', async () => {
    const domainResult: DomainScanResultWithFullPages = {
      id: 'spider-internal-id',
      domain: 'https://example.com',
      timestamp: new Date().toISOString(),
      status: 'complete',
      progress: { scanned: 1, total: 1 },
      totalPages: 1,
      score: 50,
      pages: [],
      graph: { nodes: [], links: [] },
      systemicIssues: [],
    };

    async function* gen(
      domainScanId: string
    ): AsyncGenerator<DomainScanStreamUpdate, DomainScanResultWithFullPages, unknown> {
      yield {
        type: 'page_complete' as const,
        pageIndex: 0,
        url: 'https://example.com/',
        normalizedUrl: 'https://example.com',
        ok: true,
      };
      const fr: DomainScanResultWithFullPages = { ...domainResult, id: domainScanId };
      yield { type: 'complete' as const, domainResult: fr };
      return fr;
    }

    vi.mocked(runDomainScan).mockImplementation((url, opts) => {
      const id = (opts as { domainScanId?: string }).domainScanId ?? 'wrong-id';
      return gen(id);
    });

    const { id } = await startDomainScan('user-plexon-1', 'https://example.com', {
      classifyPageTopics: true,
    });

    await vi.waitFor(() =>
      expect(vi.mocked(runDomainScanPageClassificationJob)).toHaveBeenCalledWith({
        domainScanId: id,
        userId: 'user-plexon-1',
      })
    );
  });
});
