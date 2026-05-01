import { describe, it, expect } from 'vitest';
import { readScanNdjsonStream } from '@/lib/scan-stream-parse';

function streamFromChunks(lines: string[]): ReadableStream<Uint8Array> {
    const enc = new TextEncoder();
    let i = 0;
    return new ReadableStream({
        pull(controller) {
            if (i >= lines.length) {
                controller.close();
                return;
            }
            controller.enqueue(enc.encode(lines[i]));
            i += 1;
        },
    });
}

describe('readScanNdjsonStream', () => {
    it('yields one parsed object per line', async () => {
        const body = streamFromChunks([
            '{"type":"progress","phase":"session_created"}\n',
            '{"type":"progress","phase":"navigate","device":"desktop"}\n',
            '{"type":"complete","data":{"id":"x"}}\n',
        ]);
        const out: unknown[] = [];
        for await (const line of readScanNdjsonStream(body)) {
            out.push(line);
        }
        expect(out).toHaveLength(3);
        expect(out[0]).toEqual({ type: 'progress', phase: 'session_created' });
        expect(out[1]).toEqual({ type: 'progress', phase: 'navigate', device: 'desktop' });
        expect(out[2]).toMatchObject({ type: 'complete', data: { id: 'x' } });
    });

    it('handles split chunks across line boundaries', async () => {
        const enc = new TextEncoder();
        const json = '{"type":"error","message":"bad"}\n';
        const mid = Math.floor(json.length / 2);
        const body = streamFromChunks([json.slice(0, mid), json.slice(mid)]);
        const out: unknown[] = [];
        for await (const line of readScanNdjsonStream(body)) {
            out.push(line);
        }
        expect(out).toEqual([{ type: 'error', message: 'bad' }]);
    });
});
