/**
 * Page classification: LLM-based themes/tags weighted by tier (1–5) from page content.
 * Each tag gets a tier; at least 5 tags per tier (25+ total).
 */

import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import type { ScanResult, PageClassification, TagTier } from '@/lib/types';
import {
    PAGE_CLASSIFY_CLAUDE_MODEL,
    PAGE_CLASSIFY_MAX_TOKENS,
    getAnthropicKey,
} from '@/lib/llm/config';

const BODY_EXCERPT_MAX = 2000;

export function buildClassificationPayload(result: ScanResult): Record<string, unknown> {
    const body = (result.bodyTextExcerpt ?? '').slice(0, BODY_EXCERPT_MAX);
    return {
        url: result.url,
        title: result.seo?.title ?? undefined,
        h1: result.seo?.h1 ?? undefined,
        metaDescription: result.seo?.metaDescription?.slice(0, 200) ?? undefined,
        bodyExcerpt: body || undefined,
    };
}

export const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert at classifying web page content.

Your task: Identify **all topics and aspects** of the page from its **page content only** (not URL or site structure) and assign each topic a **tier (1–5)** indicating how central or intensively that topic is treated on the page.

**Tier meaning:**
- 5: Core topic of the page, very central and intensively covered.
- 4: Important topic, clearly present.
- 3: Topic appears with medium relevance.
- 2: Only mentioned in passing or hinted at.
- 1: Little substance (e.g. navigation, footer, boilerplate).

**Output (valid JSON only, no text before or after):**
- tagTiers: Array of objects { "tag": string, "tier": 1|2|3|4|5 }. **At least 5 entries per tier** (1, 2, 3, 4, 5), so at least 25 topics/tags in total. Each "tag" is an English keyword/topic (e.g. "Pumps", "Technical specs", "Contact", "Imprint").
- shortSummary (optional): One sentence in English: "What is this page mainly about?"

Important: Assign each topic only once. Use different aspects (product name, category, benefits, audience, etc.) per tier to reach at least 5 per tier.`;

export function buildClassificationUserPrompt(payload: Record<string, unknown>): string {
    return `Classify this web page: put all topics/tags into tagTiers, at least 5 per tier (1–5). Reply with JSON only: { "tagTiers": [ { "tag": string, "tier": 1|2|3|4|5 }, ... ], "shortSummary"?: string }

Page data:
${JSON.stringify(payload, null, 0)}`;
}

const TagTierSchema = z.object({
    tag: z.string(),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

const PageClassificationSchema = z.object({
    tagTiers: z.array(TagTierSchema).default([]),
    shortSummary: z.string().optional(),
});

/** Legacy format (single tier + flat tags) for backward compatibility when reading from DB. */
const LegacyPageClassificationSchema = z.object({
    tags: z.array(z.string()).default([]),
    tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).default(3),
    shortSummary: z.string().optional(),
});

export function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    return trimmed;
}

const DEFAULT_FALLBACK: PageClassification = { tagTiers: [] };

const MIN_BODY_LENGTH = 50;

/**
 * Run LLM classification for a single scan result (Claude Haiku 4.5, low max_tokens).
 * Used by scanner and by POST /api/scan/…/classify.
 * Returns null if bodyTextExcerpt too short, ANTHROPIC_API_KEY not set, or on error (never throws).
 */
export async function classifyPageWithLlm(result: ScanResult): Promise<PageClassification | null> {
    const excerpt = (result.bodyTextExcerpt ?? '').trim();
    if (excerpt.length < MIN_BODY_LENGTH) return null;
    const apiKey = getAnthropicKey();
    if (!apiKey) return null;
    try {
        const client = new Anthropic({ apiKey });
        const payload = buildClassificationPayload(result);
        const userPrompt = buildClassificationUserPrompt(payload);
        const response = await client.messages.create({
            model: PAGE_CLASSIFY_CLAUDE_MODEL,
            max_tokens: PAGE_CLASSIFY_MAX_TOKENS,
            system: CLASSIFICATION_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
        });
        const textBlock = response.content.find(
            (b): b is Anthropic.TextBlock => b.type === 'text'
        );
        const rawContent = textBlock?.text ?? '';
        return parseClassificationResponse(rawContent);
    } catch {
        return null;
    }
}

/**
 * Parse LLM response into PageClassification. Supports new (tagTiers) and legacy (tags + tier) format.
 */
export function parseClassificationResponse(rawContent: string): PageClassification {
    if (!rawContent?.trim()) return DEFAULT_FALLBACK;
    try {
        const jsonStr = extractJsonFromResponse(rawContent);
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

        const hasLegacy = Array.isArray(parsed.tags) && typeof parsed.tier === 'number';
        const hasNew = Array.isArray(parsed.tagTiers);

        if (hasLegacy && !hasNew) {
            const legacy = LegacyPageClassificationSchema.safeParse(parsed);
            if (legacy.success) {
                const L = legacy.data;
                const tier = (typeof L.tier === 'number' && L.tier >= 1 && L.tier <= 5) ? (L.tier as 1 | 2 | 3 | 4 | 5) : 3;
                const tagTiers: TagTier[] = (Array.isArray(L.tags) ? L.tags.filter((t): t is string => typeof t === 'string').slice(0, 20) : [])
                    .map((tag) => ({ tag: tag.trim(), tier }));
                return { tagTiers, shortSummary: typeof L.shortSummary === 'string' ? L.shortSummary : undefined };
            }
        }

        if (hasNew) {
            const result = PageClassificationSchema.safeParse(parsed);
            if (result.success) {
                const d = result.data;
                const tagTiers: TagTier[] = (d.tagTiers ?? [])
                    .map((x) => ({ tag: String(x.tag).trim(), tier: x.tier }))
                    .filter((x) => x.tag.length > 0);
                return {
                    tagTiers,
                    shortSummary: typeof d.shortSummary === 'string' ? d.shortSummary : undefined,
                };
            }
        }
    } catch {
        // ignore
    }
    return DEFAULT_FALLBACK;
}
