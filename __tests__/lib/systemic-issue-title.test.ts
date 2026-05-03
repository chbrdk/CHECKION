import { describe, expect, it } from 'vitest';
import { splitSystemicIssueTitle } from '@/lib/systemic-issue-title';

describe('splitSystemicIssueTitle', () => {
    it('strips trailing URL in parentheses (axe / Deque)', () => {
        const title =
            'Elements must meet minimum color contrast ratio thresholds (https://dequeuniversity.com/rules/axe/color-contrast?application=axeAPI)';
        expect(splitSystemicIssueTitle(title)).toEqual({
            body: 'Elements must meet minimum color contrast ratio thresholds',
            docUrl: 'https://dequeuniversity.com/rules/axe/color-contrast?application=axeAPI',
        });
    });

    it('strips trailing bare URL', () => {
        expect(splitSystemicIssueTitle('Short message https://example.com/doc')).toEqual({
            body: 'Short message',
            docUrl: 'https://example.com/doc',
        });
    });

    it('returns full string when no detachable URL', () => {
        expect(splitSystemicIssueTitle('No URL here')).toEqual({ body: 'No URL here', docUrl: null });
    });
});
