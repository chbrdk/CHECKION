/** Parse `application/x-ndjson` bodies from `POST /api/scan` when the stream header is set. */

import type { ScanNdjsonLine } from '@/lib/scan-progress';

export async function* readScanNdjsonStream(
    body: ReadableStream<Uint8Array> | null
): AsyncGenerator<ScanNdjsonLine> {
    if (!body) return;
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const t = line.trim();
                if (!t) continue;
                yield JSON.parse(t) as ScanNdjsonLine;
            }
        }
        const tail = buffer.trim();
        if (tail) yield JSON.parse(tail) as ScanNdjsonLine;
    } finally {
        reader.releaseLock();
    }
}
