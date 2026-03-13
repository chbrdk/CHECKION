/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat/suggest-competitors-queries    */
/*  AI suggests ~5 competitors and ~10 typical LLM search queries.   */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import OpenAI from 'openai';
import { getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';

const SUGGEST_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-5-nano';
import { extractHostname, parseSuggestResponse } from '@/lib/geo-eeat/suggest-parse';

const SYSTEM_PROMPT = `Du bist ein Experte für Marktforschung und SEO. Zu einer Unternehmens-URL schlägst du vor:
1. Genau 5 direkte Wettbewerber (Unternehmen derselben Branche). Als Domains (z. B. wettbewerber.de) oder Firmennamen, je ein Eintrag.
2. Genau 10 typische Suchanfragen, die Nutzer in ChatGPT, Perplexity oder anderen LLMs stellen könnten, um solche Unternehmen, Produkte oder Leistungen zu finden. Alle Suchanfragen auf Deutsch. Mix aus: "beste [Produkt] in [Region]", "top [Branche] Unternehmen", "[Leistung] Anbieter Empfehlung" usw.

Antworte ausschließlich mit einem einzigen JSON-Objekt. Kein Markdown, kein Text außerhalb des JSON.
Erforderliche Struktur:
{
  "competitors": ["domain1.de", "domain2.de", ...],
  "queries": ["Anfrage 1", "Anfrage 2", ...]
}`;

export async function POST(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) {
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
                { role: 'user', content: `Website-URL: ${url}\nDomain: ${domain}\nSchlage 5 Wettbewerber und 10 typische LLM-Suchanfragen für dieses Unternehmen vor. Antworte nur mit JSON. Alle Texte auf Deutsch.` },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        if (!raw?.trim()) {
            console.warn('[CHECKION] suggest-competitors-queries: LLM returned empty content');
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
                    idempotencyKey: `suggest-queries:${url}:${Date.now()}`,
                });
            }
        } catch { /* never affect response */ }
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
