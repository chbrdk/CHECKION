/**
 * LLM config: model and API keys.
 * OPENAI_API_KEY is required for GEO/EEAT; ANTHROPIC_API_KEY optional for Claude benchmark.
 *
 * GEO competitive benchmark model lists (stand 03.06.2026):
 * - OpenAI: gpt-5.4-nano, gpt-5.4-mini, gpt-5.5
 * - Claude: claude-opus-4-8, claude-sonnet-4-6, claude-haiku-4-5-20251001
 * - Gemini: gemini-3.5-flash, gemini-3.1-flash-lite, gemini-3.1-pro-preview
 *   (gemini-2.0-* retired 01.06.2026 — do not use)
 */

/** Default for GEO on-page stages and single-model competitive runs. */
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.4-nano';

/** OpenAI models for competitive benchmark (nano / mini / frontier per query). */
export const COMPETITIVE_BENCHMARK_MODELS = ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.5'] as const;

/** Claude models for competitive benchmark (stand 03.06.2026: Opus 4.8, Sonnet 4.6, Haiku 4.5). */
export const COMPETITIVE_BENCHMARK_MODELS_CLAUDE = [
    'claude-opus-4-8',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
] as const;

/** Page tier classification: Claude Haiku 4.5 with low max_tokens. */
export const PAGE_CLASSIFY_CLAUDE_MODEL =
    process.env.PAGE_CLASSIFY_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';
export const PAGE_CLASSIFY_MAX_TOKENS = Math.min(
    4096,
    Math.max(256, parseInt(process.env.PAGE_CLASSIFY_MAX_TOKENS ?? '1024', 10) || 1024)
);

/** One Haiku call per deep scan: filter/reorder domain `topThemes` after deterministic rollup. */
export const PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL =
    process.env.PAGE_TOPIC_ROLLUP_REFINE_CLAUDE_MODEL ?? 'claude-haiku-4-5-20251001';

export const PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS = Math.min(
    4096,
    Math.max(256, parseInt(process.env.PAGE_TOPIC_ROLLUP_REFINE_MAX_TOKENS ?? '2048', 10) || 2048)
);

/** Gemini models for competitive benchmark (stand 03.06.2026). */
export const COMPETITIVE_BENCHMARK_MODELS_GEMINI = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
] as const;

export function getOpenAIKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key?.trim()) {
        throw new Error('OPENAI_API_KEY is not set');
    }
    return key.trim();
}

/** Returns Anthropic API key or null if not set (Claude benchmark is then skipped). */
export function getAnthropicKey(): string | null {
    const key = process.env.ANTHROPIC_API_KEY;
    return key?.trim() ?? null;
}

/** Returns Google Gemini API key or null if not set (Gemini benchmark is then skipped). */
export function getGeminiKey(): string | null {
    const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    return key?.trim() ?? null;
}
