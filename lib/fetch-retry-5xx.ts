const DEFAULT_DELAY_MS = 400;

/**
 * Runs `fn` once; if the response is HTTP 5xx, waits briefly and runs `fn` again.
 * Use for transient server errors on first navigation (cold DB, deploy warmup).
 */
export async function fetchOnceMoreOn5xx(
    fn: () => Promise<Response>,
    options?: { delayMs?: number }
): Promise<Response> {
    let res = await fn();
    const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
    if (res.status >= 500 && res.status < 600) {
        await new Promise((r) => setTimeout(r, delayMs));
        res = await fn();
    }
    return res;
}
