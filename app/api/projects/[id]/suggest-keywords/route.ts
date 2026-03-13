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

const SYSTEM_PROMPT = `Du bist ein Experte für SEO und Keyword-Recherche. Zu einer Unternehmens-URL oder einem Firmennamen schlägst du 10–15 SEO-Keywords für Rank-Tracking vor. Mix aus Head-, Mid- und Long-Tail-Keywords. Alle Keywords auf Deutsch.
Antworte ausschließlich mit einem einzigen JSON-Objekt. Kein Markdown, kein Text außerhalb des JSON.
Erforderliche Struktur:
{
  "keywords": ["Keyword 1", "Keyword 2", ...]
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
                { role: 'user', content: `Website-URL: ${url}\nDomain: ${domain}\nProjektname: ${project.name}\nSchlage 10–15 SEO-Keywords für Rank-Tracking vor. Antworte nur mit JSON. Alle Keywords auf Deutsch.` },
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
