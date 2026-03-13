/**
 * Shared logic to build position matrix from competitive benchmark (server + client).
 * Used by API (geo-question-history) and CompetitivePositionDiagram / GeoQuestionCard.
 */

import type { CompetitiveBenchmarkResult } from '@/lib/types';

export function extractHostname(input: string): string {
    const s = input.trim().toLowerCase();
    try {
        const u = new URL(s.startsWith('http') ? s : `https://${s}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? s;
    }
}

function citationMatchesDomain(citationDomain: string, ourDomain: string): boolean {
    const c = citationDomain.toLowerCase().trim();
    const d = ourDomain.toLowerCase().trim();
    if (c === d) return true;
    if (d.endsWith('.' + c)) return true;
    if (c.endsWith('.' + d)) return true;
    const dBase = d.split('.')[0];
    if (dBase && c === dBase) return true;
    if (dBase && c.startsWith(dBase + '.')) return true;
    return false;
}

function getPositionForDomain(
    run: { citations?: Array<{ domain?: string; position?: number }> },
    targetDomain: string
): number | null {
    if (!run.citations?.length) return null;
    const match = run.citations.find((c) =>
        citationMatchesDomain((c.domain ?? '').trim(), targetDomain)
    );
    return match != null && typeof match.position === 'number' && match.position >= 1
        ? match.position
        : null;
}

export interface PositionMatrixRow {
    queryIndex: number;
    queryLabel: string;
    queryText: string;
    [modelId: string]: number | string;
}

export function buildPositionMatrix(
    competitiveByModel: Record<string, CompetitiveBenchmarkResult>,
    targetDomain: string
): { rows: PositionMatrixRow[]; modelIds: string[] } {
    const modelIds = Object.keys(competitiveByModel);
    if (modelIds.length === 0) return { rows: [], modelIds: [] };

    const first = competitiveByModel[modelIds[0]!];
    const runsCount = first?.runs?.length ?? 0;
    if (runsCount === 0) return { rows: [], modelIds: [] };

    const rows: PositionMatrixRow[] = [];
    for (let i = 0; i < runsCount; i++) {
        const row: PositionMatrixRow = {
            queryIndex: i + 1,
            queryLabel: `Q${i + 1}`,
            queryText: first!.runs![i]?.query ?? '',
        };
        for (const modelId of modelIds) {
            const result = competitiveByModel[modelId];
            const run = result?.runs?.[i];
            const pos = run ? getPositionForDomain(run, targetDomain) : null;
            row[modelId] = pos ?? 0;
        }
        rows.push(row);
    }
    return { rows, modelIds };
}
