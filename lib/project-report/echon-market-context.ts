/**
 * Parse ECHON research thread → slim market context for CHECKION report agents.
 */

import { z } from 'zod';

const echonResearchAnswerSchema = z.object({
    executive_summary: z.string().trim().optional(),
    key_findings: z.array(z.string()).optional(),
    implications: z.string().trim().nullable().optional(),
    recommended_watchlist: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
    contradictions: z.array(z.string()).optional(),
    evidence_gaps: z.array(z.string()).optional(),
});

const echonMessageSchema = z.object({
    id: z.string(),
    role: z.string(),
    structured: z.record(z.string(), z.any()).optional(),
    citations: z.array(z.any()).optional(),
    created_at: z.string().optional(),
});

const echonThreadSchema = z.object({
    id: z.string(),
    title: z.string().nullable().optional(),
    updated_at: z.string().optional(),
    messages: z.array(echonMessageSchema).optional(),
});

export type EchonMarketContext = {
    available: boolean;
    reason?: string;
    threadId?: string;
    threadTitle?: string | null;
    capturedAt?: string;
    executiveSummary?: string;
    keyFindings?: string[];
    implications?: string;
    watchlist?: string[];
    evidenceGaps?: string[];
    contradictions?: string[];
    citationCount?: number;
    confidence?: number;
};

function trimList(items: string[] | undefined, max: number): string[] {
    if (!items?.length) return [];
    const out: string[] = [];
    for (const item of items) {
        const t = item.trim();
        if (!t) continue;
        out.push(t);
        if (out.length >= max) break;
    }
    return out;
}

function truncateWords(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return text.trim();
    return `${words.slice(0, maxWords).join(' ')}…`;
}

export function emptyEchonMarketContext(reason?: string): EchonMarketContext {
    return { available: false, reason };
}

export function parseEchonResearchAnswerToMarketContext(
    answer: unknown,
    meta: { threadId: string; citationCount?: number; capturedAt?: string }
): EchonMarketContext {
    const parsed = echonResearchAnswerSchema.safeParse(answer);
    if (!parsed.success || !parsed.data.executive_summary?.trim()) {
        return emptyEchonMarketContext('echon_no_structured_answer');
    }
    const a = parsed.data;
    return {
        available: true,
        threadId: meta.threadId,
        capturedAt: meta.capturedAt ?? new Date().toISOString(),
        executiveSummary: truncateWords(a.executive_summary!, 400),
        keyFindings: trimList(a.key_findings, 5),
        implications: a.implications?.trim() || undefined,
        watchlist: trimList(a.recommended_watchlist, 5),
        evidenceGaps: trimList(a.evidence_gaps, 3),
        contradictions: trimList(a.contradictions, 3),
        citationCount: meta.citationCount ?? 0,
        confidence: a.confidence,
    };
}

export function parseEchonThreadToMarketContext(raw: unknown, threadId: string): EchonMarketContext {
    const parsed = echonThreadSchema.safeParse(raw);
    if (!parsed.success) {
        return emptyEchonMarketContext('echon_thread_parse_failed');
    }

    const thread = parsed.data;
    const messages = thread.messages ?? [];
    const assistantMessages = messages.filter((m) => m.role === 'assistant').reverse();

    let answer: z.infer<typeof echonResearchAnswerSchema> | null = null;
    let citationCount = 0;
    for (const msg of assistantMessages) {
        const structured = msg.structured ?? {};
        const candidate = echonResearchAnswerSchema.safeParse(structured);
        if (candidate.success && candidate.data.executive_summary?.trim()) {
            answer = candidate.data;
            citationCount = Array.isArray(msg.citations) ? msg.citations.length : 0;
            break;
        }
    }

    if (!answer?.executive_summary?.trim()) {
        return emptyEchonMarketContext('echon_no_structured_answer');
    }

    return {
        available: true,
        threadId,
        threadTitle: thread.title ?? null,
        capturedAt: thread.updated_at,
        executiveSummary: truncateWords(answer.executive_summary, 400),
        keyFindings: trimList(answer.key_findings, 5),
        implications: answer.implications?.trim() || undefined,
        watchlist: trimList(answer.recommended_watchlist, 5),
        evidenceGaps: trimList(answer.evidence_gaps, 3),
        contradictions: trimList(answer.contradictions, 3),
        citationCount,
        confidence: answer.confidence,
    };
}

export function slimEchonMarketForAgent(ctx: EchonMarketContext): Record<string, unknown> | null {
    if (!ctx.available) return null;
    const out: Record<string, unknown> = {};
    if (ctx.executiveSummary) out.executiveSummary = ctx.executiveSummary;
    if (ctx.keyFindings?.length) out.keyFindings = ctx.keyFindings;
    if (ctx.implications) out.implications = ctx.implications;
    if (ctx.watchlist?.length) out.watchlist = ctx.watchlist;
    if (ctx.evidenceGaps?.length) out.evidenceGaps = ctx.evidenceGaps;
    if (ctx.contradictions?.length) out.contradictions = ctx.contradictions;
    if (ctx.confidence != null) out.confidence = ctx.confidence;
    return Object.keys(out).length ? out : null;
}
