/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/saliency/generate (async: start job, returns jobId)  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getScan } from '@/lib/db/scans';
import { getScreenshotBase64 } from '@/lib/screenshot-storage';

/** Base URL of the saliency service. Public domains stay HTTPS; internal hostnames (no dot) use http. */
function getSaliencyBaseUrl(): string | undefined {
    const raw = process.env.SALIENCY_SERVICE_URL;
    if (!raw?.trim()) return undefined;
    const url = raw.replace(/\/$/, '').trim();
    if (!url.toLowerCase().startsWith('https://')) return url;
    try {
        const host = new URL(url).hostname;
        if (host.includes('.')) return url;
    } catch {
        /* keep url as-is if parse fails */
    }
    return url.replace(/^https:\/\//i, 'http://');
}

/** Timeout for job creation only (short). */
const JOB_CREATE_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const saliencyBaseUrl = getSaliencyBaseUrl();
    if (!saliencyBaseUrl) {
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
    const imageBase64 = await getScreenshotBase64(result.screenshot, scanId);
    if (!imageBase64) {
        return NextResponse.json({ error: 'Scan has no screenshot or screenshot file missing.' }, { status: 400 });
    }

    const jobsUrl = saliencyBaseUrl + '/jobs';
    let res: Response;
    try {
        res = await fetch(jobsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: imageBase64 }),
            signal: AbortSignal.timeout(JOB_CREATE_TIMEOUT_MS),
        });
    } catch (e) {
        const message =
            e instanceof Error ? e.message : 'Saliency service request failed';
        console.error('[CHECKION] saliency/generate: create job error', { url: jobsUrl, error: message });
        return NextResponse.json(
            { error: message + ' (SALIENCY_SERVICE_URL prüfen.)' },
            { status: 502 },
        );
    }

    if (!res.ok) {
        const text = await res.text();
        console.error('[CHECKION] saliency/generate: service returned', res.status, text);
        return NextResponse.json(
            { error: `Saliency service error: ${res.status}` },
            { status: 502 },
        );
    }

    let data: { job_id?: string };
    try {
        data = (await res.json()) as { job_id?: string };
    } catch {
        return NextResponse.json(
            { error: 'Invalid response from saliency service.' },
            { status: 502 },
        );
    }

    const jobId = data.job_id;
    if (!jobId || typeof jobId !== 'string') {
        return NextResponse.json(
            { error: 'Saliency service did not return job_id.' },
            { status: 502 },
        );
    }

    return NextResponse.json({ jobId });
}
