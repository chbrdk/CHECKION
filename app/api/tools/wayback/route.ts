import { NextRequest, NextResponse } from 'next/server';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { API_WAYBACK_AVAILABLE } from '@/lib/external-apis';

export async function GET(req: NextRequest) {
    const urlParam = req.nextUrl.searchParams.get('url');
    if (!urlParam) {
        return apiError('url is required', API_STATUS.BAD_REQUEST);
    }
    let url = urlParam;
    if (!url.startsWith('http')) url = 'https://' + url;

    try {
        const res = await fetch(
            `${API_WAYBACK_AVAILABLE}?url=${encodeURIComponent(url)}`,
            { signal: AbortSignal.timeout(10000) }
        );
        if (!res.ok) {
            return apiError('Wayback API error: ' + res.statusText, API_STATUS.BAD_GATEWAY);
        }
        const json = (await res.json()) as {
            archived_snapshots?: { closest?: { url?: string; timestamp?: string; available?: boolean } };
        };
        const closest = json.archived_snapshots?.closest;

        return NextResponse.json({
            success: true,
            data: {
                url,
                available: !!closest?.available,
                firstSnapshotUrl: closest?.url ?? null,
                firstSnapshotTimestamp: closest?.timestamp ?? null,
            },
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        return apiError(msg, API_STATUS.INTERNAL_ERROR);
    }
}
