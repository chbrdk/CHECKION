import { afterEach, describe, expect, it, vi } from 'vitest';

describe('CHECKION federation helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds PLEXON contract headers with secret and version', async () => {
    const { getPlexonContractHeaders, PLEXON_FEDERATION_CONTRACT_VERSION } = await import('@/lib/plexon-contract');
    expect(getPlexonContractHeaders('secret-1')).toEqual({
      'X-Plexon-Contract-Version': PLEXON_FEDERATION_CONTRACT_VERSION,
      'X-Service-Secret': 'secret-1',
    });
  });

  it('derives the public app base path and asset path from env', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_BASE_URL', '/checkion');
    const { getAppBasePath, getPublicAssetPath } = await import('@/lib/constants');
    expect(getAppBasePath()).toBe('/checkion');
    expect(getPublicAssetPath('/favicon.svg')).toBe('/checkion/favicon.svg');
  });
});
