import { describe, expect, it } from 'vitest';
import { DOMAIN_ISSUES_SCROLL } from '@/lib/domain-issues-layout';

describe('DOMAIN_ISSUES_SCROLL', () => {
    it('uses viewport caps (vh) so virtual list scrollports do not depend on parent height:auto', () => {
        expect(DOMAIN_ISSUES_SCROLL.xs).toMatch(/vh/);
        expect(DOMAIN_ISSUES_SCROLL.groupsLgStep1).toMatch(/vh/);
        expect(DOMAIN_ISSUES_SCROLL.gridRowLg).toMatch(/vh/);
    });
});
