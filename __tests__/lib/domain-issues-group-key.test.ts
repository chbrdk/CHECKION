import { describe, it, expect } from 'vitest';
import { buildDomainIssueGroupKey } from '@/lib/domain-issues-group-key';

describe('buildDomainIssueGroupKey', () => {
    it('is deterministic for same input', () => {
        const a = buildDomainIssueGroupKey({ code: 'X', type: 'error', message: 'Hello' });
        const b = buildDomainIssueGroupKey({ code: 'X', type: 'error', message: 'Hello' });
        expect(a).toBe(b);
        expect(a).toHaveLength(32);
    });

    it('changes when any field changes', () => {
        const base = buildDomainIssueGroupKey({ code: 'X', type: 'error', message: 'Hello' });
        expect(buildDomainIssueGroupKey({ code: 'Y', type: 'error', message: 'Hello' })).not.toBe(base);
        expect(buildDomainIssueGroupKey({ code: 'X', type: 'warning', message: 'Hello' })).not.toBe(base);
        expect(buildDomainIssueGroupKey({ code: 'X', type: 'error', message: 'Hello!' })).not.toBe(base);
    });
});

