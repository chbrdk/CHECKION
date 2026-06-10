/**
 * Extract ECHON assistant answer from persisted message shapes.
 * Supports: agent stream (stage=final), sync chat (structured.answer), flat legacy.
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

export type EchonParsedResearchAnswer = z.infer<typeof echonResearchAnswerSchema>;

function isRecord(v: unknown): v is Record<string, unknown> {
    return !!v && typeof v === 'object' && !Array.isArray(v);
}

function parseAnswerRecord(raw: unknown): EchonParsedResearchAnswer | null {
    const parsed = echonResearchAnswerSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.executive_summary?.trim()) {
        return null;
    }
    return parsed.data;
}

/** Normalize ECHON `structured` JSON to answer fields (agent + sync REST). */
export function extractEchonAnswerFromStructured(structured: unknown): EchonParsedResearchAnswer | null {
    if (!isRecord(structured)) {
        return null;
    }

    const direct = parseAnswerRecord(structured);
    if (direct) {
        return direct;
    }

    if (isRecord(structured.answer)) {
        const fromSync = parseAnswerRecord(structured.answer);
        if (fromSync) {
            return fromSync;
        }
    }

    if (structured.stage === 'final' && isRecord(structured.payload) && isRecord(structured.payload.answer)) {
        const fromAgent = parseAnswerRecord(structured.payload.answer);
        if (fromAgent) {
            return fromAgent;
        }
    }

    return null;
}

export function extractEchonAnswerFromAssistantMessage(message: {
    content?: string;
    structured?: unknown;
}): EchonParsedResearchAnswer | null {
    const fromStructured = extractEchonAnswerFromStructured(message.structured);
    if (fromStructured) {
        return fromStructured;
    }

    const content = (message.content ?? '').trim();
    if (!content) {
        return null;
    }

    return { executive_summary: content };
}

export { echonResearchAnswerSchema };
