import { describe, expect, it } from 'vitest';

import { GenerativePageScrollRow } from '@/components/domain/GenerativePageScrollRow';
import { StructureUrlScrollRow } from '@/components/domain/StructureUrlScrollRow';
import { SystemicIssueScrollRow } from '@/components/domain/SystemicIssueScrollRow';
import { UxBrokenLinkScrollRow } from '@/components/domain/UxBrokenLinkScrollRow';
import { VisualUxUrlCountScrollRow } from '@/components/domain/VisualUxUrlCountScrollRow';

describe('VirtualScrollList memo row components', () => {
    it('exports memoized row components for domain tabs', () => {
        expect(SystemicIssueScrollRow).toBeDefined();
        expect(GenerativePageScrollRow).toBeDefined();
        expect(StructureUrlScrollRow).toBeDefined();
        expect(UxBrokenLinkScrollRow).toBeDefined();
        expect(VisualUxUrlCountScrollRow).toBeDefined();
    });
});
