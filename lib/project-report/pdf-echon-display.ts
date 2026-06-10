/**
 * Compact ECHON market context for PDF — dedupe vs executive summary.
 */

import { isNearDuplicateText } from '@/lib/project-report/pdf-text-dedupe';
import type { EchonMarketContext } from '@/lib/project-report/echon-market-context';

export const PDF_ECHON_MAX_FINDINGS = 3;
export const PDF_ECHON_MAX_WATCHLIST = 4;

export interface EchonMarketPdfContent {
    show: boolean;
    executiveSummary: string | null;
    implications: string | null;
    keyFindings: string[];
    watchlist: string[];
    evidenceGaps: string[];
    contradictions: string[];
    citationCount: number | null;
    confidence: number | null;
    threadId: string | null;
}

function filterUniqueAgainst(needle: string, items: string[], max: number): string[] {
    const out: string[] = [];
    for (const item of items) {
        const t = item.trim();
        if (!t) continue;
        if (isNearDuplicateText(t, needle)) continue;
        if (out.some((x) => isNearDuplicateText(x, t))) continue;
        out.push(t);
        if (out.length >= max) break;
    }
    return out;
}

export function buildEchonMarketPdfContent(
    ctx: EchonMarketContext,
    options?: { executiveSummaryNarrative?: string | null }
): EchonMarketPdfContent {
    const empty: EchonMarketPdfContent = {
        show: false,
        executiveSummary: null,
        implications: null,
        keyFindings: [],
        watchlist: [],
        evidenceGaps: [],
        contradictions: [],
        citationCount: null,
        confidence: null,
        threadId: null,
    };

    if (!ctx.available) return empty;

    const narrativeExec = options?.executiveSummaryNarrative?.trim() ?? '';
    const echonExec = ctx.executiveSummary?.trim() ?? '';

    let executiveSummary: string | null = null;
    if (echonExec && !isNearDuplicateText(echonExec, narrativeExec)) {
        executiveSummary = echonExec;
    }

    const implicationsRaw = ctx.implications?.trim() ?? '';
    const implications =
        implicationsRaw &&
        !isNearDuplicateText(implicationsRaw, narrativeExec) &&
        !(executiveSummary && isNearDuplicateText(implicationsRaw, executiveSummary))
            ? implicationsRaw
            : null;

    const keyFindings = filterUniqueAgainst(
        [narrativeExec, executiveSummary ?? ''].filter(Boolean).join(' '),
        ctx.keyFindings ?? [],
        PDF_ECHON_MAX_FINDINGS
    );

    const watchlist = (ctx.watchlist ?? []).slice(0, PDF_ECHON_MAX_WATCHLIST);

    const evidenceGaps = filterUniqueAgainst(narrativeExec, ctx.evidenceGaps ?? [], 2);
    const contradictions = filterUniqueAgainst(narrativeExec, ctx.contradictions ?? [], 2);

    const show =
        Boolean(executiveSummary) ||
        Boolean(implications) ||
        keyFindings.length > 0 ||
        watchlist.length > 0;

    return {
        show,
        executiveSummary,
        implications,
        keyFindings,
        watchlist,
        evidenceGaps,
        contradictions,
        citationCount: ctx.citationCount ?? null,
        confidence: ctx.confidence ?? null,
        threadId: ctx.threadId ?? null,
    };
}
