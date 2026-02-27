/**
 * API tests: POST /api/scan (auth and validation)
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/auth';
import { POST } from '@/app/api/scan/route';

describe('POST /api/scan', () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when url is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/url/i);
  });

  it('returns 400 when url is invalid', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user-1', email: 't@t.de' }, expires: '' });
    const req = new Request('http://localhost/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'not-a-url' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Invalid URL|invalid/i);
  });
});
