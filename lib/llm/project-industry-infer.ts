/**
 * Infer a single project `industry` label from domain-wide content themes (Haiku, one call).
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import {
    PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
    PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS,
    getAnthropicKey,
} from '@/lib/llm/config';
import { extractJsonFromResponse } from '@/lib/llm/page-classification';
import { addAnthropicUsage, emptyUsageTotals, type LlmUsageTotals } from '@/lib/llm/usage-totals';
import type { AggregatedPageClassification, PageClassification } from '@/lib/types';
import {
    industryPoolForLlmPrompt,
    isIndustryPoolId,
    type IndustryPoolId,
} from '@/lib/industry-pool';

function buildIndustryPoolSystemPrompt(): string {
    const catalog = industryPoolForLlmPrompt();
    return `You classify a website into exactly ONE industry category from a fixed list (project metadata for filtering).

You receive JSON with "domain", optional "projectName", optional ranked "themes" (content signals from crawled pages), and the allowed categories as JSON objects with "id" and "hint".

Reply with valid JSON only: { "industryId": string | null }

Rules:
- "industryId" MUST be exactly one of the allowed "id" values, OR null if nothing fits better than guessing wildly.
- When "themes" is missing or empty (no page-topic rollup yet), infer the best category using **domain hostname** and **projectName** only (best-effort). Same id rules apply.
- When themes exist, prefer them over the raw hostname; prefer specificity over "other" when a clearer id fits.
- Do not invent new ids. No markdown outside JSON.

Allowed categories:
${JSON.stringify(catalog)}`;
}

const SYSTEM_PROMPT = buildIndustryPoolSystemPrompt();

const ResponseSchema = z.object({
    industryId: z.string().nullable().optional(),
});

export type InferProjectIndustryThemeInput = {
    tag: string;
    score?: number;
    pageCount?: number;
};

export function isAutoProjectIndustryInferDisabled(): boolean {
    const v = process.env.CHECKION_DISABLE_AUTO_PROJECT_INDUSTRY?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

/** Exported for tests */
export function parseIndustryInferResponse(raw: string): IndustryPoolId | null {
    if (!raw?.trim()) return null;
    try {
        const jsonStr = extractJsonFromResponse(raw);
        const parsed = JSON.parse(jsonStr) as unknown;
        const r = ResponseSchema.safeParse(parsed);
        if (!r.success) return null;
        const id = r.data.industryId?.trim();
        if (!id) return null;
        return isIndustryPoolId(id) ? id : null;
    } catch {
        return null;
    }
}

function themesFromPageClassification(
    pc: AggregatedPageClassification | null | undefined,
    maxThemes: number
): InferProjectIndustryThemeInput[] {
    const list = pc?.topThemes ?? [];
    return list.slice(0, maxThemes).map((th) => ({
        tag: th.tag,
        score: th.score,
        pageCount: th.pageCount,
    }));
}

export type InferProjectIndustryOutcome = {
    industry: string | null;
    usage: LlmUsageTotals | null;
};

/**
 * Returns normalized industry or null if disabled, no key, parse failure, or empty string from model.
 * Empty `themes` triggers domain/project-name-only inference (still one Haiku call).
 */
export async function inferProjectIndustryWithLlm(input: {
    domainOrigin: string;
    projectName?: string | null;
    themes: InferProjectIndustryThemeInput[];
}): Promise<InferProjectIndustryOutcome> {
    if (isAutoProjectIndustryInferDisabled()) return { industry: null, usage: null };
    const apiKey = getAnthropicKey();
    if (!apiKey) return { industry: null, usage: null };

    const userPayload =
        input.themes.length > 0
            ? {
                  domain: input.domainOrigin,
                  ...(input.projectName?.trim() ? { projectName: input.projectName.trim() } : {}),
                  themes: input.themes,
              }
            : {
                  domain: input.domainOrigin,
                  ...(input.projectName?.trim() ? { projectName: input.projectName.trim() } : {}),
                  themes: [],
                  note: 'No page-topic rollup in payload yet — use domain and project name only.',
              };

    try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
            model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
            max_tokens: Math.min(512, PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS),
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Classify into one industryId or null. Reply with JSON only: { "industryId": string | null }\n\nInput:\n${JSON.stringify(userPayload)}`,
                },
            ],
        });
        const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        const industry = parseIndustryInferResponse(textBlock?.text ?? '');
        const usage = emptyUsageTotals();
        addAnthropicUsage(usage, response.usage);
        const hasUsage = usage.input_tokens > 0 || usage.output_tokens > 0;
        return {
            industry: industry?.trim() ? industry : null,
            usage: hasUsage ? usage : null,
        };
    } catch (e) {
        console.warn('[CHECKION] project industry infer failed:', e instanceof Error ? e.message : e);
        return { industry: null, usage: null };
    }
}

export function buildThemesForIndustryInfer(
    pc: AggregatedPageClassification | null | undefined,
    maxThemes = 18
): InferProjectIndustryThemeInput[] {
    return themesFromPageClassification(pc, maxThemes);
}

/** Single-page WCAG scan: map `pageClassification.tagTiers` into theme inputs for industry infer. */
export function buildThemesForIndustryInferFromPageClassification(
    pc: PageClassification | null | undefined,
    maxThemes = 18
): InferProjectIndustryThemeInput[] {
    if (!pc?.tagTiers?.length) return [];
    const sorted = [...pc.tagTiers].sort(
        (a, b) => b.tier - a.tier || a.tag.localeCompare(b.tag)
    );
    return sorted.slice(0, maxThemes).map((t) => ({
        tag: t.tag,
        score: t.tier * t.tier,
        pageCount: 1,
    }));
}
