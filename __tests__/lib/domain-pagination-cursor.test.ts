import { describe, it, expect } from 'vitest';
import {
    encodeSlimKeysetCursor,
    decodeSlimKeysetCursor,
    slimRowToKeysetPayload,
    encodeSeoKeysetCursor,
    decodeSeoKeysetCursor,
    seoRowToKeysetPayload,
} from '@/lib/domain-pagination-cursor';

describe('domain-pagination-cursor', () => {
    it('roundtrips slim cursor', () => {
        const payload = slimRowToKeysetPayload(
            {
                domainPageId: 'dp_1',
                url: 'https://a.com/x',
                score: 42,
                stats: { errors: 1, warnings: 2, notices: 0 },
            },
            'issues',
            'desc'
        );
        expect(payload).not.toBeNull();
        const raw = encodeSlimKeysetCursor(payload!);
        const back = decodeSlimKeysetCursor(raw, 'issues', 'desc');
        expect(back).toEqual(payload);
    });

    it('rejects slim cursor when sort changes', () => {
        const payload = slimRowToKeysetPayload(
            { domainPageId: 'dp_1', url: 'https://a.com' },
            'url',
            'asc'
        )!;
        const raw = encodeSlimKeysetCursor(payload);
        expect(decodeSlimKeysetCursor(raw, 'score', 'asc')).toBeNull();
    });

    it('roundtrips seo cursor', () => {
        const payload = seoRowToKeysetPayload(
            { domainPageId: 'dp_2', url: 'https://b.com', wordCount: 120 },
            'wordCount',
            'desc'
        );
        expect(payload).not.toBeNull();
        const raw = encodeSeoKeysetCursor(payload!);
        const back = decodeSeoKeysetCursor(raw, 'wordCount', 'desc');
        expect(back).toEqual(payload);
    });
});
