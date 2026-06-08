/**
 * Multi-agent synthesis for comprehensive project reports.
 * Specialist agents per pillar → synthesizer → evidence QA.
 */

import OpenAI from 'openai';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { validateNarrativeEvidence } from '@/lib/project-report/agent-qa';
import { buildCompetitiveAgentPayload } from '@/lib/project-report/competitive-analysis';
import { synthesizeProjectReportNarrative } from '@/lib/project-report/agent-pipeline';
import {
    PLACEHOLDER_NARRATIVE,
    ProjectReportNarrativeSchema,
    SectionAnalysisSchema,
    type ProjectReportNarrative,
    type SectionAnalysis,
} from '@/lib/project-report/narrative-schema';
import type {
    ProjectReportBundle,
    ProjectReportDeepAnalysis,
    ProjectReportLocale,
} from '@/lib/project-report/types';
import type { ReportProgress } from '@/lib/project-report/progress';

export type ProgressCallback = (progress: ReportProgress) => Promise<void>;

function sectionsForNarrative(
    sections: ProjectReportDeepAnalysis['sections']
): ProjectReportNarrative['sections'] {
    return {
        siteQuality: sections.siteQuality ?? undefined,
        seoRankings: sections.seoRankings ?? undefined,
        geo: sections.geo ?? undefined,
        competitive: sections.competitive ?? undefined,
        journey: sections.journey ?? undefined,
    };
}

function extractJson(content: string): string {
    const trimmed = content.trim();
    const block = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (block) return block[1].trim();
    return trimmed;
}

function systemPrompt(locale: ProjectReportLocale, role: string): string {
    const lang = locale === 'de' ? 'German' : 'English';
    return `You are a ${role} analyst for CHECKION comprehensive project reports.
Respond in ${lang}. Output valid JSON only.
Reference only evidenceIds provided. Do not invent metrics.
Be specific, actionable, and cite numbers from the input.`;
}

async function callSectionAgent(
    openai: OpenAI,
    locale: ProjectReportLocale,
    role: string,
    instruction: string,
    payload: unknown
): Promise<SectionAnalysis> {
    const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt(locale, role) },
            {
                role: 'user',
                content: `${instruction}\n\nReturn JSON: { "title": "", "summary": "2-4 paragraphs", "keyFindings": ["..."], "metricsHighlighted": ["metric labels"] }\n\nData:\n${JSON.stringify(payload, null, 0)}`,
            },
        ],
        response_format: { type: 'json_object' },
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    return SectionAnalysisSchema.parse(JSON.parse(extractJson(raw)));
}

