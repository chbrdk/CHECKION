import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DomainResultNavProps } from '@/components/domain/DomainResultNav';

const navSourcePath = join(dirname(fileURLToPath(import.meta.url)), '../../components/domain/DomainResultNav.tsx');

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

    it('uses scrollable MUI Tabs (single row, matches ProjectHeaderNav)', () => {
        const src = readFileSync(navSourcePath, 'utf8');
        expect(src).toContain("variant=\"scrollable\"");
        expect(src).toContain('scrollButtons="auto"');
        expect(src).toContain('MSQDX_TABS_THEME_ACCENT_SX');
    });
});
