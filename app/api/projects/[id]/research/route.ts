/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/projects/[id]/research                        */
/*  Project research agent: target groups, SEO/GEO keywords, competitors. */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, projectResearchBodySchema } from '@/lib/api-schemas';
import { getProject } from '@/lib/db/projects';
import { flattenGeoQueries } from '@/lib/geo-queries-by-market';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { extractHostname } from '@/lib/geo-eeat/suggest-parse';
import { projectResearchResultSchema, type ProjectResearchResult } from '@/lib/research/schema';
import { marketKey, parseMarketKey, SERP_MAIN_MARKETS, SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE } from '@/lib/serp-markets';

const RESEARCH_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-4o-mini';

function resolveMarketKeys(requested?: string[]): string[] {
    const keys: string[] = [];
    for (const k of requested ?? []) {
        if (parseMarketKey(k)) keys.push(k.toLowerCase());
    }
    if (keys.length > 0) return [...new Set(keys)];
    return [marketKey(SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE)];
}

function marketDescriptions(keys: string[]): string {
    return keys
        .map((k) => {
            const p = parseMarketKey(k);
            if (!p) return null;
            const m = SERP_MAIN_MARKETS.find((x) => x.country === p.country && x.language === p.language);
            return m ? `${k}: ${m.label} (gl=${m.country}, hl=${m.language}, language for queries: ${m.language})` : null;
        })
        .filter(Boolean)
        .join('\n');
}

function buildSystemPrompt(marketKeys: string[]): string {
    const multi = marketKeys.length > 1;
    return `Du bist ein Experte für Marktforschung, SEO und Positionierung. Zu einer Unternehmens-URL erstellst du ein strukturiertes Research-Ergebnis.

Antworte ausschließlich mit der geforderten JSON-Struktur.
- targetGroups, valueProposition, competitors: auf Deutsch (Marktübergreifend).
${
    multi
        ? `- seoKeywordsByMarket und geoQueriesByMarket: für JEDEN marketKey natürliche Suchbegriffe in der jeweiligen Marktsprache (hl), keine wörtliche 1:1-Übersetzung wenn Nutzer andere Formulierungen verwenden.
- seoKeywords und geoQueries: Kopie des ersten marketKey in der Liste (Abwärtskompatibilität).
- marketKeys: exakt die angeforderten Keys zurückgeben.`
        : `- seoKeywords und geoQueries: auf Deutsch.
- seoKeywordsByMarket, geoQueriesByMarket, marketKeys: null setzen (nicht verwendet).`
}

- targetGroups: 5–10 Zielgruppen
- seoKeywords: 10–15 Rank-Tracking-Keywords
- geoQueries: 8–12 GEO/LLM-Suchanfragen
- competitors: 5–8 Wettbewerber-Domains

Zielmärkte:
${marketDescriptions(marketKeys)}`;
}

function normalizeResearchResult(data: ProjectResearchResult, marketKeys: string[]): ProjectResearchResult {
    const keys = data.marketKeys?.length ? data.marketKeys : marketKeys;
    const primary = keys[0] ?? marketKey(SERP_DEFAULT_COUNTRY, SERP_DEFAULT_LANGUAGE);
    const seoBy = data.seoKeywordsByMarket ?? {};
    const geoBy = data.geoQueriesByMarket ?? {};
    return {
        ...data,
        marketKeys: keys,
        seoKeywords: seoBy[primary]?.length ? seoBy[primary] : data.seoKeywords,
        geoQueries: geoBy[primary]?.length ? geoBy[primary] : data.geoQueries,
        seoKeywordsByMarket: Object.keys(seoBy).length ? seoBy : null,
        geoQueriesByMarket: Object.keys(geoBy).length ? geoBy : null,
    };
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);

    const { id: projectId } = await context.params;
    if (!projectId) return apiError('Project ID required', API_STATUS.BAD_REQUEST);

    const project = await getProject(projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    const parsedBody = await parseApiBody(request, projectResearchBodySchema);
    if (parsedBody instanceof NextResponse) return parsedBody;

    let url = parsedBody.url?.trim() ?? '';
    if (!url && project.domain) {
        url = project.domain.includes('://') ? project.domain : `https://${project.domain}`;
    }
    if (!url) {
        return apiError('Project has no domain. Set project domain or send { "url": "https://..." } in the body.', API_STATUS.BAD_REQUEST);
    }
    try {
        new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
        return apiError('Invalid URL.', API_STATUS.BAD_REQUEST);
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return apiError('OPENAI_API_KEY is not set. Cannot run research.', API_STATUS.UNAVAILABLE);
    }

    const marketKeys = resolveMarketKeys(parsedBody.marketKeys);
    const domain = extractHostname(url);
    const existingCompetitors = Array.isArray(project.competitors) ? project.competitors : [];
    const existingGeoQueries = flattenGeoQueries(project.geoQueriesByMarket ?? project.geoQueries);

    try {
        const completion = await openai.chat.completions.parse({
            model: RESEARCH_MODEL,
            messages: [
                { role: 'system', content: buildSystemPrompt(marketKeys) },
                {
                    role: 'user',
                    content: `Website-URL: ${url}\nDomain: ${domain}\nProjektname: ${project.name}\nmarketKeys: ${marketKeys.join(', ')}\n${
                        existingCompetitors.length > 0 ? `Bereits vorhandene Wettbewerber: ${existingCompetitors.join(', ')}.\n` : ''
                    }${
                        existingGeoQueries.length > 0 ? `Bereits vorhandene GEO-Queries: ${existingGeoQueries.slice(0, 5).join('; ')}.\n` : ''
                    }Erstelle das Research-Ergebnis im JSON-Format.`,
                },
            ],
            response_format: zodResponseFormat(projectResearchResultSchema, 'project_research'),
        });

        const message = completion.choices[0]?.message;
        if (!message) {
            return apiError('No response from model', API_STATUS.INTERNAL_ERROR);
        }

        if ('refusal' in message && message.refusal) {
            return NextResponse.json(
                { error: 'Model refused the request', refusal: message.refusal },
                { status: 422 }
            );
        }

        const parsed = message.parsed as ProjectResearchResult | null | undefined;
        if (!parsed) {
            return apiError('Could not parse research result', API_STATUS.INTERNAL_ERROR);
        }

        const validated = projectResearchResultSchema.safeParse(parsed);
        if (!validated.success) {
            return apiError('Research result did not match schema', API_STATUS.INTERNAL_ERROR);
        }

        try {
            const usage = completion.usage;
            if (usage && user.id) {
                reportUsage({
                    userId: user.id,
                    eventType: 'llm_request',
                    rawUnits: {
                        input_tokens: usage.prompt_tokens,
                        output_tokens: usage.completion_tokens,
                    },
                    idempotencyKey: `research:${projectId}:${Date.now()}`,
                });
            }
        } catch {
            /* never affect response */
        }

        return NextResponse.json(normalizeResearchResult(validated.data, marketKeys));
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Research failed';
        console.error('[CHECKION] project research:', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
}
