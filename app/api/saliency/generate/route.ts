/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/saliency/generate (SUM job → jobId | AI → success)  */
/* ------------------------------------------------------------------ */

import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/auth';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, saliencyGenerateBodySchema } from '@/lib/api-schemas';
import { getScan, updateScanResult } from '@/lib/db/scans';
import { invalidateScan } from '@/lib/cache';
import { enrichPageIndexWithSaliency } from '@/lib/page-index';
import { fuseSaliencyHeatmap, renderStructureOnlyHeatmap } from '@/lib/saliency-fusion';
import { getAttentionRegionsFromVision, renderHeatmapFromRegions } from '@/lib/saliency-ai';
import { setVisionRegions } from '@/lib/saliency-vision-cache';
import { computeScanpath } from '@/lib/scanpath';
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

const USE_AI_SALIENCY = process.env.SALIENCY_USE_AI === 'true' || process.env.SALIENCY_USE_AI === '1';
/** When false, SUM is skipped and heatmap is built from structure + optional contrast only (full-page coverage). */
const USE_SUM_SALIENCY = process.env.SALIENCY_USE_SUM !== 'false';
const USE_LLM_REGIONS = process.env.SALIENCY_LLM_REGIONS === 'true' || process.env.SALIENCY_LLM_REGIONS === '1';
const STRUCTURE_WEIGHT = parseFloat(process.env.SALIENCY_FUSION_STRUCTURE_WEIGHT ?? '0.45');
const CONTRAST_WEIGHT = parseFloat(process.env.SALIENCY_FUSION_CONTRAST_WEIGHT ?? '0.25');

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    }

    const parsed = await parseApiBody(request, saliencyGenerateBodySchema);
    if (parsed instanceof NextResponse) return parsed;
    const scanId = parsed.scanId;

    const result = await getScan(scanId, session.user.id);
    if (!result) {
        return apiError('Scan not found.', API_STATUS.NOT_FOUND);
    }
    const imageBase64 = await getScreenshotBase64(result.screenshot, scanId);
    if (!imageBase64) {
        return apiError('Scan has no screenshot or screenshot file missing.', API_STATUS.BAD_REQUEST);
    }

    // --- AI path: OpenAI Vision → regions → render heatmap (no SUM, no polling) ---
    if (USE_AI_SALIENCY && process.env.OPENAI_API_KEY?.trim()) {
        try {
            const buf = Buffer.from(imageBase64, 'base64');
            const meta = await sharp(buf).metadata();
            const width = meta.width ?? 1920;
            const height = meta.height ?? 1080;

            const regions = await getAttentionRegionsFromVision(imageBase64, width, height);
            if (regions.length === 0) {
                return apiError('AI could not detect attention regions. Try again or use SUM backend.', API_STATUS.BAD_GATEWAY);
            }

            let heatmapBase64 = await renderHeatmapFromRegions(regions, width, height);
            if (result.pageIndex) {
                try {
                    heatmapBase64 = await fuseSaliencyHeatmap({
                        sumHeatmapPngBase64: heatmapBase64,
                        pageIndex: result.pageIndex,
                        structureWeight: STRUCTURE_WEIGHT,
                        width,
                        height,
                    });
                } catch (e) {
                    console.error('[CHECKION] saliency/generate (AI): fusion failed', e);
                }
            }
            const dataUrl = `data:image/png;base64,${heatmapBase64}`;

            let pageIndexPatch: { pageIndex?: typeof result.pageIndex } = {};
            if (result.pageIndex) {
                try {
                    pageIndexPatch.pageIndex = await enrichPageIndexWithSaliency(result.pageIndex, dataUrl);
                } catch (e) {
                    console.error('[CHECKION] saliency/generate (AI): enrichPageIndexWithSaliency failed', e);
                }
            }
            let scanpathPatch: { scanpath?: typeof result.scanpath } = {};
            if (result.pageIndex) {
                try {
                    const scanpath = await computeScanpath({
                        heatmapPngBase64: heatmapBase64,
                        pageIndex: result.pageIndex,
                        width,
                        height,
                    });
                    if (scanpath.length > 0) scanpathPatch.scanpath = scanpath;
                } catch (e) {
                    console.error('[CHECKION] saliency/generate (AI): computeScanpath failed', e);
                }
            }

            const updated = await updateScanResult(scanId, session.user.id, {
                saliencyHeatmap: dataUrl,
                ...pageIndexPatch,
                ...scanpathPatch,
            });
            if (!updated) {
                return apiError('Failed to save heatmap to scan.', API_STATUS.INTERNAL_ERROR);
            }
            invalidateScan(scanId);
            return NextResponse.json({ success: true });
        } catch (e) {
            const message = e instanceof Error ? e.message : 'AI saliency failed';
            console.error('[CHECKION] saliency/generate (AI):', e);
            return apiError(message, API_STATUS.BAD_GATEWAY);
        }
    }

    // --- Structure-only path: no SUM, full-page heatmap from DOM + contrast (no jobId) ---
    if (!USE_SUM_SALIENCY && result.pageIndex) {
        try {
            const buf = Buffer.from(imageBase64, 'base64');
            const meta = await sharp(buf).metadata();
            const imgWidth = meta.width ?? 1920;
            const imgHeight = meta.height ?? 1080;
            const visionRegions =
                USE_LLM_REGIONS && process.env.OPENAI_API_KEY?.trim()
                    ? await getAttentionRegionsFromVision(imageBase64, imgWidth, imgHeight).catch(() => [])
                    : undefined;
            const heatmapBase64 = await renderStructureOnlyHeatmap({
                pageIndex: result.pageIndex,
                width: imgWidth,
                height: imgHeight,
                structureWeight: 1,
                visionRegions: visionRegions?.length ? visionRegions : undefined,
                visionWeight: 0.2,
                imageBuffer: buf,
                contrastWeight: CONTRAST_WEIGHT,
            });
            const dataUrl = `data:image/png;base64,${heatmapBase64}`;
            let pageIndexPatch: { pageIndex?: typeof result.pageIndex } = {};
            if (result.pageIndex) {
                try {
                    pageIndexPatch.pageIndex = await enrichPageIndexWithSaliency(result.pageIndex, dataUrl);
                } catch {
                    /* ignore */
                }
            }
            let scanpathPatch: { scanpath?: typeof result.scanpath } = {};
            try {
                const scanpath = await computeScanpath({
                    heatmapPngBase64: heatmapBase64,
                    pageIndex: result.pageIndex!,
                    width: imgWidth,
                    height: imgHeight,
                });
                if (scanpath.length > 0) scanpathPatch.scanpath = scanpath;
            } catch {
                /* ignore */
            }
            const updated = await updateScanResult(scanId, session.user.id, {
                saliencyHeatmap: dataUrl,
                ...pageIndexPatch,
                ...scanpathPatch,
            });
            if (!updated) {
                return apiError('Failed to save heatmap to scan.', API_STATUS.INTERNAL_ERROR);
            }
            invalidateScan(scanId);
            return NextResponse.json({ success: true });
        } catch (e) {
            console.error('[CHECKION] saliency/generate (structure-only):', e);
            return apiError(e instanceof Error ? e.message : 'Structure-only heatmap failed', API_STATUS.BAD_GATEWAY);
        }
    }

    if (!USE_SUM_SALIENCY) {
        return apiError(
            'Structure-only saliency requires pageIndex. Run a scan that produces a structure map first.',
            API_STATUS.BAD_REQUEST
        );
    }

    // --- SUM path: create job, return jobId (client polls /api/saliency/result) ---
    const saliencyBaseUrl = getSaliencyBaseUrl();
    if (!saliencyBaseUrl) {
        return apiError(
            USE_AI_SALIENCY
                ? 'AI saliency needs OPENAI_API_KEY. SUM needs SALIENCY_SERVICE_URL.'
                : 'Saliency not configured: set SALIENCY_SERVICE_URL or SALIENCY_USE_AI=1 and OPENAI_API_KEY.',
            API_STATUS.UNAVAILABLE
        );
    }

    const buf = Buffer.from(imageBase64, 'base64');
    const meta = await sharp(buf).metadata();
    const imgWidth = meta.width ?? 1920;
    const imgHeight = meta.height ?? 1080;

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
        return apiError(message + ' (SALIENCY_SERVICE_URL prüfen.)', API_STATUS.BAD_GATEWAY);
    }

    if (!res.ok) {
        const text = await res.text();
        console.error('[CHECKION] saliency/generate: service returned', res.status, text);
        return apiError(`Saliency service error: ${res.status}`, API_STATUS.BAD_GATEWAY);
    }

    let data: { job_id?: string };
    try {
        data = (await res.json()) as { job_id?: string };
    } catch {
        return apiError('Invalid response from saliency service.', API_STATUS.BAD_GATEWAY);
    }

    const jobId = data.job_id;
    if (!jobId || typeof jobId !== 'string') {
        return apiError('Saliency service did not return job_id.', API_STATUS.BAD_GATEWAY);
    }

    if (USE_LLM_REGIONS && process.env.OPENAI_API_KEY?.trim()) {
        getAttentionRegionsFromVision(imageBase64, imgWidth, imgHeight)
            .then((regions) => {
                setVisionRegions(jobId, regions);
            })
            .catch((err) => console.error('[CHECKION] saliency/generate: vision regions failed', err));
    }

    return NextResponse.json({ jobId });
}
