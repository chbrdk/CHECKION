/**
 * Optional Haiku pass after deterministic `aggregatePageClassification`:
 * filter/reorder `topThemes` for domain-level SEO/content overview.
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { normalizePageTopicTagKey } from '@/lib/domain-aggregation';
import { DOMAIN_THEME_ROLLUP_REFINE_LLM_CANDIDATES_CAP } from '@/lib/constants';
import {
    PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
    PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS,
    getAnthropicKey,
} from '@/lib/llm/config';
import { extractJsonFromResponse } from '@/lib/llm/page-classification';
import { addAnthropicUsage, emptyUsageTotals } from '@/lib/llm/usage-totals';
import { reportUsage } from '@/lib/usage-report';
import type {
    AggregatedPageClassification,
    AggregatedPageClassificationTheme,
} from '@/lib/types';

const REFINE_SYSTEM_PROMPT = `You curate a domain-level list of content themes for SEO and editorial overview.

You receive the site's origin and a JSON array of candidate themes. Each theme has a stable key (themeTagKey), display tag, rollup score, pageCount, maxTier, and optional sample URLs.

Your task:
- Remove themes that are noise for a domain content overview: generic boilerplate, pure navigation/footer semantics, obvious errors/technical junk, or meta labels that do not describe what the business publishes (unless they truly define the site).
- Keep themes that represent real topics, products, services, or substantive editorial pillars for this domain.
- Order kept themes by importance for the domain (most important first).
- Output ONLY keys that appear in the input. Do not invent new keys or rename tags.

Reply with valid JSON only: { "keptThemeTagKeys": string[] }`;

function isRollupRefineDisabled(): boolean {
    const v = process.env.CHECKION_DISABLE_PAGE_TOPIC_ROLLUP_REFINE?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}

const RefineResponseSchema = z.object({
    keptThemeTagKeys: z.array(z.string()),
});

export type ThemeRollupRefineCandidate = {
    themeTagKey: string;
    tag: string;
    score: number;
    pageCount: number;
    maxTier: number;
    sampleUrls?: string[];
};

/** Exported for tests: reorder/filter full theme rows using LLM key order; unknown keys skipped. */
export function applyKeptThemeTagKeysToTopThemes(
    themes: readonly AggregatedPageClassificationTheme[],
    keptKeysInOrder: readonly string[],
): AggregatedPageClassificationTheme[] {
    const byKey = new Map<string, AggregatedPageClassificationTheme>();
    for (const th of themes) {
        const k = (th.themeTagKey ?? normalizePageTopicTagKey(th.tag)).trim();
        if (k && !byKey.has(k)) byKey.set(k, th);
    }
    const seen = new Set<string>();
    const out: AggregatedPageClassificationTheme[] = [];
    for (const raw of keptKeysInOrder) {
        const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!key || seen.has(key)) continue;
        const row = byKey.get(key);
        if (row) {
            seen.add(key);
            out.push(row);
        }
    }
    return out;
}

function buildCandidates(pc: AggregatedPageClassification): ThemeRollupRefineCandidate[] {
    const themes = pc.topThemes ?? [];
    const slice = themes.slice(0, DOMAIN_THEME_ROLLUP_REFINE_LLM_CANDIDATES_CAP);
    return slice.map((th) => {
        const themeTagKey = (th.themeTagKey ?? normalizePageTopicTagKey(th.tag)).trim();
        const sampleUrls = (th.relatedPages ?? [])
            .slice(0, 3)
            .map((p) => p.url)
            .filter(Boolean);
        return {
            themeTagKey,
            tag: th.tag,
            score: th.score,
            pageCount: th.pageCount,
            maxTier: th.maxTier,
            ...(sampleUrls.length > 0 ? { sampleUrls } : {}),
        };
    });
}

function parseRefineResponse(raw: string): string[] | null {
    if (!raw?.trim()) return null;
    try {
        const jsonStr = extractJsonFromResponse(raw);
        const parsed = JSON.parse(jsonStr) as unknown;
        const r = RefineResponseSchema.safeParse(parsed);
        if (!r.success) return null;
        return r.data.keptThemeTagKeys.map((s) => String(s).trim()).filter(Boolean);
    } catch {
        return null;
    }
}

export type RefineAggregatedPageClassificationContext = {
    domainOrigin: string;
    userId: string;
    domainScanId: string;
};

/**
 * Calls Claude once to filter/reorder `topThemes`. On missing key, disabled env, parse failure,
 * or empty effective result returns `pc` unchanged (no `themeRollup`).
 */
export async function refineAggregatedPageClassificationWithLlm(
    pc: AggregatedPageClassification,
    context: RefineAggregatedPageClassificationContext,
): Promise<AggregatedPageClassification> {
    if (isRollupRefineDisabled()) return pc;
    const apiKey = getAnthropicKey();
    if (!apiKey) return pc;
    const themes = pc.topThemes ?? [];
    if (themes.length === 0) return pc;

    const candidates = buildCandidates(pc);
    if (candidates.length === 0) return pc;

    const validKeySet = new Set(candidates.map((c) => c.themeTagKey));

    try {
        const client = new Anthropic({ apiKey });
        const userPayload = {
            domainOrigin: context.domainOrigin,
            themes: candidates,
        };
        const userPrompt = `Curate themes for this domain. Reply with JSON only: { "keptThemeTagKeys": string[] }\n\nInput:\n${JSON.stringify(userPayload)}`;

        const response = await client.messages.create({
            model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
            max_tokens: PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS,
            system: REFINE_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
        const rawContent = textBlock?.text ?? '';
        const parsedKeys = parseRefineResponse(rawContent);

        const usage = emptyUsageTotals();
        addAnthropicUsage(usage, response.usage);
        const hasUsage = usage.input_tokens > 0 || usage.output_tokens > 0;
        if (hasUsage) {
            reportUsage({
                userId: context.userId,
                eventType: 'domain_theme_rollup_refine',
                rawUnits: {
                    input_tokens: usage.input_tokens,
                    output_tokens: usage.output_tokens,
                    domain_scan_id: context.domainScanId,
                    model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
                },
                idempotencyKey: `domain_theme_rollup_refine:${context.domainScanId}`,
            });
        }

        if (!parsedKeys?.length) return pc;

        const normalizedFromLlm = parsedKeys.map((k) => normalizePageTopicTagKey(k)).filter(Boolean);
        const sanitized = normalizedFromLlm.filter((k) => validKeySet.has(k));
        if (sanitized.length === 0) return pc;

        const refinedThemes = applyKeptThemeTagKeysToTopThemes(themes, sanitized);
        if (refinedThemes.length === 0) return pc;

        return {
            ...pc,
            topThemes: refinedThemes,
            themeRollup: {
                refinedWithLlm: true,
                model: PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL,
                refinedAt: new Date().toISOString(),
            },
        };
    } catch (e) {
        console.warn('[CHECKION] domain theme rollup refine failed:', e instanceof Error ? e.message : e);
        return pc;
    }
}
