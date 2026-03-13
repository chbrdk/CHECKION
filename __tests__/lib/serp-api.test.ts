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
        const mockRes = {
            ok: true,
            json: () =>
                Promise.resolve({
                    organic: [{ link: 'https://example.com/page' }],
                }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));
        const result = await fetchSerpPosition('test query', 'example.com', { country: 'de', language: 'de' });
        expect(result.position).toBe(1);
        expect(fetch).toHaveBeenCalled(); // Serper calls fetch per page (default 10)
    });

    it('returns position 2 when domain appears in second organic result', async () => {
        const mockRes = {
            ok: true,
            json: () =>
                Promise.resolve({
                    organic: [
                        { link: 'https://other.com' },
                        { link: 'https://example.com/landing' },
                    ],
                }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));
        const result = await fetchSerpPosition('test', 'example.com', { country: 'de', language: 'de' });
        expect(result.position).toBe(2);
    });

    it('returns null when domain does not appear in organic results', async () => {
        const mockRes = {
            ok: true,
            json: () =>
                Promise.resolve({
                    organic: [
                        { link: 'https://other.com' },
                        { link: 'https://competitor.com' },
                    ],
                }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockRes));
        const result = await fetchSerpPosition('test', 'example.com', { country: 'us', language: 'en' });
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
        const result = await fetchSerpPosition('test', 'example.com', { country: 'de', language: 'de' });
        expect(result.position).toBeNull();
        expect(fetch).toHaveBeenCalledTimes(1); // stops after first empty page
    });

    it('throws when SERP_API_KEY is not set', async () => {
        process.env.SERP_API_KEY = '';
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ organic: [] }) })
        );
        await expect(fetchSerpPosition('test', 'example.com', { country: 'de', language: 'de' })).rejects.toThrow(
            'SERP_API_KEY'
        );
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
        const result = await fetchSerpPosition('test', 'example.com', { country: 'us', language: 'en' });
        expect(result.position).toBe(2);
    });

    it('finds domain position across multiple pages (Serper numPages)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn()
                .mockImplementation((_url: string, opts: { body?: string }) => {
                    const body = opts?.body ? (JSON.parse(opts.body) as { page?: number }) : {};
                    const page = body.page ?? 1;
                    if (page === 1) {
                        return Promise.resolve({
                            ok: true,
                            json: () =>
                                Promise.resolve({
                                    organic: Array.from({ length: 10 }, (_, i) => ({
                                        link: `https://other-${i}.com`,
                                    })),
                                }),
                        });
                    }
                    if (page === 2) {
                        return Promise.resolve({
                            ok: true,
                            json: () =>
                                Promise.resolve({
                                    organic: [
                                        { link: 'https://a.com' },
                                        { link: 'https://b.com' },
                                        { link: 'https://example.com/landing' },
                                    ],
                                }),
                        });
                    }
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({ organic: [] }) });
                })
        );
        const result = await fetchSerpPosition('test', 'example.com', {
            country: 'de',
            language: 'de',
            numPages: 10,
        });
        expect(result.position).toBe(13); // 10 (page 1) + 3 (third on page 2)
    });

    it('returns competitorPositions when competitorDomains is passed (same SERP)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        organic: [
                            { link: 'https://competitor-a.com/page' },
                            { link: 'https://example.com/landing' },
                            { link: 'https://competitor-b.com' },
                        ],
                    }),
            })
        );
        const result = await fetchSerpPosition('test', 'example.com', {
            country: 'de',
            language: 'de',
            competitorDomains: ['competitor-a.com', 'competitor-b.com'],
        });
        expect(result.position).toBe(2);
        expect(result.competitorPositions).toBeDefined();
        expect(result.competitorPositions!['competitor-a.com']).toBe(1);
        expect(result.competitorPositions!['competitor-b.com']).toBe(3);
    });
});
