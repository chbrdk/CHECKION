/**
 * Tests for report progress UI helpers.
 */
import { describe, it, expect } from 'vitest';
import {
    formatProgressDuration,
    isAgentProgressStage,
    secondsSinceProgressUpdate,
    shouldShowAgentStillRunningHint,
} from '@/lib/project-report/progress-ui';
import { makeReportProgress } from '@/lib/project-report/progress';

describe('progress-ui', () => {
    it('detects agent stages', () => {
        expect(isAgentProgressStage('agent_site_quality')).toBe(true);
        expect(isAgentProgressStage('collecting_deep')).toBe(false);
    });

    it('computes seconds since last progress update', () => {
        const progress = makeReportProgress('agent_geo', 'GEO', 'GEO EN', 'de');
        const updatedAt = new Date('2026-06-08T10:00:00.000Z').toISOString();
        const seconds = secondsSinceProgressUpdate(
            { ...progress, updatedAt },
            new Date('2026-06-08T10:02:30.000Z').getTime()
        );
        expect(seconds).toBe(150);
    });

    it('shows still-running hint after 90s on agent step', () => {
        const base = makeReportProgress('agent_site_quality', 'WCAG', 'WCAG EN', 'de');
        const recent = {
            ...base,
            updatedAt: new Date('2026-06-08T10:00:00.000Z').toISOString(),
        };
        expect(
            shouldShowAgentStillRunningHint(recent, new Date('2026-06-08T10:01:00.000Z').getTime())
        ).toBe(false);
        expect(
            shouldShowAgentStillRunningHint(recent, new Date('2026-06-08T10:02:00.000Z').getTime())
        ).toBe(true);
    });

    it('formats durations for display', () => {
        expect(formatProgressDuration(45)).toBe('45s');
        expect(formatProgressDuration(125)).toBe('2m 5s');
        expect(formatProgressDuration(120)).toBe('2m');
    });
});
