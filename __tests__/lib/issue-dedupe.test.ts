/**
 * Unit tests: issue deduplication and axe WCAG level map.
 */
import { describe, it, expect } from 'vitest';
import {
    normalizeSelector,
    getRuleGroup,
    deduplicateIssues,
} from '@/lib/issue-dedupe';
import { AXE_RULE_WCAG_LEVEL } from '@/lib/axe-wcag-levels';
import type { Issue } from '@/lib/types';

function issue(overrides: Partial<Issue> & { code: string; runner: Issue['runner'] }): Issue {
    return {
        code: overrides.code,
        type: 'error',
        message: '',
        context: '',
        selector: overrides.selector ?? '',
        runner: overrides.runner,
        wcagLevel: overrides.wcagLevel ?? 'Unknown',
        ...overrides,
    };
}

describe('normalizeSelector', () => {
    it('trims whitespace', () => {
        expect(normalizeSelector('  #foo  ')).toBe('#foo');
    });
    it('caps at 500 chars', () => {
        const long = 'a'.repeat(600);
        expect(normalizeSelector(long).length).toBe(500);
    });
    it('returns empty for empty input', () => {
        expect(normalizeSelector('')).toBe('');
    });
});

describe('getRuleGroup', () => {
    it('returns code for axe issues', () => {
        expect(getRuleGroup(issue({ code: 'image-alt', runner: 'axe', selector: '#x' }))).toBe('image-alt');
        expect(getRuleGroup(issue({ code: 'color-contrast', runner: 'axe', selector: '#y' }))).toBe('color-contrast');
    });
    it('maps htmlcs sniffer code to axe rule when known', () => {
        const htmlcsIssue = issue({
            code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
            runner: 'htmlcs',
            selector: '#img',
        });
        expect(getRuleGroup(htmlcsIssue)).toBe('image-alt');
    });
    it('falls back to full code for unknown htmlcs', () => {
        const htmlcsIssue = issue({
            code: 'WCAG2AA.Principle2.Guideline2_4.2_4_1.XXX',
            runner: 'htmlcs',
            selector: '#x',
        });
        expect(getRuleGroup(htmlcsIssue)).toBe('WCAG2AA.Principle2.Guideline2_4.2_4_1.XXX');
    });
});

describe('deduplicateIssues', () => {
    it('merges two issues with same selector and same rule group (axe + htmlcs)', () => {
        const axeIssue = issue({
            code: 'image-alt',
            runner: 'axe',
            selector: '#main-img',
            message: 'Image must have alt',
            wcagLevel: 'A',
        });
        const htmlcsIssue = issue({
            code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
            runner: 'htmlcs',
            selector: '#main-img',
            message: 'Img missing alt',
            wcagLevel: 'A',
        });
        const result = deduplicateIssues([axeIssue, htmlcsIssue]);
        expect(result).toHaveLength(1);
        expect(result[0].code).toBeDefined();
        expect(result[0].selector).toBe('#main-img');
    });

    it('keeps two issues when same selector but different rule group', () => {
        const a = issue({ code: 'image-alt', runner: 'axe', selector: '#x', wcagLevel: 'A' });
        const b = issue({ code: 'color-contrast', runner: 'axe', selector: '#x', wcagLevel: 'AA' });
        const result = deduplicateIssues([a, b]);
        expect(result).toHaveLength(2);
    });

    it('prefers issue with known wcagLevel when merging', () => {
        const unknownLevel = issue({
            code: 'image-alt',
            runner: 'axe',
            selector: '#img',
            wcagLevel: 'Unknown',
            message: 'Axe',
        });
        const knownLevel = issue({
            code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
            runner: 'htmlcs',
            selector: '#img',
            wcagLevel: 'A',
            message: 'HTMLCS',
        });
        const result = deduplicateIssues([unknownLevel, knownLevel]);
        expect(result).toHaveLength(1);
        expect(result[0].wcagLevel).toBe('A');
        expect(result[0].message).toBe('HTMLCS');
    });

    it('prefers issue with known wcagLevel when axe is first', () => {
        const knownLevel = issue({
            code: 'WCAG2AA.Principle1.Guideline1_1.1_1_1.H37',
            runner: 'htmlcs',
            selector: '#img',
            wcagLevel: 'A',
        });
        const unknownLevel = issue({
            code: 'image-alt',
            runner: 'axe',
            selector: '#img',
            wcagLevel: 'Unknown',
        });
        const result = deduplicateIssues([knownLevel, unknownLevel]);
        expect(result).toHaveLength(1);
        expect(result[0].wcagLevel).toBe('A');
    });

    it('leaves single issues unchanged', () => {
        const single = issue({ code: 'document-title', runner: 'axe', selector: 'html', wcagLevel: 'A' });
        expect(deduplicateIssues([single])).toHaveLength(1);
        expect(deduplicateIssues([single])[0].code).toBe('document-title');
    });
});

describe('AXE_RULE_WCAG_LEVEL', () => {
    it('maps common axe rules to expected levels', () => {
        expect(AXE_RULE_WCAG_LEVEL['image-alt']).toBe('A');
        expect(AXE_RULE_WCAG_LEVEL['color-contrast']).toBe('AA');
        expect(AXE_RULE_WCAG_LEVEL['document-title']).toBe('A');
        expect(AXE_RULE_WCAG_LEVEL['html-has-lang']).toBe('A');
        expect(AXE_RULE_WCAG_LEVEL['color-contrast-enhanced']).toBe('APCA');
        expect(AXE_RULE_WCAG_LEVEL['meta-viewport']).toBe('AA');
        expect(AXE_RULE_WCAG_LEVEL['button-name']).toBe('A');
        expect(AXE_RULE_WCAG_LEVEL['label']).toBe('A');
    });
    it('contains only valid WCAG level values', () => {
        const valid: Array<'A' | 'AA' | 'AAA' | 'APCA'> = ['A', 'AA', 'AAA', 'APCA'];
        for (const level of Object.values(AXE_RULE_WCAG_LEVEL)) {
            expect(valid).toContain(level);
        }
    });
});
