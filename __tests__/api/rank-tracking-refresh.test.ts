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

import { getRequestUser } from '@/lib/auth-api-token';
import { parseApiBody } from '@/lib/api-schemas';
import { POST } from '@/app/api/rank-tracking/refresh/route';

describe('POST /api/rank-tracking/refresh', () => {
  const originalKey = process.env.SERP_API_KEY;

  beforeEach(() => {
    vi.mocked(getRequestUser).mockReset();
    vi.mocked(parseApiBody as any).mockReset();
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
});

