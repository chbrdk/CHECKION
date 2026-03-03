import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { API_PAGESPEED_BASE } from '@/lib/external-apis';
import { reportUsage } from '@/lib/usage-report';

export async function GET(req: NextRequest) {
    const user = await getRequestUser(req);
    const urlParam = req.nextUrl.searchParams.get('url');
    if (!urlParam) {
        return apiError('url is required', API_STATUS.BAD_REQUEST);
    }
    let url = urlParam;
    if (!url.startsWith('http')) url = 'https://' + url;
    try {
        new URL(url);
    } catch {
        return apiError('Invalid URL', API_STATUS.BAD_REQUEST);
    }

    const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
    const apiUrl = `${API_PAGESPEED_BASE}/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ''}`;

    try {
        const res = await fetch(apiUrl, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) {
            return apiError('PageSpeed API error: ' + res.statusText, API_STATUS.BAD_GATEWAY);
        }
        const json = (await res.json()) as {
            lighthouseResult?: {
                categories?: Record<string, { score?: number; title?: string }>;
            };
        };
        const cats = json.lighthouseResult?.categories ?? {};
        const performance = (cats.performance?.score ?? 0) * 100;
        const accessibility = (cats.accessibility?.score ?? 0) * 100;
        const bestPractices = (cats['best-practices']?.score ?? 0) * 100;
        const seo = (cats.seo?.score ?? 0) * 100;

        if (user) {
            reportUsage({ userId: user.id, eventType: 'scan_pagespeed', rawUnits: { requests: 1 } });
        }

        return NextResponse.json({
            success: true,
            data: {
                url,
                performance: Math.round(performance),
                accessibility: Math.round(accessibility),
                bestPractices: Math.round(bestPractices),
                seo: Math.round(seo),
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return apiError(msg, API_STATUS.INTERNAL_ERROR);
    }
}
