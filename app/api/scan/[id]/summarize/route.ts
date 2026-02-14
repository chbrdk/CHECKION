/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/[id]/summarize (LLM UX/CX summary)     */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/auth';
import { getScan, updateScanSummary } from '@/lib/db/scans';
import { buildSummaryPayload } from '@/lib/llm/build-summary-payload';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/llm/prompts';
import { UxCxSummarySchema, type UxCxSummary } from '@/lib/llm-summary-types';

function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    return trimmed;
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await getScan(id, session.user.id);
    if (!result) {
        return NextResponse.json({ error: 'Scan result not found.' }, { status: 404 });
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch (e) {
        console.error('[CHECKION] summarize: OPENAI_API_KEY missing', e);
        return NextResponse.json(
            { error: 'OpenAI API key not configured.' },
            { status: 500 },
        );
    }

    const payload = buildSummaryPayload(result);
    const payloadJson = JSON.stringify(payload, null, 0);
    const userPrompt = buildUserPrompt(payloadJson);

    let rawContent: string;
    let modelUsed = OPENAI_MODEL;

    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        });
        rawContent = completion.choices[0]?.message?.content ?? '';
        if (completion.model) modelUsed = completion.model;
    } catch (e) {
        console.error('[CHECKION] summarize: OpenAI API error', e);
        return NextResponse.json(
            { error: 'LLM request failed. Check logs.' },
            { status: 500 },
        );
    }

    if (!rawContent?.trim()) {
        return NextResponse.json(
            { error: 'Empty response from LLM.' },
            { status: 500 },
        );
    }

    let parsed: unknown;
    try {
        const jsonStr = extractJsonFromResponse(rawContent);
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        console.error('[CHECKION] summarize: JSON parse error', e);
        return NextResponse.json(
            { error: 'Invalid JSON in LLM response.' },
            { status: 500 },
        );
    }

    const parsedResult = UxCxSummarySchema.safeParse(parsed);
    if (!parsedResult.success) {
        console.error('[CHECKION] summarize: validation failed', parsedResult.error.flatten());
        return NextResponse.json(
            { error: 'LLM response did not match expected schema.' },
            { status: 500 },
        );
    }

    const summary: UxCxSummary = {
        ...parsedResult.data,
        modelUsed,
        generatedAt: new Date().toISOString(),
    };

    const updated = await updateScanSummary(id, session.user.id, summary);
    if (!updated) {
        return NextResponse.json(
            { error: 'Failed to save summary.' },
            { status: 500 },
        );
    }

    return NextResponse.json(summary);
}
