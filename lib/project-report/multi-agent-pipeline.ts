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
    buildExecutiveSummaryFromSections,
    sanitizeNarrativeRaw,
    sanitizeSectionRaw,
} from '@/lib/project-report/narrative-sanitize';
import type { ProjectReportNarrative, SectionAnalysis } from '@/lib/project-report/narrative-schema';
import type {
    DomainFacts,
    ProjectReportBundle,
    ProjectReportDeepAnalysis,
    ProjectReportLocale,
} from '@/lib/project-report/types';
import type { ReportProgress } from '@/lib/project-report/progress';

export type ProgressCallback = (progress: ReportProgress) => Promise<void>;

const MAX_PAYLOAD_CHARS = 14_000;
const SECTION_AGENT_RETRIES = 1;

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
Use only evidenceIds from the provided evidenceIds list when citing evidence.
Do not invent metrics. Be specific and cite numbers from the input.
Always return non-empty "title", "summary", "keyFindings" (array), and "metricsHighlighted" (array) for section analyses.`;
}

function slimDomainForAgent(domain: DomainFacts | null) {
    if (!domain) return null;
    return {
        wcagScore: domain.wcagScore,
        seoOnPageScore: domain.seoOnPageScore,
        seoOnPageLabel: domain.seoOnPageLabel,
        score: domain.score,
        totalPageCount: domain.totalPageCount,
        issueStats: domain.issueStats,
        performance: domain.performance,
        eco: domain.eco,
        systemicIssues: domain.systemicIssues.slice(0, 8).map((i) => ({
            title: i.title,
            count: i.count,
            evidenceId: i.evidenceId,
        })),
        topThemes: domain.pageClassification?.topThemes?.slice(0, 8).map((t) => ({
            tag: t.tag,
            score: t.score,
            pageCount: t.pageCount,
            maxTier: t.maxTier,
        })),
        llmSummary: domain.llmSummary?.summary?.slice(0, 500) ?? null,
    };
}

function stringifyPayload(payload: unknown): string {
    let json = JSON.stringify(payload, null, 0);
    if (json.length <= MAX_PAYLOAD_CHARS) return json;
    json = JSON.stringify(
        {
            ...((payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>),
            _truncated: true,
            _note: 'Payload trimmed for token limits; use summarized fields only.',
        },
        null,
        0
    );
    return json.length <= MAX_PAYLOAD_CHARS ? json : json.slice(0, MAX_PAYLOAD_CHARS);
}

async function callOpenAiJson(openai: OpenAI, system: string, user: string): Promise<string> {
    const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content ?? '{}';
}

async function callSectionAgent(
    openai: OpenAI,
    locale: ProjectReportLocale,
    role: string,
    instruction: string,
    payload: unknown,
    titleFallback: string
): Promise<SectionAnalysis> {
    const userContent = `${instruction}

Return JSON exactly:
{ "title": "section title", "summary": "2-4 paragraphs", "keyFindings": ["..."], "metricsHighlighted": ["metric labels"] }

Data:
${stringifyPayload(payload)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= SECTION_AGENT_RETRIES; attempt++) {
        try {
            const raw = await callOpenAiJson(openai, systemPrompt(locale, role), userContent);
            const parsed = JSON.parse(extractJson(raw));
            return sanitizeSectionRaw(parsed, titleFallback);
        } catch (e) {
            lastError = e;
            console.warn(
                `[CHECKION] section agent "${role}" attempt ${attempt + 1} failed:`,
                e instanceof Error ? e.message : e
            );
        }
    }
    console.error(`[CHECKION] section agent "${role}" failed after retries:`, lastError);
    return sanitizeSectionRaw(
        {
            title: titleFallback,
            summary:
                locale === 'de'
                    ? 'Diese Bereichs-Analyse konnte nicht erzeugt werden. Nutze die Metriken und Tabellen im Report.'
                    : 'This section analysis could not be generated. Use the metrics and tables in the report.',
            keyFindings: [],
            metricsHighlighted: [],
        },
        titleFallback
    );
}

function defaultFallbackEvidenceId(evidenceIds: string[]): string {
    return (
        evidenceIds.find((id) => id.startsWith('ev-wcag')) ??
        evidenceIds.find((id) => id.startsWith('ev-domain')) ??
        evidenceIds[0] ??
        'ev-wcag-score'
    );
}

