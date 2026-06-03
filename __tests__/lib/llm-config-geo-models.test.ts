import { describe, expect, it } from 'vitest';
import {
    COMPETITIVE_BENCHMARK_MODELS,
    COMPETITIVE_BENCHMARK_MODELS_CLAUDE,
    COMPETITIVE_BENCHMARK_MODELS_GEMINI,
    OPENAI_MODEL,
} from '@/lib/llm/config';

describe('GEO LLM model config (2026-06-03)', () => {
    it('uses current OpenAI defaults for on-page GEO', () => {
        expect(OPENAI_MODEL).toBe('gpt-5.4-nano');
    });

    it('lists distinct OpenAI competitive benchmark tiers', () => {
        expect([...COMPETITIVE_BENCHMARK_MODELS]).toEqual([
            'gpt-5.4-nano',
            'gpt-5.4-mini',
            'gpt-5.5',
        ]);
    });

    it('lists current Claude competitive benchmark models', () => {
        expect([...COMPETITIVE_BENCHMARK_MODELS_CLAUDE]).toEqual([
            'claude-opus-4-8',
            'claude-sonnet-4-6',
            'claude-haiku-4-5-20251001',
        ]);
    });

    it('lists current Gemini models without retired 2.0/2.5 flash family', () => {
        const ids = [...COMPETITIVE_BENCHMARK_MODELS_GEMINI];
        expect(ids).toEqual([
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
            'gemini-3.1-pro-preview',
        ]);
        for (const id of ids) {
            expect(id).not.toMatch(/^gemini-2\./);
        }
    });
});
