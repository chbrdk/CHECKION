/**
 * Unit tests: admin API key auth
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isAdminApiRequest } from '@/lib/auth-admin-api';

describe('isAdminApiRequest', () => {
  const original = process.env.CHECKION_ADMIN_API_KEY;

  beforeEach(() => {
    process.env.CHECKION_ADMIN_API_KEY = original;
  });

  it('returns false when key missing', () => {
    process.env.CHECKION_ADMIN_API_KEY = '';
    const req = new Request('http://localhost/api/admin/users', {
      headers: { Authorization: 'Bearer whatever' },
    });
    expect(isAdminApiRequest(req)).toBe(false);
  });

  it('returns false when key too short', () => {
    process.env.CHECKION_ADMIN_API_KEY = 'short';
    const req = new Request('http://localhost/api/admin/users', {
      headers: { Authorization: 'Bearer short' },
    });
    expect(isAdminApiRequest(req)).toBe(false);
  });

  it('returns false when header missing', () => {
    process.env.CHECKION_ADMIN_API_KEY = '1234567890abcdef';
    const req = new Request('http://localhost/api/admin/users');
    expect(isAdminApiRequest(req)).toBe(false);
  });

  it('returns true when bearer matches key', () => {
    process.env.CHECKION_ADMIN_API_KEY = '1234567890abcdef';
    const req = new Request('http://localhost/api/admin/users', {
      headers: { Authorization: 'Bearer 1234567890abcdef' },
    });
    expect(isAdminApiRequest(req)).toBe(true);
  });
});

