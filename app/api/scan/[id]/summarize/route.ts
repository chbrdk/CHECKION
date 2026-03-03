/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/[id]/summarize (LLM UX/CX summary)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, internalError, API_STATUS } from '@/lib/api-error-handler';
import { getScan, updateScanSummary } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { buildSummaryPayload } from '@/lib/llm/build-summary-payload';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/llm/prompts';
import { UxCxSummarySchema, type UxCxSummary } from '@/lib/llm-summary-types';
import { reportUsage } from '@/lib/usage-report';

function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    return trimmed;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await getRequestUser(request);
    if (!user) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const { id } = await params;
    const result = await getScan(id, user.id);
    if (!result) {
        return apiError('Scan result not found.', API_STATUS.NOT_FOUND);
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch (e) {
        console.error('[CHECKION] summarize: OPENAI_API_KEY missing', e);
        return internalError('OpenAI API key not configured.');
    }

    const payload = buildSummaryPayload(result);
    const payloadJson = JSON.stringify(payload, null, 0);
    const userPrompt = buildUserPrompt(payloadJson);

    let rawContent: string;
    let modelUsed = OPENAI_MODEL;

    let completion: Awaited<ReturnType<OpenAI['chat']['completions']['create']>>;
    try {
        completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        });
        rawContent = completion.choices[0]?.message?.content ?? '';
        if (completion.model) modelUsed = completion.model;
    } catch (e) {
        const message = e instanceof Error ? e.message : 'LLM request failed';
        console.error('[CHECKION] summarize: OpenAI API error', e);
        return apiError(message, API_STATUS.INTERNAL_ERROR);
    }

    if (!rawContent?.trim()) {
        return apiError('Empty response from LLM.', API_STATUS.INTERNAL_ERROR);
    }

    let parsed: unknown;
    try {
        const jsonStr = extractJsonFromResponse(rawContent);
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        console.error('[CHECKION] summarize: JSON parse error', e);
        return apiError('Invalid JSON in LLM response.', API_STATUS.INTERNAL_ERROR);
    }

    const parsedResult = UxCxSummarySchema.safeParse(parsed);
    if (!parsedResult.success) {
        console.error('[CHECKION] summarize: validation failed', parsedResult.error.flatten());
        return apiError('LLM response did not match expected schema.', API_STATUS.INTERNAL_ERROR);
    }

    const summary: UxCxSummary = {
        ...parsedResult.data,
        modelUsed,
        generatedAt: new Date().toISOString(),
    };

    const updated = await updateScanSummary(id, user.id, summary);
    if (!updated) {
        return apiError('Failed to save summary.', API_STATUS.INTERNAL_ERROR);
    }
    invalidateScan(id);

    try {
      reportUsage({
        userId: user.id,
        eventType: 'llm_request',
        rawUnits: {
          input_tokens: completion.usage?.prompt_tokens ?? 0,
          output_tokens: completion.usage?.completion_tokens ?? 0,
        },
        idempotencyKey: `summarize:${id}`,
      });
    } catch { /* never affect response */ }

    return NextResponse.json(summary);
}
