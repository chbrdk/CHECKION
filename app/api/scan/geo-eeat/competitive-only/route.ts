/* ------------------------------------------------------------------ */
/*  CHECKION – POST /api/scan/geo-eeat/competitive-only               */
/*  Competitive-only: question + company (no on-page scan)            */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth-api-token';
import { apiError, API_STATUS, handleApiError } from '@/lib/api-error-handler';
import { parseApiBody, geoEeatCompetitiveOnlyBodySchema } from '@/lib/api-schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { insertGeoEeatRun, updateGeoEeatRun } from '@/lib/db/geo-eeat-runs';
import { insertCompetitiveRun, updateCompetitiveRun } from '@/lib/db/geo-eeat-competitive-runs';
import { runCompetitiveBenchmarkMultiModel } from '@/lib/geo-eeat/competitive-benchmark';
import { emptyUsageTotals } from '@/lib/llm/usage-totals';
import { extractHostname } from '@/lib/geo-eeat/suggest-parse';
import { v4 as uuidv4 } from 'uuid';
import { reportUsage } from '@/lib/usage-report';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser(request);
        if (!user) {
            return apiError('Unauthorized', API_STATUS.UNAUTHORIZED);
        }
        const rl = await checkRateLimit(`scan:${user.id}`, 'default');
        if (!rl.allowed) {
            return apiError(
                'Too many requests. Please try again later.',
                API_STATUS.TOO_MANY_REQUESTS,
                rl.retryAfter ? { retryAfter: rl.retryAfter } : undefined
            );
        }

        const parsed = await parseApiBody(request, geoEeatCompetitiveOnlyBodySchema);
        if (parsed instanceof NextResponse) return parsed;
        const { company, question, projectId } = parsed;

        const companyHost = extractHostname(company).trim();
        if (!companyHost) {
            return apiError('Invalid company domain or URL.', API_STATUS.BAD_REQUEST);
        }

        const jobId = uuidv4();
        const canonicalUrl = `https://${companyHost}`;
        const competitiveOnlyBase = {
            pages: [],
            recommendations: [],
            competitiveOnly: true as const,
            companyHost,
        };

        try {
            await insertGeoEeatRun(jobId, user.id, canonicalUrl, {
                projectId: projectId ?? undefined,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (/violates foreign key|foreign key constraint|23503/i.test(msg)) {
                return apiError('Invalid project.', API_STATUS.BAD_REQUEST);
            }
            throw e;
        }

        void (async () => {
            try {
                await updateGeoEeatRun(jobId, user.id, { status: 'running' });

                const qs = [question];
                const comps: string[] = [];
                const competitiveRunId = uuidv4();
                const userId = user.id;
                await insertCompetitiveRun(competitiveRunId, jobId, userId, qs, comps);

                const usageTotals = emptyUsageTotals();
                const competitiveByModel = await runCompetitiveBenchmarkMultiModel(
                    canonicalUrl,
                    comps,
                    qs,
                    undefined,
                    undefined,
                    undefined,
                    {
                        onModelComplete: async (_, partial) => {
                            await updateGeoEeatRun(jobId, userId, {
                                status: 'running',
                                payload: { ...competitiveOnlyBase, competitiveByModel: partial },
                            });
                        },
                        usageTotals,
                    }
                );

                await updateCompetitiveRun(competitiveRunId, userId, {
                    status: 'complete',
                    completedAt: new Date(),
                    competitiveByModel: Object.keys(competitiveByModel).length > 0 ? competitiveByModel : null,
                });

                await updateGeoEeatRun(jobId, userId, {
                    status: 'complete',
                    payload: {
                        ...competitiveOnlyBase,
                        competitiveByModel: Object.keys(competitiveByModel).length > 0 ? competitiveByModel : {},
                    },
                });

                try {
                    const hasLlmTokens =
                        usageTotals.input_tokens > 0 || usageTotals.output_tokens > 0;
                    reportUsage({
                        userId: userId,
                        eventType: 'geo_eeat',
                        rawUnits: hasLlmTokens
                            ? {
                                  job: 1,
                                  input_tokens: usageTotals.input_tokens,
                                  output_tokens: usageTotals.output_tokens,
                              }
                            : { job: 1 },
                        idempotencyKey: `geo_eeat:${jobId}`,
                    });
                } catch {
                    /* never affect response */
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                console.error('[CHECKION] GEO/E-E-A-T competitive-only run failed:', e);
                await updateGeoEeatRun(jobId, user.id, {
                    status: 'error',
                    error: message,
                });
            }
        })();

        return NextResponse.json({ success: true, jobId }, { status: 202 });
    } catch (e) {
        return handleApiError(e, { context: 'POST /api/scan/geo-eeat/competitive-only' });
    }
}

