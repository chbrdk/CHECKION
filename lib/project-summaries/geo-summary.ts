/**
 * Shared GEO summary logic for project APIs and report collector.
 */

import type { CompetitiveBenchmarkResult, CompetitiveMetrics, GeoEeatIntensiveResult } from '@/lib/types';
import { listGeoEeatRuns } from '@/lib/db/geo-eeat-runs';

const RUNS_LIMIT = 5;

export function normalizeGeoDomain(urlOrDomain: string): string {
    let s = urlOrDomain.trim().toLowerCase();
    s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? '';
    return s;
}

/** Derive 0–100 score from competitive metrics for a domain. */
export function scoreFromGeoMetrics(metrics: CompetitiveMetrics | undefined): number | null {
    if (!metrics) return null;
    if (typeof metrics.shareOfVoice === 'number' && metrics.shareOfVoice >= 0) {
        return Math.min(100, Math.round(metrics.shareOfVoice * 100));
    }
    if (typeof metrics.avgPosition === 'number' && metrics.avgPosition >= 1) {
        if (metrics.avgPosition <= 10) return 110 - 10 * metrics.avgPosition;
        return 0;
    }
    return null;
}

export function getScoreFromCompetitivePayload(
    payload: GeoEeatIntensiveResult | null,
    projectDomain: string
): number | null {
    if (!payload) return null;
    const byModel =
        payload.competitiveByModel ?? (payload.competitive ? { default: payload.competitive } : null);
    if (!byModel || typeof byModel !== 'object') return null;

    const normalizedProject = normalizeGeoDomain(projectDomain);
    if (!normalizedProject) return null;

    const scores: number[] = [];
    for (const result of Object.values(byModel) as CompetitiveBenchmarkResult[]) {
        if (!result?.metrics || !Array.isArray(result.metrics)) continue;
        const forDomain = result.metrics.find((m) => normalizeGeoDomain(m.domain) === normalizedProject);
        const s = scoreFromGeoMetrics(forDomain);
        if (s != null) scores.push(s);
    }
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function getScoresFromCompetitivePayload(
    payload: GeoEeatIntensiveResult | null,
    domains: string[]
): Record<string, number> {
    const out: Record<string, number> = {};
    if (!payload || domains.length === 0) return out;
    const byModel =
        payload.competitiveByModel ?? (payload.competitive ? { default: payload.competitive } : null);
    if (!byModel || typeof byModel !== 'object') return out;

    for (const domain of domains) {
        const normalized = normalizeGeoDomain(domain);
        if (!normalized) continue;
        const scores: number[] = [];
        for (const result of Object.values(byModel) as CompetitiveBenchmarkResult[]) {
            if (!result?.metrics || !Array.isArray(result.metrics)) continue;
            const forDomain = result.metrics.find((m) => normalizeGeoDomain(m.domain) === normalized);
            const s = scoreFromGeoMetrics(forDomain);
            if (s != null) scores.push(s);
        }
        if (scores.length > 0) {
            out[normalized] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
    }
    return out;
}

export interface ProjectGeoSummaryRun {
    id: string;
    url: string;
    status: string;
    createdAt: string;
    payload: GeoEeatIntensiveResult | null;
}

export interface ProjectGeoSummaryData {
    score: number | null;
    competitorScores: Record<string, number>;
    runs: Array<{ id: string; url: string; status: string; createdAt: string }>;
    latestComplete: ProjectGeoSummaryRun | null;
}

export async function buildProjectGeoSummary(
    projectUserId: string,
    projectId: string,
    projectDomain: string,
    competitorDomains: string[]
): Promise<ProjectGeoSummaryData> {
    const runs = await listGeoEeatRuns(projectUserId, RUNS_LIMIT, { projectId });

    let score: number | null = null;
    let competitorScores: Record<string, number> = {};
    let latestComplete: ProjectGeoSummaryRun | null = null;

    for (const run of runs) {
        if (run.status !== 'complete' || !run.payload) continue;
        const s = getScoreFromCompetitivePayload(run.payload, projectDomain);
        if (s != null) {
            score = s;
            competitorScores = getScoresFromCompetitivePayload(run.payload, competitorDomains);
            latestComplete = {
                id: run.id,
                url: run.url,
                status: run.status,
                createdAt: run.createdAt.toISOString(),
                payload: run.payload,
            };
            break;
        }
        if (!latestComplete) {
            latestComplete = {
                id: run.id,
                url: run.url,
                status: run.status,
                createdAt: run.createdAt.toISOString(),
                payload: run.payload,
            };
        }
    }

    return {
        score,
        competitorScores,
        runs: runs.map((r) => ({
            id: r.id,
            url: r.url,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
        })),
        latestComplete,
    };
}
