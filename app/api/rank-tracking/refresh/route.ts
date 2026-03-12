/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/rank-tracking/refresh                         */
/*  Returns 502 (Bad Gateway) when: SERP_API_KEY is missing, or the  */
/*  external SERP API (Serper/ScrapingRobot) fails or times out.     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, rankTrackingRefreshBodySchema } from '@/lib/api-schemas';
import {
    getKeyword,
    listKeywordIdsByProject,
    touchKeywordUpdatedAt,
} from '@/lib/db/rank-tracking-keywords';
import { insertPosition } from '@/lib/db/rank-tracking-positions';
import { fetchSerpPosition } from '@/lib/serp-api';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const parsed = await parseApiBody(request, rankTrackingRefreshBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    if (!process.env.SERP_API_KEY) {
        return apiError('SERP rank tracking is not configured (SERP_API_KEY missing)', API_STATUS.BAD_GATEWAY);
    }

    const keywordIds: string[] = [];
    if (parsed.keywordId) {
        const kw = await getKeyword(parsed.keywordId, user.id);
        if (!kw) return apiError('Keyword not found', API_STATUS.NOT_FOUND);
        keywordIds.push(parsed.keywordId);
    } else if (parsed.projectId) {
        keywordIds.push(...(await listKeywordIdsByProject(parsed.projectId)));
    }

    const results: Array<{ keywordId: string; position: number | null }> = [];
    for (const kid of keywordIds) {
        const kw = await getKeyword(kid, user.id);
        if (!kw) continue;
        try {
            const { position } = await fetchSerpPosition(kw.keyword, kw.domain, {
                country: kw.country ?? undefined,
                device: kw.device ?? undefined,
            });
            await insertPosition(kid, position, uuidv4());
            await touchKeywordUpdatedAt(kid, user.id);
            results.push({ keywordId: kid, position });
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'SERP request failed';
            return apiError(`Rank refresh failed: ${msg}`, API_STATUS.BAD_GATEWAY);
        }
    }
    return NextResponse.json({ success: true, updated: results.length, results });
}
