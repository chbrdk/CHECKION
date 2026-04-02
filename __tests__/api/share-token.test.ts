/**
 * API tests: public share token access + protected mutations
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/cache', () => ({
  getCachedShareByToken: vi.fn(),
  getCachedScan: vi.fn(),
  getCachedDomainScan: vi.fn(),
  invalidateShare: vi.fn(),
}));

vi.mock('@/lib/share-access', () => ({
  verifyShareAccessToken: vi.fn(),
  createShareAccessToken: vi.fn(),
}));

vi.mock('@/lib/db/shares', () => ({
  getShareByToken: vi.fn(),
  verifySharePassword: vi.fn(),
  deleteShare: vi.fn(),
}));

vi.mock('@/lib/auth-api-token', () => ({
  getRequestUser: vi.fn(),
}));

import { getCachedShareByToken, getCachedScan } from '@/lib/cache';
import { verifyShareAccessToken, createShareAccessToken } from '@/lib/share-access';
import { getShareByToken, verifySharePassword, deleteShare } from '@/lib/db/shares';
import { getRequestUser } from '@/lib/auth-api-token';
import { GET as GET_SHARE, DELETE as DELETE_SHARE } from '@/app/api/share/[token]/route';
import { POST as POST_ACCESS } from '@/app/api/share/[token]/access/route';

describe('Share token public access', () => {
  beforeEach(() => {
    vi.mocked(getCachedShareByToken).mockReset();
    vi.mocked(getCachedScan).mockReset();
    vi.mocked(verifyShareAccessToken).mockReset();
    vi.mocked(createShareAccessToken).mockReset();
    vi.mocked(getShareByToken).mockReset();
    vi.mocked(verifySharePassword).mockReset();
    vi.mocked(deleteShare).mockReset();
    vi.mocked(getRequestUser).mockReset();
  });

  it('GET /api/share/[token] returns 404 when share missing', async () => {
    vi.mocked(getCachedShareByToken).mockResolvedValue(null as any);
    const req = new Request('http://localhost/api/share/t-1');
    const res = await GET_SHARE(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(404);
  });

  it('GET /api/share/[token] returns 403 with requiresPassword when password protected and no bearer', async () => {
    vi.mocked(getCachedShareByToken).mockResolvedValue({
      token: 't-1',
      userId: 'u-1',
      resourceType: 'single',
      resourceId: 'scan-1',
      passwordHash: 'hash',
      createdAt: new Date(),
      expiresAt: null,
    } as any);

    const req = new Request('http://localhost/api/share/t-1');
    const res = await GET_SHARE(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.requiresPassword).toBe(true);
  });

  it('GET /api/share/[token] returns 200 when bearer token matches share token', async () => {
    vi.mocked(getCachedShareByToken).mockResolvedValue({
      token: 't-1',
      userId: 'u-1',
      resourceType: 'single',
      resourceId: 'scan-1',
      passwordHash: 'hash',
      createdAt: new Date(),
      expiresAt: null,
    } as any);

    vi.mocked(verifyShareAccessToken).mockReturnValue({ shareToken: 't-1' } as any);
    vi.mocked(getCachedScan).mockResolvedValue({ id: 'scan-1', userId: 'u-1' } as any);

    const req = new Request('http://localhost/api/share/t-1', {
      headers: { authorization: 'Bearer bearer-1' },
    });
    const res = await GET_SHARE(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.type).toBe('single');
    expect(json.data.id).toBe('scan-1');
  });

  it('POST /api/share/[token]/access issues token when share has no password', async () => {
    vi.mocked(getShareByToken).mockResolvedValue({
      token: 't-1',
      userId: 'u-1',
      resourceType: 'single',
      resourceId: 'scan-1',
      passwordHash: null,
      createdAt: new Date(),
      expiresAt: null,
    } as any);
    vi.mocked(createShareAccessToken).mockReturnValue('access-1' as any);

    const req = new Request('http://localhost/api/share/t-1/access', { method: 'POST' });
    const res = await POST_ACCESS(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.accessToken).toBe('access-1');
  });

  it('POST /api/share/[token]/access returns 401 when password invalid', async () => {
    vi.mocked(getShareByToken).mockResolvedValue({
      token: 't-1',
      userId: 'u-1',
      resourceType: 'single',
      resourceId: 'scan-1',
      passwordHash: 'hash',
      createdAt: new Date(),
      expiresAt: null,
    } as any);
    vi.mocked(verifySharePassword).mockResolvedValue(false as any);

    const req = new Request('http://localhost/api/share/t-1/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    const res = await POST_ACCESS(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/share/[token] returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null as any);
    const req = new Request('http://localhost/api/share/t-1', { method: 'DELETE' });
    const res = await DELETE_SHARE(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(401);
  });

  it('DELETE /api/share/[token] returns 404 when not owner (deleteShare returns false)', async () => {
    vi.mocked(getRequestUser).mockResolvedValue({ id: 'u-2' } as any);
    vi.mocked(deleteShare).mockResolvedValue(false as any);
    const req = new Request('http://localhost/api/share/t-1', { method: 'DELETE' });
    const res = await DELETE_SHARE(req, { params: Promise.resolve({ token: 't-1' }) });
    expect(res.status).toBe(404);
  });
});

