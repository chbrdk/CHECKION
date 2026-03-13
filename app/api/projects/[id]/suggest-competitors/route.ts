/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/projects/[id]/suggest-competitors             */
/*  AI suggests competitors for the project (uses project domain/name). */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import OpenAI from 'openai';
import { getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { extractHostname, parseSuggestResponse } from '@/lib/geo-eeat/suggest-parse';

const SUGGEST_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-5-nano';

const SYSTEM_PROMPT = `You are an expert in market research and SEO. Given a company website URL or company name, you suggest:
1. Exactly 5 direct competitors (companies in the same industry/market). Return as domain names (e.g. competitor.com) or company names, one per item.
2. Exactly 10 typical search queries that users might ask in ChatGPT, Perplexity, or other LLMs when looking for this type of company, product, or service. Queries should be in the same language as the URL if obvious (e.g. .de = German), otherwise use English. Mix of: "best [product] in [region]", "top [industry] companies", "[service] provider recommendation", etc.

Reply ONLY with a single JSON object. No markdown, no text outside JSON.
Required structure:
{
  "competitors": ["domain1.com", "domain2.com", ...],
  "queries": ["query 1", "query 2", ...]
}`;

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

    let url = '';
    let body: { url?: string };
    try {
        const text = await request.text();
        body = text?.trim() ? (JSON.parse(text) as { url?: string }) : {};
        url = typeof body?.url === 'string' ? body.url.trim() : '';
    } catch {
        body = {};
    }

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
        return apiError('OPENAI_API_KEY is not set. Cannot suggest competitors.', API_STATUS.UNAVAILABLE);
    }

    const domain = extractHostname(url);

    try {
        const completion = await openai.chat.completions.create({
            model: SUGGEST_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Website URL: ${url}\nDomain: ${domain}\nProject name: ${project.name}\nSuggest 5 competitors and 10 typical LLM search queries for this company. Reply with JSON only.` },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        if (!raw?.trim()) {
            console.warn('[CHECKION] suggest-competitors: LLM returned empty content');
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
                    idempotencyKey: `suggest-project:${projectId}:${Date.now()}`,
                });
            }
        } catch { /* never affect response */ }

        let competitors: string[];
        try {
            const result = parseSuggestResponse(raw);
            competitors = result.competitors;
        } catch (e) {
            console.warn('[CHECKION] suggest-competitors: parse failed', e);
            competitors = [];
        }
        return NextResponse.json({ competitors });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Suggestion failed';
        console.error('[CHECKION] suggest-competitors:', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
}