function hasAnySection(sections: ProjectReportDeepAnalysis['sections']): boolean {
    return Object.values(sections).some((s) => s != null && s.summary.trim().length > 0);
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
    const validEvidence = new Set(evidenceIds);
    const fallbackEvidenceId = defaultFallbackEvidenceId(evidenceIds);

    await progress('agent_site_quality');
    deep.sections.siteQuality = await callSectionAgent(
        openai,
        options.locale,
        'WCAG, UX and site quality',
        'Analyze WCAG scores, systemic issues, performance, eco, and domain LLM summary themes.',
        {
            domain: slimDomainForAgent(facts.domain),
            metrics: deep.metrics.filter((m) => ['wcag', 'performance', 'eco'].includes(m.pillar)),
            issueGroups: deep.issueGroups.slice(0, 10),
            evidenceIds: evidenceIds.slice(0, 40),
        },
        options.locale === 'de' ? 'Site Quality & WCAG' : 'Site Quality & WCAG'
    );

    await progress('agent_seo');
    deep.sections.seoRankings = await callSectionAgent(
        openai,
        options.locale,
        'SEO and rank tracking',
        'Analyze SEO on-page score, keyword positions, trends, SERP leaders, competitor ranking scores.',
        {
            domain: facts.domain
                ? {
                      seoOnPageScore: facts.domain.seoOnPageScore,
                      seoOnPageLabel: facts.domain.seoOnPageLabel,
                  }
                : null,
            rankings: facts.rankings
                ? {
                      score: facts.rankings.score,
                      keywordCount: facts.rankings.keywordCount,
                      topKeywords: facts.rankings.topKeywords.slice(0, 10),
                      competitorScores: facts.rankings.competitorScores,
                  }
                : null,
            rankKeywordDetails: deep.rankKeywordDetails.slice(0, 12).map((k) => ({
                keyword: k.keyword,
                position: k.position,
                positionDelta: k.positionDelta,
                serpLeaderDomain: k.serpLeaderDomain,
            })),
            seoRollup: deep.seoRollup,
            evidenceIds: evidenceIds.slice(0, 40),
        },
        options.locale === 'de' ? 'SEO & Rankings' : 'SEO & Rankings'
    );

    await progress('agent_geo');
    deep.sections.geo = await callSectionAgent(
        openai,
        options.locale,
        'GEO, E-E-A-T and AI visibility',
        'Analyze GEO competitive score, recommendations, per-page E-E-A-T, GEO question history trends.',
        {
            geo: facts.geo
                ? {
                      score: facts.geo.score,
                      recommendations: facts.geo.recommendations.slice(0, 6),
                      competitiveDomains: facts.geo.competitiveDomains.slice(0, 8),
                  }
                : null,
            geoPages: deep.geoPages.slice(0, 8),
            geoQuestionHistory: deep.geoQuestionHistory.slice(0, 8),
            evidenceIds: evidenceIds.slice(0, 40),
        },
        options.locale === 'de' ? 'GEO & E-E-A-T' : 'GEO & E-E-A-T'
    );

    await progress('agent_competitive');
    const competitivePayload = buildCompetitiveAgentPayload(facts, deep.competitiveBenchmark);
    deep.sections.competitive = await callSectionAgent(
        openai,
        options.locale,
        'competitive intelligence',
        `Compare own domain vs deep-scanned competitors using scoreboard, topic overlap, and deterministic insights.
Highlight WCAG/SEO/performance/eco deltas, ranking & GEO scores, shared vs unique page topics, and competitor summaries.`,
        {
            ...competitivePayload,
            evidenceIds: evidenceIds.slice(0, 40),
        },
        options.locale === 'de' ? 'Wettbewerbsvergleich' : 'Competitive landscape'
    );

    if (facts.journey) {
        await progress('agent_journey');
        deep.sections.journey = await callSectionAgent(
            openai,
            options.locale,
            'UX journey',
            'Summarize the latest UX journey agent run and UX implications.',
            { journey: facts.journey, evidenceIds: evidenceIds.slice(0, 20) },
            options.locale === 'de' ? 'UX Journey' : 'UX Journey'
        );
    }

    await progress('agent_synthesizer');

    let narrative: ProjectReportNarrative;
    let synthesizerOk = false;

    try {
        const synthesizerPayload = {
            project: {
                name: facts.project.name,
                domain: facts.project.domain,
                industry: facts.project.industry,
            },
            scores: {
                wcag: facts.domain?.wcagScore,
                seo: facts.domain?.seoOnPageScore,
                geo: facts.geo?.score,
                rankings: facts.rankings?.score,
            },
            sections: deep.sections,
            metrics: deep.metrics.slice(0, 24).map((m) => ({
                label: m.label,
                value: m.value,
                pillar: m.pillar,
            })),
            competitiveInsights: deep.competitiveBenchmark?.deterministicInsights?.slice(0, 8) ?? [],
            evidenceIds: evidenceIds.slice(0, 50),
        };

        const raw = await callOpenAiJson(
            openai,
            systemPrompt(options.locale, 'executive editor'),
            `Synthesize executive narrative from specialist section analyses.
Return JSON:
{
  "executiveSummary": "3-4 paragraphs",
  "competitiveLandscape": "1-2 paragraphs",
  "findings": [{ "title": "", "description": "", "severity": "low|medium|high", "evidenceIds": ["ev-..."] }],
  "recommendations": [{ "title": "", "description": "", "priority": 1, "category": "", "evidenceIds": ["ev-..."] }],
  "riskAmpel": { "wcag": "low|medium|high|unknown", "geo": "...", "rankings": "..." }
}
Each finding and recommendation MUST include at least one evidenceId from evidenceIds. Max 12 findings, max 8 recommendations.

Input:
${stringifyPayload(synthesizerPayload)}`
        );

        const parsed = JSON.parse(extractJson(raw));
        const sanitized = sanitizeNarrativeRaw(parsed, validEvidence, fallbackEvidenceId);
        narrative = validateNarrativeEvidence(
            {
                ...sanitized,
                sections: sectionsForNarrative(deep.sections),
                modelUsed: OPENAI_MODEL,
                generatedAt: new Date().toISOString(),
                synthesisAvailable: true,
            },
            facts.provenance
        );
        synthesizerOk = true;
    } catch (e) {
        console.error('[CHECKION] comprehensive synthesizer error:', e);
        const partialSummary = buildExecutiveSummaryFromSections(deep.sections, options.locale);
        const findingsFromBenchmark =
            deep.competitiveBenchmark?.deterministicInsights.map((ins) => ({
                title: ins.title,
                description: ins.description,
                severity: ins.kind === 'gap' || ins.kind === 'topic_gap' ? ('medium' as const) : ('low' as const),
                evidenceIds: validEvidence.has(ins.evidenceId)
                    ? [ins.evidenceId]
                    : [fallbackEvidenceId],
            })) ?? [];

        narrative = validateNarrativeEvidence(
            {
                executiveSummary: partialSummary,
                competitiveLandscape: deep.sections.competitive?.summary,
                findings: findingsFromBenchmark.slice(0, 12),
                recommendations: [],
                riskAmpel: {
                    wcag:
                        (facts.domain?.wcagScore ?? 0) >= 80
                            ? 'low'
                            : (facts.domain?.wcagScore ?? 0) >= 60
                              ? 'medium'
                              : 'high',
                    geo:
                        facts.geo?.score == null
                            ? 'unknown'
                            : facts.geo.score >= 70
                              ? 'low'
                              : facts.geo.score >= 50
                                ? 'medium'
                                : 'high',
                    rankings:
                        facts.rankings?.score == null
                            ? 'unknown'
                            : facts.rankings.score >= 70
                              ? 'low'
                              : facts.rankings.score >= 50
                                ? 'medium'
                                : 'high',
                },
                sections: sectionsForNarrative(deep.sections),
                modelUsed: OPENAI_MODEL,
                generatedAt: new Date().toISOString(),
                synthesisAvailable: hasAnySection(deep.sections),
            },
            facts.provenance
        );
    }

    try {
        reportUsage({
            userId: options.userId,
            eventType: 'project_report_synthesis',
            rawUnits: {
                projectId: options.projectId,
                runId: options.runId,
                variant: 'comprehensive',
                agentCalls: facts.journey ? 6 : 5,
                synthesizerOk,
            },
            idempotencyKey: `project_report_comprehensive:${options.runId}`,
        });
    } catch (usageErr) {
        console.warn('[CHECKION] project report usage report failed:', usageErr);
    }

    return { narrative, deep };
}
