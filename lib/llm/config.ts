/**
 * LLM config: model and API keys.
 * OPENAI_API_KEY is required for GEO/EEAT; ANTHROPIC_API_KEY optional for Claude benchmark.
 */

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-nano';

/** OpenAI models for competitive benchmark (each query run with each model). */
export const COMPETITIVE_BENCHMARK_MODELS = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'] as const;

/** Claude models for competitive benchmark (stand 1.3.2026: latest Opus, Sonnet, Haiku). */
export const COMPETITIVE_BENCHMARK_MODELS_CLAUDE = [
    'claude-opus-4-6',
    'claude-sonnet-4-6',
    'claude-haiku-4-5-20251001',
] as const;

/** Gemini models for competitive benchmark (stand 01.03.2026: 2.5/3.x family). */
export const COMPETITIVE_BENCHMARK_MODELS_GEMINI = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-3-flash-preview',
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
