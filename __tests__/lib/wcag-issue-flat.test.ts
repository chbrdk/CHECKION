import { describe, it, expect } from 'vitest';
import type { Issue } from '@/lib/types';
import { issueToFlatColumns, metaFromWcagIssueFlat } from '@/lib/wcag-issue-flat';

describe('wcag-issue-flat', () => {
    it('normalizes optional fields for persistence', () => {
        const issue: Issue = {
            code: 'c1',
            type: 'warning',
            message: 'm',
            context: '',
            selector: '',
            runner: 'lighthouse',
            wcagLevel: 'AA',
        };
        const f = issueToFlatColumns(issue);
        expect(f.context).toBe('');
        expect(f.helpUrl).toBeNull();
        expect(f.boundingBox).toBeNull();
        expect(metaFromWcagIssueFlat(f)).toBeNull();
    });

    it('puts bounding box in meta helper', () => {
        const issue: Issue = {
            code: 'c1',
            type: 'error',
            message: 'm',
            context: 'x',
            selector: 's',
            runner: 'axe',
            wcagLevel: 'A',
            boundingBox: { x: 0, y: 0, width: 10, height: 10 },
        };
        const f = issueToFlatColumns(issue);
        expect(metaFromWcagIssueFlat(f)).toEqual({ boundingBox: { x: 0, y: 0, width: 10, height: 10 } });
    });
});
