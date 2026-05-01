/**
 * Background job: per-page LLM classification (tag tiers) for a domain scan, then refresh aggregated payload.
 * Shared by POST /api/scan/domain/[id]/classify and optional post-deep-scan hook.
 */

import { listScansByGroupId, updateScanResult } from '@/lib/db/scans';
import { refreshDomainPayloadFromScans } from '@/lib/domain-scan-classify';
import {
    classifyPageWithLlm,
    PAGE_CLASSIFY_MIN_BODY_EXCERPT_CHARS,
} from '@/lib/llm/page-classification';
import { getAnthropicKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { maybeAutoFillProjectClassificationFromDomainScan } from '@/lib/project-industry-auto';

const CLASSIFY_DELAY_MS = 150;

export type RunDomainScanPageClassificationJobOptions = {
    domainScanId: string;
    userId: string;
};

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifies each scan row with sufficient body excerpt; updates DB and refreshes domain payload.
 * Intended to be fire-and-forget from callers; logs errors and does not rethrow.
 */
export async function runDomainScanPageClassificationJob(
    opts: RunDomainScanPageClassificationJobOptions,
): Promise<void> {
    const { domainScanId, userId } = opts;
    try {
        if (!getAnthropicKey()) {
            console.error('[CHECKION] domain page classification: ANTHROPIC_API_KEY missing');
            return;
        }

        const pages = await listScansByGroupId(userId, domainScanId);
        const toClassify = pages.filter(
            (p) => (p.bodyTextExcerpt ?? '').trim().length >= PAGE_CLASSIFY_MIN_BODY_EXCERPT_CHARS,
        );

        for (let i = 0; i < toClassify.length; i++) {
            const result = toClassify[i];
            try {
                const outcome = await classifyPageWithLlm(result);
                if (outcome.classification) {
                    await updateScanResult(result.id, userId, {
                        pageClassification: outcome.classification,
                    });
                    try {
                        if (
                            outcome.usage &&
                            (outcome.usage.input_tokens > 0 || outcome.usage.output_tokens > 0)
                        ) {
                            reportUsage({
                                userId,
                                eventType: 'llm_request',
                                rawUnits: {
                                    input_tokens: outcome.usage.input_tokens,
                                    output_tokens: outcome.usage.output_tokens,
                                },
                                idempotencyKey: `classify:${result.id}`,
                            });
                        }
                    } catch {
                        /* ignore */
                    }
                }
            } catch (e) {
                console.error(`[CHECKION] domain page classification: page ${result.id} failed`, e);
            }
            if (i < toClassify.length - 1) await delay(CLASSIFY_DELAY_MS);
        }

        await refreshDomainPayloadFromScans(domainScanId, userId);
        void maybeAutoFillProjectClassificationFromDomainScan({ userId, domainScanId });
    } catch (e) {
        console.error('[CHECKION] domain page classification job', domainScanId, e);
    }
}
