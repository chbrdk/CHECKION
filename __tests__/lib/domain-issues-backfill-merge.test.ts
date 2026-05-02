import { describe, it, expect } from 'vitest';
import type { Issue, ScanResult } from '@/lib/types';
import { mergePageResultsPreferringScanIssuesTable } from '@/lib/domain-issues-backfill';

describe('mergePageResultsPreferringScanIssuesTable', () => {
    it('keeps JSON issues when scan_issues map is empty', () => {
        const jsonIssue: Issue = {
            code: 'j',
            type: 'error',
            message: 'from json',
            context: '',
            selector: '',
            runner: 'axe',
            wcagLevel: 'AA',
        };
        const pages: ScanResult[] = [
            { id: 's1', url: 'https://a.com/', issues: [jsonIssue] } as ScanResult,
        ];
        const merged = mergePageResultsPreferringScanIssuesTable(pages, new Map());
        expect(merged[0].issues?.[0].message).toBe('from json');
    });

    it('prefers scan_issues when table has rows', () => {
        const jsonIssue: Issue = {
            code: 'j',
            type: 'error',
            message: 'from json',
            context: '',
            selector: '',
            runner: 'axe',
            wcagLevel: 'AA',
        };
        const tableIssue: Issue = {
            code: 't',
            type: 'warning',
            message: 'from table',
            context: '',
            selector: '',
            runner: 'axe',
            wcagLevel: 'AA',
        };
        const pages: ScanResult[] = [
            { id: 's1', url: 'https://a.com/', issues: [jsonIssue] } as ScanResult,
        ];
        const map = new Map<string, Issue[]>([['s1', [tableIssue]]]);
        const merged = mergePageResultsPreferringScanIssuesTable(pages, map);
        expect(merged[0].issues?.[0].message).toBe('from table');
    });

    it('does not replace when table has zero rows for that scan', () => {
        const jsonIssue: Issue = {
            code: 'j',
            type: 'error',
            message: 'from json',
            context: '',
            selector: '',
            runner: 'axe',
            wcagLevel: 'AA',
        };
        const pages: ScanResult[] = [
            { id: 's1', url: 'https://a.com/', issues: [jsonIssue] } as ScanResult,
        ];
        const map = new Map<string, Issue[]>([['s1', []]]);
        const merged = mergePageResultsPreferringScanIssuesTable(pages, map);
        expect(merged[0].issues?.[0].message).toBe('from json');
    });
});
