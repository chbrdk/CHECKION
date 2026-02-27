/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat/suggest-competitors-queries    */
/*  AI suggests ~5 competitors and ~10 typical LLM search queries.   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import OpenAI from 'openai';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { url?: string };
    try {
        const text = await request.text();
        if (!text?.trim()) {
            return NextResponse.json({ error: 'Request body is empty.' }, { status: 400 });
        }
        body = JSON.parse(text) as { url?: string };
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url) {
        return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
    }
    try {
        new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
        return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 });
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return NextResponse.json(
            { error: 'OPENAI_API_KEY is not set. Cannot suggest competitors or queries.' },
            { status: 503 }
        );
    }

    const domain = extractHostname(url);

    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Website URL: ${url}\nDomain: ${domain}\nSuggest 5 competitors and 10 typical LLM search queries for this company. Reply with JSON only.` },
            ],
            max_completion_tokens: 800,
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        let competitors: string[];
        let queries: string[];
        try {
            const result = parseSuggestResponse(raw);
            competitors = result.competitors;
            queries = result.queries;
        } catch {
            competitors = [];
            queries = [];
        }
        return NextResponse.json({ competitors, queries });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Suggestion failed';
        console.error('[CHECKION] suggest-competitors-queries:', e);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
