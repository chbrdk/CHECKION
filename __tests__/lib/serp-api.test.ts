/**
 * Unit tests: SERP API position extraction (fetchSerpPosition with mocked fetch)
 * Run: npm run test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchSerpPosition } from '@/lib/serp-api';

describe('fetchSerpPosition', () => {
    const originalEnvKey = process.env.SERP_API_KEY;
    const originalEnvProvider = process.env.SERP_API_PROVIDER;

    beforeEach(() => {
        process.env.SERP_API_KEY = 'test-key';
        process.env.SERP_API_PROVIDER = 'serper';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        process.env.SERP_API_KEY = originalEnvKey;
        process.env.SERP_API_PROVIDER = originalEnvProvider;
    });

    it('returns position 1 when domain appears in first organic result', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        organic: [{ link: 'https://example.com/page' }],
                    }),
            })
        );
        const result = await fetchSerpPosition('test query', 'example.com');
        expect(result.position).toBe(1);
    });

    it('returns position 2 when domain appears in second organic result', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        organic: [
                            { link: 'https://other.com' },
                            { link: 'https://example.com/landing' },
                        ],
                    }),
            })
        );
        const result = await fetchSerpPosition('test', 'example.com');
        expect(result.position).toBe(2);
    });

    it('returns null when domain does not appear in organic results', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        organic: [
                            { link: 'https://other.com' },
                            { link: 'https://competitor.com' },
                        ],
                    }),
            })
        );
        const result = await fetchSerpPosition('test', 'example.com');
        expect(result.position).toBeNull();
    });

    it('returns null when organic array is empty', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ organic: [] }),
            })
        );
        const result = await fetchSerpPosition('test', 'example.com');
        expect(result.position).toBeNull();
    });

    it('throws when SERP_API_KEY is not set', async () => {
        process.env.SERP_API_KEY = '';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ organic: [] }) })
        );
        await expect(fetchSerpPosition('test', 'example.com')).rejects.toThrow('SERP_API_KEY');
    });

    it('works with ScrapingRobot provider (result.organicResults[].url)', async () => {
        process.env.SERP_API_PROVIDER = 'scrapingrobot';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        result: {
                            organicResults: [
                                { url: 'https://other.com' },
                                { url: 'https://example.com/landing' },
                            ],
                        },
                    }),
            })
        );
        const result = await fetchSerpPosition('test', 'example.com');
        expect(result.position).toBe(2);
    });
});
