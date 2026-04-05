import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkPageUnchangedByHeaders } from '@/lib/page-unchanged-check';

describe('checkPageUnchangedByHeaders', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('returns unknown when previous has no etag or last-modified', async () => {
        await expect(
            checkPageUnchangedByHeaders('https://example.com', {}),
        ).resolves.toBe('unknown');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('returns unchanged when etag matches', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(null, {
                status: 200,
                headers: { etag: '"v1"' },
            }),
        );
        await expect(
            checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
        ).resolves.toBe('unchanged');
    });

    it('returns changed when etag differs', async () => {
        vi.mocked(fetch).mockResolvedValue(
            new Response(null, {
                status: 200,
                headers: { etag: '"v2"' },
            }),
        );
        await expect(
            checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
        ).resolves.toBe('changed');
    });

    it('returns unknown on fetch failure', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('network'));
        await expect(
            checkPageUnchangedByHeaders('https://example.com', { etag: '"v1"' }),
        ).resolves.toBe('unknown');
    });
});
