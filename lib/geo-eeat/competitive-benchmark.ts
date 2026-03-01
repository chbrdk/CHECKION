/**
 * Competitive LLM citation benchmark: run queries through LLM, get structured recommendations, compute metrics.
 * Supports OpenAI (Structured Outputs), Anthropic Claude, and Google Gemini. Multi-model runs all provider model lists when keys are set.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import type {
    CompetitiveBenchmarkResult,
    CompetitiveCitationRun,
    CompetitiveCitation,
    CompetitiveMetrics,
} from '@/lib/types';
import {
    OPENAI_MODEL,
    getOpenAIKey,
    getAnthropicKey,
    getGeminiKey,
    COMPETITIVE_BENCHMARK_MODELS,
    COMPETITIVE_BENCHMARK_MODELS_CLAUDE,
    COMPETITIVE_BENCHMARK_MODELS_GEMINI,
} from '@/lib/llm/config';

/** JSON schema for Structured Outputs: citations list for position metrics. */
const CITATIONS_RESPONSE_FORMAT = {
    type: 'json_schema' as const,
    json_schema: {
        name: 'competitive_citations',
        strict: true,
        schema: {
            type: 'object',
            properties: {
                citations: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            domain: { type: 'string', description: 'Normalized domain or company name (lowercase, no protocol)' },
                            position: { type: 'integer', description: '1-based order of mention' },
                        },
                        required: ['domain', 'position'],
                        additionalProperties: false,
                    },
                    description: 'Companies/domains recommended in answer order',
                },
            },
            required: ['citations'],
            additionalProperties: false,
        },
    },
};

