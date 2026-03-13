/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/projects/[id]/suggest-keywords                */
/*  AI suggests SEO keywords for rank tracking (uses project domain/name). */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import OpenAI from 'openai';
import { getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { extractHostname, parseKeywordsResponse } from '@/lib/geo-eeat/suggest-parse';

const SUGGEST_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an expert in SEO and keyword research. Given a company website URL or company name, suggest 10–15 SEO keywords suitable for rank tracking. Include a mix of head terms, mid-tail, and long-tail keywords. Use the same language as the domain if obvious (e.g. .de = German), otherwise use English. Return ONLY a single JSON object. No markdown, no text outside JSON.
Required structure:
{
  "keywords": ["keyword 1", "keyword 2", ...]
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
        return apiError('OPENAI_API_KEY is not set. Cannot suggest keywords.', API_STATUS.UNAVAILABLE);
    }

    const domain = extractHostname(url);

    try {
        const completion = await openai.chat.completions.create({
            model: SUGGEST_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Website URL: ${url}\nDomain: ${domain}\nProject name: ${project.name}\nSuggest 10–15 SEO keywords for rank tracking. Reply with JSON only.` },
            ],
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        if (!raw?.trim()) {
            console.warn('[CHECKION] suggest-keywords: LLM returned empty content');
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
                    idempotencyKey: `suggest-keywords:${projectId}:${Date.now()}`,
                });
            }
        } catch { /* never affect response */ }

        const keywords = parseKeywordsResponse(raw);
        return NextResponse.json({ keywords });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Suggestion failed';
        console.error('[CHECKION] suggest-keywords:', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
}
