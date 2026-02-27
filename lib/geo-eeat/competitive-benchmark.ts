/**
 * Competitive LLM citation benchmark: run queries through LLM, extract cited domains, compute metrics.
 * Uses OpenAI. If OPENAI_API_KEY is not set, returns empty competitive result.
 */

import OpenAI from 'openai';
import type {
    CompetitiveBenchmarkResult,
    CompetitiveCitationRun,
    CompetitiveCitation,
    CompetitiveMetrics,
} from '@/lib/types';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';

function extractHostname(input: string): string {
    const s = input.trim().toLowerCase();
    try {
        const u = new URL(s.startsWith('http') ? s : `https://${s}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return s.replace(/^www\./, '').split(/[/?#]/)[0] ?? s;
    }
}

function extractJsonFromResponse(content: string): string {
    const trimmed = content.trim();
    const codeBlock = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (codeBlock) return codeBlock[1].trim();
    const firstBrace = trimmed.indexOf('[');
    const firstCurly = trimmed.indexOf('{');
    const start = firstBrace >= 0 && (firstCurly < 0 || firstBrace <= firstCurly) ? firstBrace : firstCurly;
    if (start >= 0) {
        const open = trimmed[start];
        const close = open === '[' ? ']' : '}';
        let depth = 0;
        for (let i = start; i < trimmed.length; i++) {
            if (trimmed[i] === open) depth++;
            else if (trimmed[i] === close) {
                depth--;
                if (depth === 0) return trimmed.slice(start, i + 1);
            }
        }
    }
    return trimmed;
}

const EXTRACT_CITATIONS_SYSTEM = `You are a parser. Given a short text (e.g. an AI assistant answer listing companies or recommendations), extract every mentioned domain or company that could be a website/domain.
Return a JSON object with a single key "citations" whose value is an array of objects: { "domain": "normalized-domain-or-company-name", "position": number }.
Position is the 1-based order of mention (first mentioned = 1, second = 2, etc.). Use only lowercase, no protocol, no path (e.g. "example.com" not "https://example.com/page").
If no domains/companies are clearly mentioned, return { "citations": [] }.`;

async function extractCitationsFromText(openai: OpenAI, text: string): Promise<CompetitiveCitation[]> {
    if (!text?.trim()) return [];
    try {
        const res = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: EXTRACT_CITATIONS_SYSTEM },
                { role: 'user', content: `Text:\n${text.slice(0, 3000)}` },
            ],
            max_tokens: 500,
        });
        const raw = res.choices[0]?.message?.content ?? '';
        const jsonStr = extractJsonFromResponse(raw);
        const parsed = JSON.parse(jsonStr) as { citations?: Array<{ domain?: string; position?: number }> };
        if (!Array.isArray(parsed.citations)) return [];
        return parsed.citations
            .filter((c) => c.domain)
            .map((c, i) => ({
                domain: extractHostname(String(c.domain)),
                position: typeof c.position === 'number' && c.position >= 1 ? c.position : i + 1,
            }));
    } catch {
        return [];
    }
}

export async function runCompetitiveBenchmark(
    targetUrl: string,
    competitors: string[],
    queries: string[]
): Promise<CompetitiveBenchmarkResult | null> {
    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return null;
    }

    const targetDomain = extractHostname(targetUrl);
    const allDomains = [targetDomain, ...competitors.map(extractHostname)].filter(Boolean);
    const runs: CompetitiveCitationRun[] = [];

    for (let q = 0; q < queries.length; q++) {
        const query = queries[q];
        try {
            const res = await openai.chat.completions.create({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful search assistant. Answer concisely. When listing companies, products, or recommendations, name them clearly so a parser can extract domain/company names.',
                    },
                    { role: 'user', content: query },
                ],
                max_tokens: 800,
            });
            const answerText = res.choices[0]?.message?.content ?? '';
            const citations = await extractCitationsFromText(openai, answerText);
            runs.push({
                queryId: `q-${q}`,
                query,
                provider: 'openai',
                citations,
                rawAnswerExcerpt: answerText.slice(0, 500),
            });
        } catch (e) {
            console.error('[CHECKION] Competitive benchmark query error:', e);
            runs.push({
                queryId: `q-${q}`,
                query,
                provider: 'openai',
                citations: [],
            });
        }
    }

    const queryCount = runs.length;
    const metrics: CompetitiveMetrics[] = allDomains.map((domain) => {
        let mentionCount = 0;
        let positionSum = 0;
        let queryMentions = 0;
        for (const run of runs) {
            const match = run.citations.find((c) => {
                const d = c.domain ?? '';
                return d === domain || d.endsWith('.' + domain) || domain.endsWith('.' + d);
            });
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
