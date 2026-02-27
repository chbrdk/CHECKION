/**
 * Helpers for AI suggest competitors/queries: hostname extraction and response parsing.
 */

export function extractHostname(url: string): string {
    const trimmed = url.trim();
    try {
        const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return trimmed;
    }
}

export interface SuggestResult {
    competitors: string[];
    queries: string[];
}

/**
 * Parse LLM raw text into competitors and queries arrays.
 * Expects JSON object with "competitors" and "queries" arrays; extracts first JSON object if wrapped in markdown.
 * Returns empty arrays if input is empty or JSON is invalid/truncated.
 */
export function parseSuggestResponse(raw: string): SuggestResult {
    const trimmed = raw.trim();
    if (!trimmed) return { competitors: [], queries: [] };
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
    let parsed: { competitors?: unknown; queries?: unknown };
    try {
        parsed = JSON.parse(jsonStr) as { competitors?: unknown; queries?: unknown };
    } catch {
        return { competitors: [], queries: [] };
    }

    const competitors = Array.isArray(parsed.competitors)
        ? parsed.competitors.slice(0, 10).filter((c): c is string => typeof c === 'string').map((c) => c.trim()).filter(Boolean)
        : [];
    const queries = Array.isArray(parsed.queries)
        ? parsed.queries.slice(0, 15).filter((q): q is string => typeof q === 'string').map((q) => q.trim()).filter(Boolean)
        : [];

    return { competitors, queries };
}
