import { NextRequest, NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';

export async function GET(req: NextRequest) {
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

    try {
        const { scan } = await import('@ryntab/wappalyzer-node');
        const result = await scan(url, { timeout: 15000 });

        const technologies = Array.isArray(result)
            ? (result as Array<{ name?: string; slug?: string; version?: string; categories?: string[] }>)
            : (result as { technologies?: Array<{ name?: string; slug?: string; version?: string; categories?: string[] }> })?.technologies ?? [];

        const normalized = technologies.slice(0, 30).map((t) => ({
            name: t.name ?? t.slug ?? 'Unknown',
            version: t.version ?? null,
            categories: Array.isArray(t.categories) ? t.categories : [],
        }));

        return NextResponse.json({
            success: true,
            data: {
                url,
                technologies: normalized,
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return apiError(msg, API_STATUS.INTERNAL_ERROR);
    }
}