function extractHostname(input: string): string {
    const s = input.trim().toLowerCase();
    try {
        const u = new URL(s.startsWith('http') ? s : `https://${s}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? s;
    }
}

function parseStructuredCitations(content: string): CompetitiveCitation[] {
    const raw = content?.trim();
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as { citations?: Array<{ domain?: string; position?: number }> };
        if (!Array.isArray(parsed.citations)) return [];
        return parsed.citations
            .filter((c) => c.domain != null && String(c.domain).trim() !== '')
            .map((c, i) => ({
                domain: extractHostname(String(c.domain)),
                position: typeof c.position === 'number' && c.position >= 1 ? Math.floor(c.position) : i + 1,
            }));
    } catch {
        return [];
    }
}

function extractJsonFromClaudeContent(content: Array<{ type: string; text?: string }>): string {
    for (const block of content) {
        if (block.type === 'text' && typeof block.text === 'string') {
            const raw = block.text.trim();
            const start = raw.indexOf('{');
            if (start >= 0) {
                let depth = 0;
                for (let i = start; i < raw.length; i++) {
                    if (raw[i] === '{') depth++;
                    else if (raw[i] === '}') {
                        depth--;
                        if (depth === 0) return raw.slice(start, i + 1);
                    }
                }
            }
            return raw;
        }
    }
    return '';
}

/** Match citation domain to our tracked domain (e.g. "ksb" or "ksb.com" matches "ksb.com"). */
function citationMatchesDomain(citationDomain: string, ourDomain: string): boolean {
    const c = citationDomain.toLowerCase().trim();
    const d = ourDomain.toLowerCase().trim();
    if (c === d) return true;
    if (d.endsWith('.' + c)) return true;
    if (c.endsWith('.' + d)) return true;
    const dBase = d.split('.')[0];
    if (dBase && c === dBase) return true;
    if (dBase && c.startsWith(dBase + '.')) return true;
    return false;
}

export async function runCompetitiveBenchmark(
    targetUrl: string,
    competitors: string[],
    queries: string[],
    modelOverride?: string
): Promise<CompetitiveBenchmarkResult | null> {
    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return null;
    }

    const model = modelOverride ?? OPENAI_MODEL;
    const targetDomain = extractHostname(targetUrl);
    const allDomains = [targetDomain, ...competitors.map(extractHostname)].filter(Boolean);
    const runs: CompetitiveCitationRun[] = [];

    const systemPrompt =
        'You are a helpful search assistant. For the user\'s query, respond with a JSON object containing a single key "citations": an array of companies or domains you would recommend, in order of relevance. Each item must have "domain" (lowercase, no protocol, e.g. example.com or company name) and "position" (1-based index). When a company matches one of these known domains, use that domain: ' +
        (allDomains.length > 0 ? allDomains.join(', ') : 'none') +
        '. If no relevant companies or domains, return {"citations":[]}.';

    const runPromises = queries.map(async (query, q) => {
        try {
            const res = await openai.chat.completions.create({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: query },
                ],
                response_format: CITATIONS_RESPONSE_FORMAT,
            });
            const rawContent = res.choices[0]?.message?.content ?? '';
            const citations = parseStructuredCitations(rawContent);
            return {
                queryId: `q-${q}`,
                query,
                provider: 'openai' as const,
                citations,
                rawAnswerExcerpt: rawContent.slice(0, 500),
            };
        } catch (e) {
            console.error('[CHECKION] Competitive benchmark query error:', e);
            return {
                queryId: `q-${q}`,
                query,
                provider: 'openai' as const,
                citations: [],
            };
        }
    });
    const runResults = await Promise.all(runPromises);
    runs.push(...runResults);

    const queryCount = runs.length;
    const metrics: CompetitiveMetrics[] = allDomains.map((domain) => {
        let mentionCount = 0;
        let positionSum = 0;
        let queryMentions = 0;
        for (const run of runs) {
            const match = run.citations.find((c) => citationMatchesDomain(c.domain ?? '', domain));
            if (match) {
                mentionCount++;
                positionSum += match.position;
                queryMentions++;
            }
        }
        return {
            domain,
            shareOfVoice: queryCount > 0 ? queryMentions / queryCount : 0,
            avgPosition: mentionCount > 0 ? positionSum / mentionCount : 0,
            queryCount,
            mentionCount,
        };
    });

    return {
        queries,
        competitors: competitors.map(extractHostname),
        runs,
        metrics,
    };
}

/** Run competitive benchmark with a single Claude model (Anthropic). Uses prompt-based JSON; no structured output. */
export async function runCompetitiveBenchmarkClaude(
    targetUrl: string,
    competitors: string[],
    queries: string[],
    model: string
): Promise<CompetitiveBenchmarkResult | null> {
    const apiKey = getAnthropicKey();
    if (!apiKey) return null;

    let client: Anthropic;
    try {
        client = new Anthropic({ apiKey });
    } catch {
        return null;
    }

    const targetDomain = extractHostname(targetUrl);
    const allDomains = [targetDomain, ...competitors.map(extractHostname)].filter(Boolean);
    const runs: CompetitiveCitationRun[] = [];

    const systemPrompt =
        'You are a helpful search assistant. For the user\'s query, respond with a JSON object containing a single key "citations": an array of companies or domains you would recommend, in order of relevance. Each item must have "domain" (lowercase, no protocol, e.g. example.com or company name) and "position" (1-based index). When a company matches one of these known domains, use that domain: ' +
        (allDomains.length > 0 ? allDomains.join(', ') : 'none') +
        '. If no relevant companies or domains, return {"citations":[]}. Reply with only the JSON, no markdown or explanation.';

    const runPromises = queries.map(async (query, q) => {
        try {
            const res = await client.messages.create({
                model,
                max_tokens: 1024,
                system: systemPrompt,
                messages: [{ role: 'user', content: query }],
            });
            const rawContent = extractJsonFromClaudeContent(
                (res.content as Array<{ type: string; text?: string }>) ?? []
            );
            const citations = parseStructuredCitations(rawContent);
            return {
                queryId: `q-${q}`,
                query,
                provider: 'anthropic' as const,
                citations,
                rawAnswerExcerpt: rawContent.slice(0, 500),
            };
        } catch (e) {
            console.error('[CHECKION] Competitive benchmark Claude query error:', e);
            return {
                queryId: `q-${q}`,
                query,
                provider: 'anthropic' as const,
                citations: [],
            };
        }
    });
    const runResults = await Promise.all(runPromises);
    runs.push(...runResults);

    const queryCount = runs.length;
    const metrics: CompetitiveMetrics[] = allDomains.map((domain) => {
        let mentionCount = 0;
        let positionSum = 0;
        let queryMentions = 0;
        for (const run of runs) {
            const match = run.citations.find((c) => citationMatchesDomain(c.domain ?? '', domain));
            if (match) {
                mentionCount++;
                positionSum += match.position;
                queryMentions++;
            }
        }
        return {
            domain,
            shareOfVoice: queryCount > 0 ? queryMentions / queryCount : 0,
            avgPosition: mentionCount > 0 ? positionSum / mentionCount : 0,
            queryCount,
            mentionCount,
        };
    });

    return {
        queries,
        competitors: competitors.map(extractHostname),
        runs,
        metrics,
    };
}

/** Run competitive benchmark with a single Gemini model (Google). Uses prompt-based JSON; no structured output. */
export async function runCompetitiveBenchmarkGemini(
    targetUrl: string,
    competitors: string[],
    queries: string[],
    model: string
): Promise<CompetitiveBenchmarkResult | null> {
    const apiKey = getGeminiKey();
    if (!apiKey) return null;

    let client: InstanceType<typeof GoogleGenAI>;
    try {
        client = new GoogleGenAI({ apiKey });
    } catch {
        return null;
    }

    const targetDomain = extractHostname(targetUrl);
    const allDomains = [targetDomain, ...competitors.map(extractHostname)].filter(Boolean);
    const runs: CompetitiveCitationRun[] = [];

    const systemPrompt =
        'You are a helpful search assistant. For the user\'s query, respond with a JSON object containing a single key "citations": an array of companies or domains you would recommend, in order of relevance. Each item must have "domain" (lowercase, no protocol, e.g. example.com or company name) and "position" (1-based index). When a company matches one of these known domains, use that domain: ' +
        (allDomains.length > 0 ? allDomains.join(', ') : 'none') +
        '. If no relevant companies or domains, return {"citations":[]}. Reply with only the JSON, no markdown or explanation.';

    const runPromises = queries.map(async (query, q) => {
        try {
            const response = await client.models.generateContent({
                model,
                contents: query,
                config: {
                    systemInstruction: systemPrompt,
                    maxOutputTokens: 1024,
                    responseMimeType: 'application/json',
                },
            });
            const rawContent = (response?.text ?? '').trim();
            const citations = parseStructuredCitations(rawContent);
            return {
                queryId: `q-${q}`,
                query,
                provider: 'google' as const,
                citations,
                rawAnswerExcerpt: rawContent.slice(0, 500),
            };
        } catch (e) {
            console.error('[CHECKION] Competitive benchmark Gemini query error:', e);
            return {
                queryId: `q-${q}`,
                query,
                provider: 'google' as const,
                citations: [],
            };
        }
    });
    const runResults = await Promise.all(runPromises);
    runs.push(...runResults);

    const queryCount = runs.length;
    const metrics: CompetitiveMetrics[] = allDomains.map((domain) => {
        let mentionCount = 0;
        let positionSum = 0;
        let queryMentions = 0;
        for (const run of runs) {
            const match = run.citations.find((c) => citationMatchesDomain(c.domain ?? '', domain));
            if (match) {
                mentionCount++;
                positionSum += match.position;
                queryMentions++;
            }
        }
        return {
            domain,
            shareOfVoice: queryCount > 0 ? queryMentions / queryCount : 0,
            avgPosition: mentionCount > 0 ? positionSum / mentionCount : 0,
            queryCount,
            mentionCount,
        };
    });

    return {
        queries,
        competitors: competitors.map(extractHostname),
        runs,
        metrics,
    };
}

export interface CompetitiveBenchmarkMultiModelOptions {
    /** Called after each model completes with the accumulated partial results. */
    onModelComplete?: (
        modelId: string,
        partial: Record<string, CompetitiveBenchmarkResult>
    ) => void | Promise<void>;
}

/** Run competitive benchmark with multiple models (OpenAI + Claude + Gemini). Returns results keyed by model name. */
export async function runCompetitiveBenchmarkMultiModel(
    targetUrl: string,
    competitors: string[],
    queries: string[],
    openaiModels: readonly string[] = COMPETITIVE_BENCHMARK_MODELS,
    claudeModels: readonly string[] = COMPETITIVE_BENCHMARK_MODELS_CLAUDE,
    geminiModels: readonly string[] = COMPETITIVE_BENCHMARK_MODELS_GEMINI,
    options?: CompetitiveBenchmarkMultiModelOptions
): Promise<Record<string, CompetitiveBenchmarkResult>> {
    const out: Record<string, CompetitiveBenchmarkResult> = {};
    const onModelComplete = options?.onModelComplete;

    for (const model of openaiModels) {
        const result = await runCompetitiveBenchmark(targetUrl, competitors, queries, model);
        if (result) {
            out[model] = result;
            await onModelComplete?.(model, { ...out });
        }
    }

    if (getAnthropicKey()) {
        for (const model of claudeModels) {
            const result = await runCompetitiveBenchmarkClaude(targetUrl, competitors, queries, model);
            if (result) {
                out[model] = result;
                await onModelComplete?.(model, { ...out });
            }
        }
    }

    if (getGeminiKey()) {
        for (const model of geminiModels) {
            const result = await runCompetitiveBenchmarkGemini(targetUrl, competitors, queries, model);
            if (result) {
                out[model] = result;
                await onModelComplete?.(model, { ...out });
            }
        }
    }

    return out;
}
