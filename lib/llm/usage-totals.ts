/**
 * Accumulate LLM usage from provider responses for PLEXON reporting (same formula as llm_request).
 */

export type LlmUsageTotals = { input_tokens: number; output_tokens: number };

export function emptyUsageTotals(): LlmUsageTotals {
    return { input_tokens: 0, output_tokens: 0 };
}

export function mergeUsageTotals(into: LlmUsageTotals, from: LlmUsageTotals): void {
    into.input_tokens += from.input_tokens;
    into.output_tokens += from.output_tokens;
}

export function addOpenAIChatUsage(totals: LlmUsageTotals, usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined): void {
    if (!usage) return;
    totals.input_tokens += usage.prompt_tokens ?? 0;
    totals.output_tokens += usage.completion_tokens ?? 0;
}

export function addAnthropicUsage(
    totals: LlmUsageTotals,
    usage: { input_tokens?: number; output_tokens?: number } | null | undefined
): void {
    if (!usage) return;
    totals.input_tokens += usage.input_tokens ?? 0;
    totals.output_tokens += usage.output_tokens ?? 0;
}

/** Google GenAI generateContent usage metadata (SDK shape). */
export function addGeminiUsage(
    totals: LlmUsageTotals,
    meta: { promptTokenCount?: number; candidatesTokenCount?: number } | null | undefined
): void {
    if (!meta) return;
    totals.input_tokens += meta.promptTokenCount ?? 0;
    totals.output_tokens += meta.candidatesTokenCount ?? 0;
}
