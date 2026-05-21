/**
 * Unit tests: SERP organic parsing and domain matching
 */
import { describe, it, expect } from 'vitest';
import {
    parseSerperOrganicPage,
    parseScrapingRobotOrganic,
    domainMatchesOrganic,
    normalizeRankDomainForMatch,
} from '@/lib/serp-organic';

describe('parseSerperOrganicPage', () => {
    it('maps organic items with 1-based positions from startPosition', () => {
        const results = parseSerperOrganicPage(
            {
                organic: [
                    { title: 'First', link: 'https://example.com/a', snippet: 'Snippet A' },
                    { title: 'Second', link: 'https://other.com/b', snippet: 'Snippet B' },
                ],
            },
            11
        );
        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({
            position: 11,
            title: 'First',
            link: 'https://example.com/a',
            snippet: 'Snippet A',
            domain: 'example.com',
        });
        expect(results[1].position).toBe(12);
    });

    it('skips items without link', () => {
        const results = parseSerperOrganicPage({ organic: [{ title: 'No link' }] }, 1);
        expect(results).toHaveLength(0);
    });
});

describe('parseScrapingRobotOrganic', () => {
    it('parses organicResults with description fallback', () => {
        const results = parseScrapingRobotOrganic({
            result: {
                organicResults: [
                    { title: 'Page', url: 'https://site.com', description: 'Desc' },
                ],
            },
        });
        expect(results[0]).toMatchObject({
            position: 1,
            snippet: 'Desc',
            domain: 'site.com',
        });
    });
});

describe('domainMatchesOrganic', () => {
    it('matches www and subdomains', () => {
        expect(domainMatchesOrganic('example.com', 'www.example.com')).toBe(true);
        expect(domainMatchesOrganic('example.com', 'shop.example.com')).toBe(true);
        expect(normalizeRankDomainForMatch('https://www.Example.com/')).toBe('example.com');
    });

    it('does not match unrelated domains', () => {
        expect(domainMatchesOrganic('example.com', 'other.com')).toBe(false);
    });
});
