/**
 * LLM config: model and API key.
 * OPENAI_API_KEY is required; OPENAI_MODEL defaults to gpt-5.1.
 */

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-5.1';

export function getOpenAIKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key?.trim()) {
        throw new Error('OPENAI_API_KEY is not set');
    }
    return key.trim();
}
