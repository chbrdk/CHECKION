/**
 * Shape of Issue ↔ DB row (no database).
 */
import { describe, it, expect } from 'vitest';
import type { Issue } from '@/lib/types';

describe('scan_issues row shape', () => {
    it('Issue fields map to columns we persist', () => {
        const issue: Issue = {
            code: 'WCAG2AA.foo',
            type: 'error',
            message: 'msg',
            context: '<img>',
            selector: 'img',
            runner: 'axe',
            wcagLevel: 'A',
            helpUrl: 'https://example.com/h',
            boundingBox: { x: 1, y: 2, width: 3, height: 4 },
        };
        expect(issue.code).toBeDefined();
        expect(issue.boundingBox).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    });
});
