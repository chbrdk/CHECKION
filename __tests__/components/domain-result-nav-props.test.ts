import { describe, expect, it } from 'vitest';
import type { DomainResultNavProps } from '@/components/domain/DomainResultNav';

describe('DomainResultNav props', () => {
    it('supports embedded flag for nav inside a card shell', () => {
        const base: DomainResultNavProps = {
            domainId: 'scan-1',
            activeSection: 'overview',
            domainLinkQuery: {},
        };
        const embedded: DomainResultNavProps = { ...base, embedded: true };
        expect(embedded.embedded).toBe(true);
        expect(base.embedded).toBeUndefined();
    });
});
