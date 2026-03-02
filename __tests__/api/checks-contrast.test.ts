/**
 * API tests: GET /api/checks/contrast (proxy to /api/tools/contrast)
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/checks/contrast/route';

describe('GET /api/checks/contrast', () => {
  const mockJson = { success: true, ratio: 21, AA: true, AAA: true };

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        json: () => Promise.resolve(mockJson),
      })
    );
  });

  it('forwards to tools/contrast and returns 200 with body', async () => {
    const req = new NextRequest('http://localhost:3000/api/checks/contrast?f=000000&b=ffffff');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockJson);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/tools/contrast?f=000000&b=ffffff',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('passes through non-200 status from tools', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 400,
        json: () => Promise.resolve({ error: 'Missing parameters' }),
      })
    );
    const req = new NextRequest('http://localhost:3000/api/checks/contrast');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing parameters');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
