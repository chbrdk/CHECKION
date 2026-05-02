import { describe, expect, it, vi, afterEach } from 'vitest';
import { createScanPhaseTimer } from '@/lib/scan-phase-timing';

describe('createScanPhaseTimer', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('records sequential segment ms', () => {
        const t = createScanPhaseTimer();
        t.mark('a');
        t.mark('b');
        const phases = t.getPhases();
        expect(phases.a).toBeGreaterThanOrEqual(0);
        expect(phases.b).toBeGreaterThanOrEqual(0);
    });
});
