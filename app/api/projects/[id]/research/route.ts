/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/projects/[id]/research                        */
/*  Project research agent: target groups, SEO/GEO keywords, competitors. */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { getProject } from '@/lib/db/projects';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { extractHostname } from '@/lib/geo-eeat/suggest-parse';
import { projectResearchResultSchema, type ProjectResearchResult } from '@/lib/research/schema';

const RESEARCH_MODEL = process.env.OPENAI_SUGGEST_MODEL ?? 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an expert in market research, SEO, and positioning. Given a company website URL or company name, you produce a structured research result to help define target groups, SEO keywords, GEO/E-E-A-T search queries, and competitors.

Output only the requested JSON structure. Use the same language as the domain if obvious (e.g. .de = German), otherwise use English.

- targetGroups: 5–10 clear, distinct target audience descriptions (e.g. "B2B decision-makers in manufacturing", "SMBs looking for cloud solutions").
- valueProposition: 1–2 sentences summarizing the main value proposition or USPs of this company (optional).
- seoKeywords: 10–15 SEO keywords suitable for rank tracking (mix of head, mid-tail, long-tail).
- geoQueries: 8–12 typical search queries users might ask in ChatGPT/Perplexity when looking for this type of company or service.
- competitors: 5–8 direct competitor domains (e.g. competitor.com).`;

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
    try {
        const text = await request.text();
        const body = text?.trim() ? (JSON.parse(text) as { url?: string }) : {};
        url = typeof body?.url === 'string' ? body.url.trim() : '';
    } catch {
        /* ignore */
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
        return apiError('OPENAI_API_KEY is not set. Cannot run research.', API_STATUS.UNAVAILABLE);
    }

    const domain = extractHostname(url);
    const existingCompetitors = Array.isArray(project.competitors) ? project.competitors : [];
    const existingGeoQueries = Array.isArray(project.geoQueries) ? project.geoQueries : [];

    try {
        const completion = await openai.chat.completions.parse({
            model: RESEARCH_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Website URL: ${url}\nDomain: ${domain}\nProject name: ${project.name}\n${
                        existingCompetitors.length > 0 ? `Existing competitors (can overlap): ${existingCompetitors.join(', ')}.\n` : ''
                    }${
                        existingGeoQueries.length > 0 ? `Existing GEO queries (can overlap): ${existingGeoQueries.slice(0, 5).join('; ')}.\n` : ''
                    }Produce the structured research result (target groups, value proposition, SEO keywords, GEO queries, competitors) in the required JSON format.`,
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

        return NextResponse.json(validated.data);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Research failed';
        console.error('[CHECKION] project research:', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }
}
