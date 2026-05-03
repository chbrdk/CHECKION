/**
 * Splits stored systemic-issue titles that append Deque/axe URLs in parentheses or as a trailing URL,
 * so the UI can show a readable message plus a separate documentation link.
 */
export function splitSystemicIssueTitle(title: string): { body: string; docUrl: string | null } {
    const raw = title.trim();
    if (!raw) return { body: '', docUrl: null };

    const paren = raw.match(/^(.+?)\s*\((https?:\/\/[^)]+)\)\s*$/);
    if (paren?.[1] && paren[2]) {
        return { body: paren[1].trim(), docUrl: paren[2].trim() };
    }

    const tail = raw.match(/^(.+?)\s+(https?:\/\/\S+)$/);
    if (tail?.[1] && tail[2]) {
        return { body: tail[1].trim(), docUrl: tail[2].trim() };
    }

    return { body: raw, docUrl: null };
}
