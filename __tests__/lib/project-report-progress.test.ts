/**
 * Tests for report progress stages.
 */
import { describe, it, expect } from 'vitest';
import { makeReportProgress, REPORT_STAGE_PERCENT } from '@/lib/project-report/progress';

describe('makeReportProgress', () => {
    it('returns German label when locale is de', () => {
        const p = makeReportProgress('agent_geo', 'GEO Agent', 'GEO Agent EN', 'de');
        expect(p.label).toBe('GEO Agent');
        expect(p.stage).toBe('agent_geo');
        expect(p.percent).toBe(REPORT_STAGE_PERCENT.agent_geo);
    });

    it('returns English label when locale is en', () => {
        const p = makeReportProgress('agent_synthesizer', 'DE', 'Synthesizer', 'en');
        expect(p.label).toBe('Synthesizer');
    });
});
