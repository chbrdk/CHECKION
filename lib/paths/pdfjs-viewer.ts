/**
 * pdf.js helpers for dev PDF spread preview — worker URL is centralized here.
 */
import { getPublicAssetPath } from '@/lib/constants';

/** Static worker copied to `public/` (see `scripts/copy-pdfjs-worker.sh`). */
export const PDFJS_WORKER_PUBLIC_PATH = '/pdf.worker.min.mjs';

export function pdfJsWorkerUrl(): string {
    return getPublicAssetPath(PDFJS_WORKER_PUBLIC_PATH);
}

let workerReady: Promise<typeof import('pdfjs-dist')> | null = null;

export function loadPdfJs(): Promise<typeof import('pdfjs-dist')> {
    if (!workerReady) {
        workerReady = (async () => {
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = pdfJsWorkerUrl();
            return pdfjs;
        })();
    }
    return workerReady;
}

export async function loadPdfDocumentFromBlob(blob: Blob) {
    const pdfjs = await loadPdfJs();
    const data = await blob.arrayBuffer();
    const task = pdfjs.getDocument({ data });
    return task.promise;
}
