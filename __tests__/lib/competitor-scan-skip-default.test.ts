import { describe, it, expect } from 'vitest';
import { resolveSkipUnchangedPagesFromQuery } from '@/lib/competitor-scan-skip-default';

describe('resolveSkipUnchangedPagesFromQuery', () => {
    it('defaults to true when prior scan exists', () => {
        const sp = new URLSearchParams();
        expect(resolveSkipUnchangedPagesFromQuery(sp, true)).toBe(true);
    });

    it('defaults to false on first scan', () => {
        const sp = new URLSearchParams();
        expect(resolveSkipUnchangedPagesFromQuery(sp, false)).toBe(false);
    });

    it('respects explicit false', () => {
        const sp = new URLSearchParams({ skipUnchangedPages: 'false' });
        expect(resolveSkipUnchangedPagesFromQuery(sp, true)).toBe(false);
    });

    it('respects explicit true', () => {
        const sp = new URLSearchParams({ skipUnchangedPages: 'true' });
        expect(resolveSkipUnchangedPagesFromQuery(sp, false)).toBe(true);
    });
});
