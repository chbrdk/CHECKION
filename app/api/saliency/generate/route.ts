/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/saliency/generate (async heatmap from scan)  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan, updateScanResult } from '@/lib/db/scans';

const SALIENCY_SERVICE_URL = process.env.SALIENCY_SERVICE_URL;

/** Timeout (ms) for saliency request. Model on CPU can take 1–3 min for large screenshots. */
const SALIENCY_REQUEST_TIMEOUT_MS = 180_000;

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SALIENCY_SERVICE_URL) {
        return NextResponse.json(
            { error: 'Saliency service not configured (SALIENCY_SERVICE_URL).' },
            { status: 503 },
        );
    }

    let body: { scanId?: string };
    try {
        body = (await request.json()) as { scanId?: string };
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const scanId = body.scanId;
    if (!scanId || typeof scanId !== 'string') {
        return NextResponse.json({ error: 'Missing or invalid "scanId".' }, { status: 400 });
    }

    const result = await getScan(scanId, session.user.id);
    if (!result) {
        return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
    }
    if (!result.screenshot) {
        return NextResponse.json({ error: 'Scan has no screenshot.' }, { status: 400 });
    }

    const predictUrl = SALIENCY_SERVICE_URL.replace(/\/$/, '') + '/predict';
    let res: Response;
    try {
        res = await fetch(predictUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: result.screenshot }),
            signal: AbortSignal.timeout(SALIENCY_REQUEST_TIMEOUT_MS),
        });
    } catch (e) {
        const isTimeout =
            (e instanceof Error && e.name === 'AbortError') ||
            (e instanceof Error && /timeout|aborted/i.test(e.message));
        const message = isTimeout
            ? `Saliency-Anfrage Zeitüberschreitung (${SALIENCY_REQUEST_TIMEOUT_MS / 1000}s). Service auf CPU kann länger brauchen. SALIENCY_SERVICE_URL prüfen, gleiches Netz wie Saliency-Container.`
            : (e instanceof Error ? e.message : 'Saliency service request failed') +
              ' (SALIENCY_SERVICE_URL prüfen, gleiches Netz wie Saliency-Container.)';
        const detail = e instanceof Error ? String(e) : message;
        console.error('[CHECKION] saliency/generate: fetch error', { url: predictUrl, error: detail });
        return NextResponse.json({ error: message }, { status: 502 });
    }

    if (!res.ok) {
        const text = await res.text();
        console.error('[CHECKION] saliency/generate: service returned', res.status, text);
        return NextResponse.json(
            { error: `Saliency service error: ${res.status}` },
            { status: res.status >= 500 ? 502 : 502 },
        );
    }

    let data: { heatmap_base64?: string };
    try {
        data = (await res.json()) as { heatmap_base64?: string };
    } catch {
        return NextResponse.json(
            { error: 'Invalid response from saliency service.' },
            { status: 502 },
        );
    }

    const heatmapBase64 = data.heatmap_base64;
    if (!heatmapBase64 || typeof heatmapBase64 !== 'string') {
        return NextResponse.json(
            { error: 'Saliency service did not return heatmap_base64.' },
            { status: 502 },
        );
    }

    const dataUrl = `data:image/png;base64,${heatmapBase64}`;
    const updated = await updateScanResult(scanId, session.user.id, { saliencyHeatmap: dataUrl });
    if (!updated) {
        return NextResponse.json(
            { error: 'Failed to save heatmap to scan.' },
            { status: 500 },
        );
    }

    return NextResponse.json({ success: true });
}
