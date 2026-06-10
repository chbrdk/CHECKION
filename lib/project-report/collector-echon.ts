/**
 * Run ECHON market research during comprehensive report generation (persona-driven query).
 */

import type { AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import type { EchonResearchPollAttempt } from '@/lib/integrations/echon-research-poll';
import { fetchEchonMarketContext, runEchonReportResearch } from '@/lib/integrations/echon-research-client';
import type { EchonMarketContext } from '@/lib/project-report/echon-market-context';
import { emptyEchonMarketContext } from '@/lib/project-report/echon-market-context';
import { buildEchonReportResearchQuery } from '@/lib/project-report/echon-research-query';
import type {
    AudienceReportOverlay,
    ProjectReportBundle,
    ProjectReportLocale,
} from '@/lib/project-report/types';

export interface RunEchonMarketResearchOptions {
    locale: ProjectReportLocale;
    skipLlm?: boolean;
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>;
    audience: AudienceReportOverlay;
    sourcePersonas: AudionPersonaFact[];
    /** Fallback when live research fails */
    pinnedThreadId?: string | null;
    /** Called on each GET /threads poll while ECHON research runs */
    onResearchPoll?: (attempt: EchonResearchPollAttempt) => void | Promise<void>;
}

export async function runEchonMarketResearchForReport(
    options: RunEchonMarketResearchOptions
): Promise<EchonMarketContext> {
    if (options.skipLlm) {
        return emptyEchonMarketContext('echon_skipped');
    }

    const query = buildEchonReportResearchQuery({
        locale: options.locale,
        project: options.facts.project,
        setup: options.facts.setup,
        audience: options.audience,
        sourcePersonas: options.sourcePersonas,
    });

    let ctx = await runEchonReportResearch(query, { onPoll: options.onResearchPoll });
    if (!ctx.available && options.pinnedThreadId?.trim()) {
        ctx = await fetchEchonMarketContext(options.pinnedThreadId);
        if (ctx.available) {
            return { ...ctx, reason: undefined };
        }
    }
    return ctx;
}

/** @deprecated Use runEchonMarketResearchForReport */
export async function collectEchonMarketContext(
    echonResearchThreadId: string | null | undefined
): Promise<EchonMarketContext> {
    const threadId = (echonResearchThreadId ?? '').trim();
    if (!threadId) {
        return emptyEchonMarketContext('echon_thread_not_linked');
    }
    return fetchEchonMarketContext(threadId);
}
