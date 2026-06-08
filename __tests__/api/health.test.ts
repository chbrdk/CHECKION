/**
 * API tests: GET /api/health
 * Run: npm run test
 */
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.federationContractVersion).toBe('2026-05-plexon-federation-v3');
    expect(json.integrations?.audion).toMatchObject({
      apiBaseUrlSet: expect.any(Boolean),
      serviceTokenSet: expect.any(Boolean),
      configured: expect.any(Boolean),
      missing: expect.any(Array),
    });
  });
});
