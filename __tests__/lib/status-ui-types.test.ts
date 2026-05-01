import { describe, it, expect } from 'vitest';
import { initialSinglePageScanUi } from '@/lib/status-ui/types';

describe('status-ui types', () => {
    it('initialSinglePageScanUi is closed with empty phases', () => {
        const s = initialSinglePageScanUi();
        expect(s.open).toBe(false);
        expect(s.metaPhase).toBeNull();
        expect(s.devicePhaseByDevice).toEqual({});
    });
});
