import { describe, it, expect } from 'vitest';
import { parseLlmsTxt } from './llms-txt-parse';

describe('parseLlmsTxt', () => {
    it('parses sections', () => {
        const body = `# My Site
Description: A cool site.
Rules: Be nice.
Allow: /
Block: /admin`;
        const r = parseLlmsTxt(body, 'https://example.com');
        expect(r.sections).toContain('Description');
        expect(r.sections).toContain('Rules');
        expect(r.sections).toContain('Allow');
        expect(r.sections).toContain('Block');
    });

    it('detects sitemap', () => {
        const body = 'Sitemap: https://example.com/sitemap.xml';
        const r = parseLlmsTxt(body, 'https://example.com');
        expect(r.hasSitemap).toBe(true);
    });

    it('extracts rules content', () => {
        const body = `Rules:
Always cite sources.
Use markdown format.`;
        const r = parseLlmsTxt(body, 'https://example.com');
        expect(r.rulesContent).toContain('Always cite sources');
    });

    it('detects title and description', () => {
        const body = `# My Brand
> One-line description here`;
        const r = parseLlmsTxt(body, 'https://example.com');
        expect(r.hasTitle).toBe(true);
        expect(r.hasDescription).toBe(true);
    });

    it('finds markdown URLs', () => {
        const body = '- [Page](https://example.com/page.md)';
        const r = parseLlmsTxt(body, 'https://example.com');
        expect(r.markdownUrls).toContain('https://example.com/page.md');
    });
});
