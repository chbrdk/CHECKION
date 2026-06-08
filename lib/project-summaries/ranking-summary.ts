/**
 * Shared ranking summary logic for project APIs and report collector.
 */

import { listKeywordsByProject } from '@/lib/db/rank-tracking-keywords';
import { getLastPositionsByKeywordIds } from '@/lib/db/rank-tracking-positions';

/** Position 1 → 100, 2 → 90, …, 10 → 10, 11+ → 0 */
export function positionToPoints(position: number | null): number {
    if (position == null || position < 1) return 0;
    if (position <= 10) return 110 - 10 * position;
    return 0;
}

export interface ProjectRankingSummaryData {
    score: number | null;
    keywordCount: number;
    lastUpdated: string | null;
    competitorScores: Record<string, number>;
}

export async function buildProjectRankingSummary(
    projectUserId: string,
    projectId: string
): Promise<ProjectRankingSummaryData> {
    const keywords = await listKeywordsByProject(projectUserId, projectId);
    const keywordIds = keywords.map((k) => k.id);
    if (keywordIds.length === 0) {
        return { score: null, keywordCount: 0, lastUpdated: null, competitorScores: {} };
    }

    const lastPositions = await getLastPositionsByKeywordIds(keywordIds);
    let sumPoints = 0;
    let countWithPosition = 0;
    let lastUpdated: string | null = null;
    const competitorSums: Record<string, { sum: number; count: number }> = {};

    for (const [, data] of lastPositions) {
        const points = positionToPoints(data.position);
        if (data.position != null && data.position >= 1) {
            sumPoints += points;
            countWithPosition += 1;
        }
        if (data.recordedAt) {
            const iso = data.recordedAt.toISOString();
            if (!lastUpdated || iso > lastUpdated) lastUpdated = iso;
        }
        const comp = data.competitorPositions;
        if (comp && typeof comp === 'object' && !Array.isArray(comp)) {
            for (const [domain, pos] of Object.entries(comp)) {
                if (domain && pos != null && pos >= 1) {
                    const p = positionToPoints(pos);
                    if (!competitorSums[domain]) competitorSums[domain] = { sum: 0, count: 0 };
                    competitorSums[domain].sum += p;
                    competitorSums[domain].count += 1;
                }
            }
        }
    }

    const score = countWithPosition > 0 ? Math.round(sumPoints / countWithPosition) : null;
    const competitorScores: Record<string, number> = {};
    for (const [domain, { sum, count }] of Object.entries(competitorSums)) {
        if (count > 0) competitorScores[domain] = Math.round(sum / count);
    }

    return {
        score,
        keywordCount: keywords.length,
        lastUpdated,
        competitorScores,
    };
}
