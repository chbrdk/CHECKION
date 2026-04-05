/**
 * UX Check agent: calls Claude with DIN EN ISO 9241-110 prompt and scan context,
 * then parses the structured JSON block from the response.
 */

import Anthropic from '@anthropic-ai/sdk';
import { buildSummaryPayload } from '@/lib/llm/build-summary-payload';
import type { ScanResult } from '@/lib/types';
import {
    UxCheckStructuredSchema,
    UxCheckV2SummarySchema,
    type UxCheckV2Summary,
} from '@/lib/ux-check-types';
import { UX_CHECK_SYSTEM_PROMPT } from './ux-check-prompt';

const UX_CHECK_MODEL = process.env.UX_CHECK_CLAUDE_MODEL ?? 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8192;

function buildUserMessage(result: ScanResult, languageHint?: string): string {
    const payload = buildSummaryPayload(result);
    const payloadStr = JSON.stringify(payload, null, 2);
    const intro = languageHint
        ? `Sprache für die Analyse: ${languageHint}. `
        : 'Erkenne die Sprache der Nutzernachricht und antworte in derselben Sprache. ';
    return `${intro}
Analysiere die folgende Einzelseite. Du erhältst die URL und Kontextdaten aus einem bereits durchgeführten Scan (kein Live-Aufruf). Führe eine heuristische UX-Evaluierung gemäß dem vorgegebenen Framework durch.

**URL:** ${result.url}
**Seitentitel (aus Scan):** ${(result.seo?.title ?? '').trim() || '(nicht erfasst)'}

**Scan-Kontext (JSON):**
\`\`\`json
${payloadStr.slice(0, 120000)}
\`\`\`

Führe die vollständige Analyse im vorgegebenen Ausgabeformat durch und schließe mit dem JSON-Block (Schlüssel "structured") ab.`;
}

function extractStructuredJson(content: string): unknown {
    const trimmed = content.trim();
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!match) return null;
    const jsonStr = match[1].trim();
    try {
        return JSON.parse(jsonStr) as unknown;
    } catch {
        return null;
    }
}

export type RunUxCheckAgentResult =
    | { success: true; summary: UxCheckV2Summary; usage: { input_tokens: number; output_tokens: number } | null }
    | { success: false; error: string };

export async function runUxCheckAgent(
    result: ScanResult,
    anthropicApiKey: string,
    options?: { languageHint?: string },
): Promise<RunUxCheckAgentResult> {
    const client = new Anthropic({ apiKey: anthropicApiKey });
    const userMessage = buildUserMessage(result, options?.languageHint);

    let response: Anthropic.Message;
    try {
        response = await client.messages.create({
            model: UX_CHECK_MODEL,
            max_tokens: MAX_TOKENS,
            system: UX_CHECK_SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        });
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Claude API error';
        return { success: false, error: message };
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const rawContent = textBlock?.text ?? '';
    if (!rawContent.trim()) {
        return { success: false, error: 'Empty response from Claude' };
    }

    const parsed = extractStructuredJson(rawContent);
    if (!parsed || typeof parsed !== 'object' || !('structured' in parsed)) {
        return { success: false, error: 'No structured JSON block found in response' };
    }

    const structuredResult = UxCheckStructuredSchema.safeParse((parsed as { structured: unknown }).structured);
    if (!structuredResult.success) {
        return { success: false, error: `Invalid structured data: ${structuredResult.error.message}` };
    }

    const summary: UxCheckV2Summary = {
        version: 'ux-check-v2',
        reportMarkdown: rawContent,
        structured: structuredResult.data,
        modelUsed: response.model ?? UX_CHECK_MODEL,
        generatedAt: new Date().toISOString(),
    };

    const validated = UxCheckV2SummarySchema.safeParse(summary);
    if (!validated.success) {
        return { success: false, error: `Summary validation failed: ${validated.error.message}` };
    }

    const u = response.usage;
    const usage =
        u && (typeof u.input_tokens === 'number' || typeof u.output_tokens === 'number')
            ? {
                  input_tokens: typeof u.input_tokens === 'number' ? u.input_tokens : 0,
                  output_tokens: typeof u.output_tokens === 'number' ? u.output_tokens : 0,
              }
            : null;

    return { success: true, summary: validated.data, usage };
}
