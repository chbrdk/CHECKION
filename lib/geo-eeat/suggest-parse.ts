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
 */
export function parseSuggestResponse(raw: string): SuggestResult {
    const trimmed = raw.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
    const parsed = JSON.parse(jsonStr) as { competitors?: unknown; queries?: unknown };

    const competitors = Array.isArray(parsed.competitors)
        ? parsed.competitors.slice(0, 10).filter((c): c is string => typeof c === 'string').map((c) => c.trim()).filter(Boolean)
        : [];
    const queries = Array.isArray(parsed.queries)
        ? parsed.queries.slice(0, 15).filter((q): q is string => typeof q === 'string').map((q) => q.trim()).filter(Boolean)
        : [];

    return { competitors, queries };
}