export async function synthesizeComprehensiveReport(
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative'>,
    deep: ProjectReportDeepAnalysis,
    options: {
        userId: string;
        projectId: string;
        runId: string;
        skipLlm?: boolean;
        onProgress?: ProgressCallback;
        locale: ProjectReportLocale;
    }
): Promise<{ narrative: ProjectReportNarrative; deep: ProjectReportDeepAnalysis }> {
    if (options.skipLlm) {
        const narrative = await synthesizeProjectReportNarrative(facts, {
            ...options,
            skipLlm: true,
        });
        return { narrative, deep };
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        const narrative = await synthesizeProjectReportNarrative(facts, {
            ...options,
            skipLlm: true,
        });
        return { narrative, deep };
    }

    const { STAGE_LABELS, makeReportProgress } = await import('@/lib/project-report/progress');
    const progress = async (stage: keyof typeof STAGE_LABELS) => {
        if (options.onProgress) {
            const labels = STAGE_LABELS[stage];
            await options.onProgress(
                makeReportProgress(stage, labels.de, labels.en, options.locale)
            );
        }
    };

    const evidenceIds = facts.provenance.map((p) => p.evidenceId);

    try {
        await progress('agent_site_quality');
        deep.sections.siteQuality = await callSectionAgent(
            openai,
            options.locale,
            'WCAG, UX and site quality',
            'Analyze WCAG scores, systemic issues, performance, eco, and domain LLM summary themes.',
            {
                domain: facts.domain,
                metrics: deep.metrics.filter((m) =>
                    ['wcag', 'performance', 'eco'].includes(m.pillar)
                ),
                issueGroups: deep.issueGroups.slice(0, 10),
                evidenceIds,
            }
        );

        await progress('agent_seo');
        deep.sections.seoRankings = await callSectionAgent(
            openai,
            options.locale,
            'SEO and rank tracking',
            'Analyze SEO on-page score, keyword positions, trends, SERP leaders, competitor ranking scores.',
            {
                domain: facts.domain
                    ? { seoOnPageScore: facts.domain.seoOnPageScore, seoOnPageLabel: facts.domain.seoOnPageLabel }
                    : null,
                rankings: facts.rankings,
                rankKeywordDetails: deep.rankKeywordDetails.slice(0, 15),
                seoRollup: deep.seoRollup,
                evidenceIds,
            }
        );

        await progress('agent_geo');
        deep.sections.geo = await callSectionAgent(
            openai,
            options.locale,
            'GEO, E-E-A-T and AI visibility',
            'Analyze GEO competitive score, recommendations, per-page E-E-A-T, GEO question history trends.',
            {
                geo: facts.geo,
                geoPages: deep.geoPages,
                geoQuestionHistory: deep.geoQuestionHistory,
                evidenceIds,
            }
        );

        await progress('agent_competitive');
        const competitivePayload = buildCompetitiveAgentPayload(
            facts,
            deep.competitiveBenchmark
        );
        deep.sections.competitive = await callSectionAgent(
            openai,
            options.locale,
            'competitive intelligence',
            `Compare own domain vs deep-scanned competitors using the scoreboard, topic overlap matrix, and deterministic insights.
Highlight: WCAG/SEO/performance/eco deltas, ranking & GEO scores, shared vs unique page topics (content pillars), systemic issue differences, and competitor LLM summaries.
Call out concrete gaps and leads. Reference evidenceIds where applicable.`,
            {
                ...competitivePayload,
                evidenceIds,
            }
        );

        if (facts.journey) {
            await progress('agent_journey');
            deep.sections.journey = await callSectionAgent(
                openai,
                options.locale,
                'UX journey',
                'Summarize the latest UX journey agent run and UX implications.',
                { journey: facts.journey, evidenceIds }
            );
        }

        await progress('agent_synthesizer');
        const synthesizerPayload = {
            project: facts.project,
            scores: {
                wcag: facts.domain?.wcagScore,
                seo: facts.domain?.seoOnPageScore,
                geo: facts.geo?.score,
                rankings: facts.rankings?.score,
            },
            sections: deep.sections,
            metrics: deep.metrics,
            evidenceIds,
        };

        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt(options.locale, 'executive editor'),
                },
                {
                    role: 'user',
                    content: `Synthesize executive narrative from specialist section analyses.
Return JSON:
{
  "executiveSummary": "3-4 paragraphs",
  "competitiveLandscape": "1-2 paragraphs",
  "findings": [{ "title": "", "description": "", "severity": "low|medium|high", "evidenceIds": [] }],
  "recommendations": [{ "title": "", "description": "", "priority": 1-5, "category": "", "evidenceIds": [] }],
  "riskAmpel": { "wcag": "...", "geo": "...", "rankings": "..." }
}
Max 12 findings, max 8 recommendations. Priority 1 = highest.

Input:
${JSON.stringify(synthesizerPayload, null, 0)}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(extractJson(raw));
        const validated = ProjectReportNarrativeSchema.parse({
            ...parsed,
            sections: sectionsForNarrative(deep.sections),
            modelUsed: OPENAI_MODEL,
            generatedAt: new Date().toISOString(),
            synthesisAvailable: true,
        });
        const narrative = validateNarrativeEvidence(validated, facts.provenance);

        reportUsage({
            userId: options.userId,
            eventType: 'project_report_synthesis',
            rawUnits: {
                projectId: options.projectId,
                runId: options.runId,
                variant: 'comprehensive',
                agentCalls: facts.journey ? 6 : 5,
            },
            idempotencyKey: `project_report_comprehensive:${options.runId}`,
        });

        return { narrative, deep };
    } catch (e) {
        console.error('[CHECKION] comprehensive report synthesis error:', e);
        return {
            narrative: {
                ...PLACEHOLDER_NARRATIVE,
                executiveSummary:
                    options.locale === 'de'
                        ? 'Umfassende LLM-Synthese fehlgeschlagen. Metriken und Tabellen sind vollständig.'
                        : 'Comprehensive LLM synthesis failed. Metrics and tables are complete.',
                synthesisAvailable: false,
                sections: sectionsForNarrative(deep.sections),
            },
            deep,
        };
    }
}
