/**
 * Localize a seed SEO keyword / intent into market-specific query strings (OpenAI).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAIKey } from '@/lib/llm/config';
import { marketKey, parseMarketKey, SERP_MAIN_MARKETS, type SerpMarket } from '@/lib/serp-markets';
import { resolveIntentFields } from '@/lib/serp-intent';

const LOCALIZE_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-4o-mini';

const localizedVariantSchema = z.object({
    marketKey: z.string(),
    keyword: z.string().min(1).max(200),
});

const localizeResponseSchema = z.object({
    intentLabel: z.string().min(1).max(120),
    variants: z.array(localizedVariantSchema).min(1).max(20),
});

export type LocalizedKeywordVariant = z.infer<typeof localizedVariantSchema>;

export interface LocalizeKeywordsInput {
    seedKeyword: string;
    intentLabel?: string;
    marketKeys: string[];
    domain?: string;
    projectName?: string;
}

export interface LocalizeKeywordsResult {
    intentKey: string;
    intentLabel: string;
    variants: LocalizedKeywordVariant[];
}

function marketPromptLine(m: SerpMarket): string {
    return `- ${marketKey(m.country, m.language)}: ${m.label} (Google gl=${m.country}, hl=${m.language})`;
}

export async function localizeKeywordsForMarkets(
    input: LocalizeKeywordsInput
): Promise<LocalizeKeywordsResult> {
    const markets: SerpMarket[] = [];
    for (const k of input.marketKeys) {
        const p = parseMarketKey(k);
        if (!p) continue;
        const m = SERP_MAIN_MARKETS.find(
            (x) => x.country === p.country && x.language === p.language
        );
        if (m) markets.push(m);
    }
    if (markets.length === 0) {
        throw new Error('No valid market keys');
    }

    const { intentKey, intentLabel } = resolveIntentFields(
        input.seedKeyword,
        undefined,
        input.intentLabel ?? input.seedKeyword
    );

    const openai = new OpenAI({ apiKey: getOpenAIKey() });
    const marketList = markets.map(marketPromptLine).join('\n');

    const completion = await openai.chat.completions.parse({
        model: LOCALIZE_MODEL,
        messages: [
            {
                role: 'system',
                content: `You localize SEO rank-tracking keywords for Google search per country/language market.
Return one natural search query per requested marketKey — the query a local user would type in that market's language (hl), not a literal translation if natives use different wording.
marketKey format is "gl-hl" e.g. de-de, us-en, gb-en.`,
            },
            {
                role: 'user',
                content: `Seed keyword/intent: "${input.seedKeyword}"
Intent label: "${intentLabel}"
${input.domain ? `Domain: ${input.domain}` : ''}
${input.projectName ? `Brand/project: ${input.projectName}` : ''}

Markets (return exactly one keyword per marketKey):
${marketList}`,
            },
        ],
        response_format: zodResponseFormat(localizeResponseSchema, 'localized_keywords'),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) throw new Error('Localization failed');

    const allowed = new Set(markets.map((m) => marketKey(m.country, m.language)));
    const variants = parsed.variants.filter((v) => allowed.has(v.marketKey.toLowerCase()));

    if (variants.length === 0) throw new Error('No localized variants returned');

    return {
        intentKey,
        intentLabel: parsed.intentLabel.trim() || intentLabel,
        variants,
    };
}
