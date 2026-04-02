/**
 * API tests: GET /api/auth/profile (used by MCP user_profile)
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/auth-api-token', () => ({
  getRequestUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(),
}));

import { getRequestUser } from '@/lib/auth-api-token';
import { auth } from '@/auth';
import { GET } from '@/app/api/auth/profile/route';

describe('GET /api/auth/profile', () => {
  beforeEach(() => {
    vi.mocked(getRequestUser).mockReset();
    vi.mocked(auth).mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getRequestUser).mockResolvedValue(null);
    const req = new Request('http://localhost/api/auth/profile');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });
});
