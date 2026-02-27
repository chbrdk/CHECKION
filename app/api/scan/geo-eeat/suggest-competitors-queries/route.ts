/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat/suggest-competitors-queries    */
/*  AI suggests ~5 competitors and ~10 typical LLM search queries.   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import OpenAI from 'openai';
import { getOpenAIKey } from '@/lib/llm/config';

const SUGGEST_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-5-nano';
import { extractHostname, parseSuggestResponse } from '@/lib/geo-eeat/suggest-parse';

const SYSTEM_PROMPT = `You are an expert in market research and SEO. Given a company website URL, you suggest:
1. Exactly 5 direct competitors (companies in the same industry/market). Return as domain names (e.g. competitor.com) or company names, one per item.
2. Exactly 10 typical search queries that users might ask in ChatGPT, Perplexity, or other LLMs when looking for this type of company, product, or service. Queries should be in the same language as the URL if obvious (e.g. .de = German), otherwise use English. Mix of: "best [product] in [region]", "top [industry] companies", "[service] provider recommendation", etc.

Reply ONLY with a single JSON object. No markdown, no text outside JSON.
Required structure:
{
  "competitors": ["domain1.com", "domain2.com", ...],
  "queries": ["query 1", "query 2", ...]
}`;

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    let body: { url?: string };
    try {
        const text = await request.text();
        if (!text?.trim()) {
            return apiError('Request body is empty.', API_STATUS.BAD_REQUEST);
        }
        body = JSON.parse(text) as { url?: string };
    } catch {
        return apiError('Invalid JSON body.', API_STATUS.BAD_REQUEST);
    }

    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url) {
        return apiError('URL is required.', API_STATUS.BAD_REQUEST);
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
        return apiError('OPENAI_API_KEY is not set. Cannot suggest competitors or queries.', API_STATUS.UNAVAILABLE);
    }

    const domain = extractHostname(url);

    try {
        const completion = await openai.chat.completions.create({
            model: SUGGEST_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Website URL: ${url}\nDomain: ${domain}\nSuggest 5 competitors and 10 typical LLM search queries for this company. Reply with JSON only.` },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        if (!raw?.trim()) {
            console.warn('[CHECKION] suggest-competitors-queries: LLM returned empty content');
        }
        let competitors: string[];
        let queries: string[];
        try {
            const result = parseSuggestResponse(raw);
            competitors = result.competitors;
            queries = result.queries;
        } catch (e) {
            console.warn('[CHECKION] suggest-competitors-queries: parse failed', e);
            competitors = [];
            queries = [];
        }
        return NextResponse.json({ competitors, queries });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Suggestion failed';
        console.error('[CHECKION] suggest-competitors-queries:', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
}
