/**
 * API tests: POST /api/rank-tracking/refresh (config + guardrails)
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth-api-token', () => ({
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/api-schemas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-schemas')>();
  return {
    ...actual,
    parseApiBody: vi.fn(),
    rankTrackingRefreshBodySchema: {} as any,
  };
});

vi.mock('@/lib/db/rank-tracking-keywords', () => ({
  getKeyword: vi.fn(),
  listKeywordIdsByProject: vi.fn(),
  touchKeywordUpdatedAt: vi.fn(),
}));

vi.mock('@/lib/db/rank-tracking-positions', () => ({
  insertPosition: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
  getProject: vi.fn(),
}));

vi.mock('@/lib/serp-api', () => ({
  fetchSerpPosition: vi.fn(),
}));

vi.mock('@/lib/usage-report', () => ({
  reportUsage: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { parseApiBody } from '@/lib/api-schemas';
import { getKeyword, touchKeywordUpdatedAt } from '@/lib/db/rank-tracking-keywords';
import { insertPosition } from '@/lib/db/rank-tracking-positions';
import { fetchSerpPosition } from '@/lib/serp-api';
import { reportUsage } from '@/lib/usage-report';
import { POST } from '@/app/api/rank-tracking/refresh/route';

describe('POST /api/rank-tracking/refresh', () => {
  const originalKey = process.env.SERP_API_KEY;

  beforeEach(() => {
    vi.mocked(getRequestUser).mockReset();
    vi.mocked(parseApiBody as any).mockReset();
    vi.mocked(getKeyword).mockReset();
    vi.mocked(insertPosition).mockReset();
    vi.mocked(touchKeywordUpdatedAt).mockReset();
    vi.mocked(fetchSerpPosition).mockReset();
    vi.mocked(reportUsage).mockReset();
    process.env.SERP_API_KEY = originalKey;
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null as any);
    const req = new Request('http://localhost/api/rank-tracking/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywordId: '00000000-0000-0000-0000-000000000001' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns 502 when SERP_API_KEY missing', async () => {
    process.env.SERP_API_KEY = '';
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u-1' } as any);
    vi.mocked(parseApiBody as any).mockResolvedValue({ keywordId: '00000000-0000-0000-0000-000000000001' });
    const req = new Request('http://localhost/api/rank-tracking/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywordId: '00000000-0000-0000-0000-000000000001' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(String(json.error ?? '')).toMatch(/SERP_API_KEY/i);
  });

  it('reports serp_refresh usage after successful keyword refresh', async () => {
    process.env.SERP_API_KEY = 'test-serp-key';
    const kwId = '00000000-0000-0000-0000-000000000001';
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u-1' } as any);
    vi.mocked(parseApiBody as any).mockResolvedValue({ keywordId: kwId });
    vi.mocked(getKeyword).mockResolvedValue({
      id: kwId,
      userId: 'u-1',
      projectId: null,
      domain: 'example.com',
      keyword: 'test',
      country: 'de',
      language: 'de',
      device: 'desktop',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(fetchSerpPosition).mockResolvedValue({ position: 3, competitorPositions: {} });
    vi.mocked(insertPosition).mockResolvedValue(undefined as any);
    vi.mocked(touchKeywordUpdatedAt).mockResolvedValue(undefined as any);

    const req = new Request('http://localhost/api/rank-tracking/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywordId: kwId }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(vi.mocked(reportUsage)).toHaveBeenCalledWith({
      userId: 'u-1',
      eventType: 'serp_refresh',
      rawUnits: { keywords: 1 },
    });
  });
});

