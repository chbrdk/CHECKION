/**
 * Detect Chrome extension noise that often appears when navigating away mid-request.
 * Not emitted by CHECKION application code.
 */
export function isBrowserExtensionMessageChannelError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
        msg.includes('message channel closed') ||
        msg.includes('extension context invalidated') ||
        msg.includes('receiving end does not exist')
    );
}

export async function readJsonResponse<T = unknown>(res: Response): Promise<T> {
    try {
        return (await res.json()) as T;
    } catch {
        return {} as T;
    }
}
