/**
 * UI helpers for project report run progress (polling, stale detection).
 */

import type { ReportProgress, ReportProgressStage } from '@/lib/project-report/progress';

const AGENT_STAGES: ReportProgressStage[] = [
    'agent_site_quality',
    'agent_seo',
    'agent_geo',
    'agent_competitive',
    'agent_journey',
    'agent_synthesizer',
];

/** LLM agent steps can sit on one % for several minutes — expected, not a crash. */
export function isAgentProgressStage(stage: ReportProgressStage | undefined): boolean {
    return stage != null && AGENT_STAGES.includes(stage);
}

export function secondsSinceProgressUpdate(
    progress: ReportProgress | null | undefined,
    nowMs: number = Date.now()
): number {
    if (!progress?.updatedAt) return 0;
    const updated = new Date(progress.updatedAt).getTime();
    if (Number.isNaN(updated)) return 0;
    return Math.max(0, Math.floor((nowMs - updated) / 1000));
}

/** Show reassurance after ~90s on the same agent step. */
export function shouldShowAgentStillRunningHint(
    progress: ReportProgress | null | undefined,
    nowMs: number = Date.now()
): boolean {
    if (!isAgentProgressStage(progress?.stage)) return false;
    return secondsSinceProgressUpdate(progress, nowMs) >= 90;
}

export function formatProgressDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
