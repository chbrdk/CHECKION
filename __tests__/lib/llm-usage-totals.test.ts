import { describe, expect, it } from 'vitest';
import {
    addAnthropicUsage,
    addGeminiUsage,
    addOpenAIChatUsage,
    emptyUsageTotals,
    mergeUsageTotals,
} from '@/lib/llm/usage-totals';

describe('llm usage totals', () => {
    it('emptyUsageTotals starts at zero', () => {
        const t = emptyUsageTotals();
        expect(t.input_tokens).toBe(0);
        expect(t.output_tokens).toBe(0);
    });

    it('mergeUsageTotals adds both fields', () => {
        const a = emptyUsageTotals();
        const b = { input_tokens: 10, output_tokens: 3 };
        mergeUsageTotals(a, b);
        expect(a).toEqual({ input_tokens: 10, output_tokens: 3 });
        mergeUsageTotals(a, { input_tokens: 5, output_tokens: 2 });
        expect(a).toEqual({ input_tokens: 15, output_tokens: 5 });
    });

    it('addOpenAIChatUsage reads prompt and completion tokens', () => {
        const t = emptyUsageTotals();
        addOpenAIChatUsage(t, { prompt_tokens: 100, completion_tokens: 40 });
        expect(t).toEqual({ input_tokens: 100, output_tokens: 40 });
    });

    it('addAnthropicUsage reads input and output tokens', () => {
        const t = emptyUsageTotals();
        addAnthropicUsage(t, { input_tokens: 50, output_tokens: 25 });
        expect(t).toEqual({ input_tokens: 50, output_tokens: 25 });
    });

    it('addGeminiUsage reads prompt and candidates token counts', () => {
        const t = emptyUsageTotals();
        addGeminiUsage(t, { promptTokenCount: 30, candidatesTokenCount: 12 });
        expect(t).toEqual({ input_tokens: 30, output_tokens: 12 });
    });
});
