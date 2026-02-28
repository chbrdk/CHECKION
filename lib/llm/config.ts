/**
 * LLM config: model and API key.
 * OPENAI_API_KEY is required; OPENAI_MODEL defaults to gpt-5-nano.
 */

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5-nano';

/** Models used for competitive benchmark multi-model comparison (each query run with each model). */
export const COMPETITIVE_BENCHMARK_MODELS = ['gpt-5-nano', 'gpt-5-mini', 'gpt-5'] as const;

export function getOpenAIKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key?.trim()) {
        throw new Error('OPENAI_API_KEY is not set');
    }
    return key.trim();
}
