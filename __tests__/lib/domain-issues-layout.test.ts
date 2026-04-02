import { describe, expect, it } from 'vitest';
import { DOMAIN_ISSUES_SCROLL } from '@/lib/domain-issues-layout';

describe('DOMAIN_ISSUES_SCROLL', () => {
    it('uses viewport caps (vh) for scroll areas when parent height is auto', () => {
        expect(DOMAIN_ISSUES_SCROLL.xs).toMatch(/vh/);
        expect(DOMAIN_ISSUES_SCROLL.singleListLg).toMatch(/vh/);
    });
});
