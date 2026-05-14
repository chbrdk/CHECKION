/**
 * API tests: POST /api/auth/register (validation paths)
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { __resetRateLimitStoresForTests } from '@/lib/rate-limit';

describe('POST /api/auth/register', () => {
  const originalEnv = process.env;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      RATE_LIMIT_REGISTER_MAX: '10',
      RATE_LIMIT_REGISTER_WINDOW_MS: '60000',
    };
    __resetRateLimitStoresForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
    __resetRateLimitStoresForTests();
  });

  it('returns 400 when email is missing', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'Password123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('email');
  });

  it('returns 400 when email is invalid', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'Password123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/valid email/i);
  });

  it('returns 400 when password is too short', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'short' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/8 characters?/i);
  });

  it('returns 400 when password is missing', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password lacks uppercase', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/uppercase/i);
  });

  it('returns 400 when password lacks lowercase', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'PASSWORD123' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/lowercase/i);
  });

  it('returns 429 when IP exceeds register rate limit (before body validation)', async () => {
    process.env.RATE_LIMIT_REGISTER_MAX = '2';
    process.env.RATE_LIMIT_REGISTER_WINDOW_MS = '60000';
    __resetRateLimitStoresForTests();

    const mkReq = () =>
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '203.0.113.99',
        },
        body: JSON.stringify({ password: 'Password123' }),
      });

    let res = await POST(mkReq());
    expect(res.status).toBe(400);
    res = await POST(mkReq());
    expect(res.status).toBe(400);
    res = await POST(mkReq());
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many registration/i);
  });

  it('returns 400 when password lacks digit', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'PasswordOnly' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/digit/i);
  });

  it('registers at PLEXON and skips local insert when PLEXON auth is configured', async () => {
    process.env.PLEXON_AUTH_URL = 'https://plexon.test';
    process.env.PLEXON_SERVICE_SECRET = 'test-secret-16chars';
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ userId: 'plexon-user-1' }), { status: 200 })
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com', password: 'Password123', name: 'Ada' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ success: true, userId: 'plexon-user-1', plexon: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://plexon.test/api/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('new@example.com'),
      })
    );
  });
});
