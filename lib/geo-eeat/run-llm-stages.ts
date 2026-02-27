/**
 * Run LLM stages 2–4 for GEO/E-E-A-T: E-E-A-T scores, GEO fitness, recommendations.
 * Uses OpenAI. If OPENAI_API_KEY is not set, returns payload unchanged.
 */

import OpenAI from 'openai';
import type { GeoEeatIntensiveResult, GeoEeatPageResult, EeatLlmScores, GeoEeatRecommendation } from '@/lib/types';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import {
    EEAT_SYSTEM_PROMPT,
    buildEeatUserPrompt,
    GEO_FITNESS_SYSTEM_PROMPT,
    buildGeoFitnessUserPrompt,
    RECOMMENDATIONS_SYSTEM_PROMPT,
    buildRecommendationsUserPrompt,
} from '@/lib/llm/geo-eeat-prompts';

function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    const firstBrace = trimmed.indexOf('{');
    if (firstBrace >= 0) {
        let depth = 0;
        for (let i = firstBrace; i < trimmed.length; i++) {
            if (trimmed[i] === '{') depth++;
            else if (trimmed[i] === '}') {
                depth--;
                if (depth === 0) return trimmed.slice(firstBrace, i + 1);
            }
        }
    }
    return trimmed;
}

function parseEeatResponse(content: string): EeatLlmScores | null {
    try {
        const jsonStr = extractJsonFromResponse(content);
        const o = JSON.parse(jsonStr) as Record<string, { score?: number; reasoning?: string }>;
        if (!o.trust?.score || !o.experience?.score || !o.expertise?.score) return null;
        return {
            trust: { score: Math.max(1, Math.min(5, Number(o.trust.score))), reasoning: o.trust.reasoning ?? '' },
            experience: { score: Math.max(1, Math.min(5, Number(o.experience.score))), reasoning: o.experience.reasoning ?? '' },
            expertise: { score: Math.max(1, Math.min(5, Number(o.expertise.score))), reasoning: o.expertise.reasoning ?? '' },
            authoritativeness: o.authoritativeness ? { score: Math.max(1, Math.min(5, Number(o.authoritativeness.score))), reasoning: o.authoritativeness.reasoning ?? '' } : undefined,
        };
    } catch {
        return null;
    }
}

function parseGeoFitnessResponse(content: string): { score: number; reasoning: string; missingElements: string[] } | null {
    try {
        const jsonStr = extractJsonFromResponse(content);
        const o = JSON.parse(jsonStr) as { score?: number; reasoning?: string; missingElements?: string[] };
        if (typeof o.score !== 'number') return null;
        return {
            score: Math.max(0, Math.min(100, o.score)),
            reasoning: o.reasoning ?? '',
            missingElements: Array.isArray(o.missingElements) ? o.missingElements : [],
        };
    } catch {
        return null;
    }
}

function parseRecommendationsResponse(content: string): GeoEeatRecommendation[] {
    try {
        const jsonStr = extractJsonFromResponse(content);
        const o = JSON.parse(jsonStr) as { recommendations?: Array<{ priority?: number; title?: string; description?: string; affectedUrls?: string[]; dimension?: string }> };
        if (!Array.isArray(o.recommendations)) return [];
        return o.recommendations.slice(0, 5).map((r, i) => ({
            priority: typeof r.priority === 'number' ? r.priority : i + 1,
            title: typeof r.title === 'string' ? r.title : `Recommendation ${i + 1}`,
            description: typeof r.description === 'string' ? r.description : '',
            affectedUrls: Array.isArray(r.affectedUrls) ? r.affectedUrls : undefined,
            dimension: ['trust', 'experience', 'expertise', 'authoritativeness', 'geo'].includes(r.dimension ?? '') ? r.dimension as GeoEeatRecommendation['dimension'] : undefined,
        }));
    } catch {
        return [];
    }
}

export async function runLlmStages(payload: GeoEeatIntensiveResult): Promise<GeoEeatIntensiveResult> {
    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return payload;
    }

    const pages = [...(payload.pages ?? [])];
    const model = OPENAI_MODEL;

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const technical = page.technical;

        try {
            const eeatRes = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: EEAT_SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: buildEeatUserPrompt({
                            url: page.url,
                            title: page.title,
                            bodyTextExcerpt: page.bodyTextExcerpt,
                            hasImpressum: technical?.hasImpressum,
                            hasPrivacy: technical?.hasPrivacy,
                            hasAboutLink: technical?.eeatSignals?.hasAboutLink,
                            hasAuthorBio: technical?.generative?.expertise?.hasAuthorBio,
                        }),
                    },
                ],
            });
            const eeatContent = eeatRes.choices[0]?.message?.content ?? '';
            const eeatScores = eeatContent ? parseEeatResponse(eeatContent) : null;
            if (eeatScores) pages[i] = { ...page, eeatScores };
        } catch (e) {
            console.error('[CHECKION] GEO/E-E-A-T E-E-A-T LLM error:', e);
        }

        try {
            const geoRes = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: GEO_FITNESS_SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: buildGeoFitnessUserPrompt({
                            url: page.url,
                            title: page.title,
                            bodyTextExcerpt: page.bodyTextExcerpt,
                            hasLlmsTxt: technical?.generative?.technical?.hasLlmsTxt,
                            schemaTypes: technical?.generative?.technical?.schemaCoverage,
                            faqCount: technical?.generative?.content?.faqCount,
                            listDensity: technical?.generative?.content?.listDensity,
                            citationDensity: technical?.generative?.content?.citationDensity,
                            hasAuthorBio: technical?.generative?.expertise?.hasAuthorBio,
                        }),
                    },
                ],
            });
            const geoContent = geoRes.choices[0]?.message?.content ?? '';
            const geoParsed = geoContent ? parseGeoFitnessResponse(geoContent) : null;
            if (geoParsed) {
                pages[i] = {
                    ...pages[i],
                    geoFitnessScore: geoParsed.score,
                    geoFitnessReasoning: geoParsed.reasoning,
                    missingGeoElements: geoParsed.missingElements.length > 0 ? geoParsed.missingElements : undefined,
                };
            }
        } catch (e) {
            console.error('[CHECKION] GEO/E-E-A-T GEO fitness LLM error:', e);
        }
    }

    let recommendations = payload.recommendations ?? [];
    if (pages.length > 0) {
        const summary = pages
            .map(
                (p) =>
                    `- ${p.url}: GEO score ${p.technical?.generative?.score ?? 'n/a'}, fitness ${p.geoFitnessScore ?? 'n/a'}, E-E-A-T trust/exp/exp ${p.eeatScores?.trust?.score ?? 'n/a'}/${p.eeatScores?.experience?.score ?? 'n/a'}/${p.eeatScores?.expertise?.score ?? 'n/a'}`
            )
            .join('\n');
        try {
            const recRes = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: RECOMMENDATIONS_SYSTEM_PROMPT },
                    { role: 'user', content: buildRecommendationsUserPrompt(summary) },
                ],
            });
            const recContent = recRes.choices[0]?.message?.content ?? '';
            if (recContent) {
                const parsed = parseRecommendationsResponse(recContent);
                if (parsed.length > 0) recommendations = parsed;
            }
        } catch (e) {
            console.error('[CHECKION] GEO/E-E-A-T recommendations LLM error:', e);
        }
    }

    return {
        ...payload,
        pages,
        recommendations,
    };
}
