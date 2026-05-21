/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/rank-tracking/keywords/localize               */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS } from '@/lib/api-error-handler';
import { parseApiBody, rankTrackingKeywordsLocalizeBodySchema } from '@/lib/api-schemas';
import { getProject } from '@/lib/db/projects';
import { insertKeywords } from '@/lib/db/rank-tracking-keywords';
import { localizeKeywordsForMarkets } from '@/lib/llm/localize-keywords';
import { parseMarketKey } from '@/lib/serp-markets';
import { reportUsage } from '@/lib/usage-report';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    const user = await getRequestUser(request);
    if (!user) return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
    const parsed = await parseApiBody(request, rankTrackingKeywordsLocalizeBodySchema);
    if (parsed instanceof NextResponse) return parsed;

    const project = await getProject(parsed.projectId, user.id);
    if (!project) return apiError('Project not found', API_STATUS.NOT_FOUND);

    try {
        const result = await localizeKeywordsForMarkets({
            seedKeyword: parsed.seedKeyword,
            intentLabel: parsed.intentLabel ?? undefined,
            marketKeys: parsed.marketKeys,
            domain: parsed.domain,
            projectName: project.name,
        });

        let ids: string[] | undefined;
        if (parsed.persist) {
            const rows = result.variants.map((v) => {
                const mk = parseMarketKey(v.marketKey);
                if (!mk) throw new Error(`Invalid market key: ${v.marketKey}`);
                return {
                    id: uuidv4(),
                    data: {
                        domain: parsed.domain,
                        keyword: v.keyword.trim(),
                        country: mk.country,
                        language: mk.language,
                        intentKey: result.intentKey,
                        intentLabel: result.intentLabel,
                        device: parsed.device ?? undefined,
                    },
                };
            });
            await insertKeywords(project.userId, parsed.projectId, rows);
            ids = rows.map((r) => r.id);
            reportUsage({
                userId: user.id,
                eventType: 'llm_request',
                rawUnits: { requests: 1 },
                idempotencyKey: `rank_localize:${parsed.projectId}:${Date.now()}`,
            });
        }

        return NextResponse.json({
            success: true,
            intentKey: result.intentKey,
            intentLabel: result.intentLabel,
            variants: result.variants,
            ids,
        });
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Localization failed';
        if (msg.includes('OPENAI') || msg.includes('API key')) {
            return apiError('OPENAI_API_KEY is not set.', API_STATUS.UNAVAILABLE);
        }
        return apiError(msg, API_STATUS.BAD_REQUEST);
    }
}
