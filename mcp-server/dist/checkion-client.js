/**
 * HTTP client for CHECKION API. All requests use Bearer token from env.
 */
const BASE_URL = process.env.CHECKION_API_URL ?? '';
const TOKEN = process.env.CHECKION_API_TOKEN ?? '';
export async function checkionFetch(path, options = {}) {
    if (!BASE_URL || !TOKEN) {
        return {
            error: true,
            message: 'CHECKION_API_URL or CHECKION_API_TOKEN not configured',
        };
    }
    const url = path.startsWith('http') ? path : `${BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    try {
        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        }
        catch {
            return {
                error: true,
                message: res.ok ? text || 'Empty response' : `HTTP ${res.status}: ${text.slice(0, 200)}`,
                status: res.status,
            };
        }
        if (!res.ok) {
            const err = data;
            return {
                error: true,
                message: err?.error ?? err?.message ?? `HTTP ${res.status}`,
                status: res.status,
            };
        }
        return data;
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        return { error: true, message: `Request failed: ${message}` };
    }
}
export function isCheckionError(r) {
    return typeof r === 'object' && r !== null && 'error' in r && r.error === true;
}
