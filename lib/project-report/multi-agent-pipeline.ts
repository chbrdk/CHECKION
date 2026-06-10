/**
 * Multi-agent synthesis for comprehensive project reports.
 * Specialist agents per pillar → synthesizer → evidence QA.
 */

import OpenAI from 'openai';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { validateNarrativeEvidence } from '@/lib/project-report/agent-qa';
import { buildCompetitiveAgentPayload } from '@/lib/project-report/competitive-analysis';
import { buildGeoAgentPayload } from '@/lib/project-report/geo-deep-analysis';
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
import { slimProjectSetupForAgent } from '@/lib/project-report/project-setup-context';
import { slimEchonMarketForAgent } from '@/lib/project-report/echon-market-context';

export type ProgressCallback = (progress: ReportProgress) => Promise<void>;

const MAX_PAYLOAD_CHARS = 14_000;
const SECTION_AGENT_RETRIES = 1;
/** Per-agent OpenAI call timeout (comprehensive report runs several in sequence). */
const OPENAI_AGENT_TIMEOUT_MS = 180_000;

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
Always return non-empty "title", "summary", "keyFindings" (array), and "metricsHighlighted" (array) for section analyses.
For site quality sections also return "metricInterpretations" with plain-language explanations for non-experts.`;
}

function slimDomainForAgent(domain: DomainFacts | null) {
    if (!domain) return null;
    return {
        domainScore: domain.score,
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

async function callSiteQualitySectionAgent(
    openai: OpenAI,
    locale: ProjectReportLocale,
    payload: unknown,
    titleFallback: string
): Promise<SectionAnalysis> {
    const lang = locale === 'de' ? 'German' : 'English';
    const userContent = `Analyze domain score (UX), WCAG errors/warnings, performance (TTFB/FCP/LCP), eco/CO₂, and systemic issues.
Explain each metric so a non-technical reader understands severity and business impact.
Describe systemic issues as recurring patterns across many pages (not one-off bugs).

Return JSON exactly:
{
  "title": "section title",
  "summary": "2-3 short paragraphs — overall site quality assessment",
  "keyFindings": ["..."],
  "metricsHighlighted": ["metric labels"],
  "metricInterpretations": {
    "domainScore": "1-2 sentences",
    "wcagErrors": "1-2 sentences on errors/warnings and accessibility impact",
    "performance": "1-2 sentences on TTFB/FCP/LCP and user/SEO impact",
    "eco": "1-2 sentences on CO₂ / sustainability (omit if no eco data)",
    "systemicIssues": "1-2 sentences explaining what systemic issues mean for this site"
  }
}

Respond in ${lang}. Use numbers from the data.

Data:
${stringifyPayload(payload)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= SECTION_AGENT_RETRIES; attempt++) {
        try {
            const raw = await callOpenAiJson(
                openai,
                systemPrompt(locale, 'UX domain score and site quality'),
                userContent
            );
            const parsed = JSON.parse(extractJson(raw));
            return sanitizeSectionRaw(parsed, titleFallback);
        } catch (e) {
            lastError = e;
            console.warn(
                `[CHECKION] site quality agent attempt ${attempt + 1} failed:`,
                e instanceof Error ? e.message : e
            );
        }
    }
    console.error('[CHECKION] site quality agent failed after retries:', lastError);
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

async function callSeoSectionAgent(
    openai: OpenAI,
    locale: ProjectReportLocale,
    payload: unknown,
    titleFallback: string
): Promise<SectionAnalysis> {
    const lang = locale === 'de' ? 'German' : 'English';
    const userContent = `Analyze SEO in TWO separate parts — do not mix on-page scan quality with SERP keyword positions:
1) On-page SEO from domain scan (meta, titles, headings, technical basics)
2) SERP keyword rankings (tracked positions, SERP leaders, trends)

Return JSON exactly:
{
  "title": "section title",
  "summary": "2-3 short paragraphs — keep on-page and SERP rankings clearly separated",
  "keyFindings": ["..."],
  "metricsHighlighted": ["metric labels"],
  "metricInterpretations": {
    "seoOnPage": "1-2 sentences on on-page score and label only — no keyword positions",
    "seoOnPageOverview": "2-3 sentences on on-page SEO health only (omit if redundant with seoOnPage)",
    "serpRankingsOverview": "2-3 sentences on tracked keywords, ranking score, and SERP visibility only — no meta/title discussion",
    "rankTrend": "1-2 sentences on rank trends over time (omit if no trend data)",
    "serpCompetition": "2-3 sentences on SERP leaders vs own positions for the keyword table (omit if no SERP data)"
  }
}

Respond in ${lang}. Use numbers from the data.

Data:
${stringifyPayload(payload)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= SECTION_AGENT_RETRIES; attempt++) {
        try {
            const raw = await callOpenAiJson(
                openai,
                systemPrompt(locale, 'SEO and rank tracking'),
                userContent
            );
            const parsed = JSON.parse(extractJson(raw));
            return sanitizeSectionRaw(parsed, titleFallback);
        } catch (e) {
            lastError = e;
            console.warn(
                `[CHECKION] SEO agent attempt ${attempt + 1} failed:`,
                e instanceof Error ? e.message : e
            );
        }
    }
    console.error('[CHECKION] SEO agent failed after retries:', lastError);
    return sanitizeSectionRaw(
        {
            title: titleFallback,
            summary:
                locale === 'de'
                    ? 'Diese SEO-Analyse konnte nicht erzeugt werden. Nutze die Metriken und Tabellen im Report.'
                    : 'This SEO analysis could not be generated. Use the metrics and tables in the report.',
            keyFindings: [],
            metricsHighlighted: [],
        },
        titleFallback
    );
}

async function callGeoSectionAgent(
    openai: OpenAI,
    locale: ProjectReportLocale,
    payload: unknown,
    titleFallback: string
): Promise<SectionAnalysis> {
    const lang = locale === 'de' ? 'German' : 'English';
    const userContent = `Produce a thorough GEO / E-E-A-T analysis for non-technical readers.
Cover: overall GEO score, LLM model visibility, GEO test questions & citations, on-page GEO/E-E-A-T, competitive comparison, and insights.

Return JSON exactly:
{
  "title": "section title",
  "summary": "2-3 short paragraphs — overall GEO & E-E-A-T assessment",
  "keyFindings": ["concrete bullets per question/model/page where possible"],
  "metricsHighlighted": ["metric labels"],
  "metricInterpretations": {
    "geoScore": "1-2 sentences on overall GEO score",
    "llmVisibility": "1-2 sentences on LLM model visibility (omit if no model data)",
    "geoQuestions": "1-2 sentences on test questions and citation rate",
    "geoOnPageEeat": "1-2 sentences on on-page GEO fitness and trust (omit if no page data)",
    "geoCompetitive": "2-3 sentences on competitive GEO comparison — mention score, share of voice, and average citation position per domain",
    "geoInsights": "1-2 sentences explaining what the detected GEO patterns mean"
  }
}

Respond in ${lang}. Use numbers from the data. Reference evidenceIds where possible.

Data:
${stringifyPayload(payload)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= SECTION_AGENT_RETRIES; attempt++) {
        try {
            const raw = await callOpenAiJson(
                openai,
                systemPrompt(locale, 'GEO, E-E-A-T and AI visibility'),
                userContent
            );
            const parsed = JSON.parse(extractJson(raw));
            return sanitizeSectionRaw(parsed, titleFallback);
        } catch (e) {
            lastError = e;
            console.warn(
                `[CHECKION] GEO agent attempt ${attempt + 1} failed:`,
                e instanceof Error ? e.message : e
            );
        }
    }
    console.error('[CHECKION] GEO agent failed after retries:', lastError);
    return sanitizeSectionRaw(
        {
            title: titleFallback,
            summary:
                locale === 'de'
                    ? 'Diese GEO-Analyse konnte nicht erzeugt werden. Nutze die Metriken und Tabellen im Report.'
                    : 'This GEO analysis could not be generated. Use the metrics and tables in the report.',
            keyFindings: [],
            metricsHighlighted: [],
        },
        titleFallback
    );
}

function competitiveInsightInterpretationInstructions(payload: unknown): string {
    const benchmark = (payload as { benchmark?: { deterministicInsights?: Array<{ id: string; title: string; kind: string }> } })
        ?.benchmark;
    const insights = benchmark?.deterministicInsights ?? [];
    if (insights.length === 0) {
        return '"insightsOverview": "omit if no deterministic insights"';
    }
    const perInsight = insights
        .map(
            (ins) =>
                `    "insight:${ins.id}": "1-2 unique sentences for THIS insight only — business impact for [${ins.kind}] ${ins.title}; do not reuse text across insights"`
        )
        .join(',\n');
    return `"insightsOverview": "1-2 sentences introducing the insight cards below",
${perInsight}`;
}

async function callCompetitiveSectionAgent(
    openai: OpenAI,
    locale: ProjectReportLocale,
    payload: unknown,
    titleFallback: string
): Promise<SectionAnalysis> {
    const lang = locale === 'de' ? 'German' : 'English';
    const insightBlock = competitiveInsightInterpretationInstructions(payload);
    const userContent = `Compare own domain vs deep-scanned competitors using the scoreboard (UX, SEO, GEO, ranking, WCAG errors, LCP), topic overlap gaps/leads, and deterministic insights.
Explain what the tables mean for non-technical stakeholders — where you lead, where competitors win, and what to prioritize.
For EACH item in benchmark.deterministicInsights, write a short interpretation in metricInterpretations keyed as "insight:<id>".

Return JSON exactly:
{
  "title": "section title",
  "summary": "2-3 short paragraphs — overall competitive position",
  "keyFindings": ["concrete bullets with numbers — one per major insight where possible"],
  "metricsHighlighted": ["metric labels"],
  "metricInterpretations": {
    "competitiveOverview": "2-3 sentences on overall rank, theme gaps, and strategic picture",
    "scoreboard": "2-3 sentences explaining the multi-pillar scoreboard — highlight biggest WCAG/SEO/GEO/LCP gaps vs leaders",
    "topicOverlap": "2-3 sentences on content theme gaps vs unique own themes",
${insightBlock}
  }
}

Respond in ${lang}. Use numbers from the data. Do not include raw evidenceIds in prose.

Data:
${stringifyPayload(payload)}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= SECTION_AGENT_RETRIES; attempt++) {
        try {
            const raw = await callOpenAiJson(
                openai,
                systemPrompt(locale, 'competitive intelligence'),
                userContent
            );
            const parsed = JSON.parse(extractJson(raw));
            return sanitizeSectionRaw(parsed, titleFallback);
        } catch (e) {
            lastError = e;
            console.warn(
                `[CHECKION] competitive agent attempt ${attempt + 1} failed:`,
                e instanceof Error ? e.message : e
            );
        }
    }
    console.error('[CHECKION] competitive agent failed after retries:', lastError);
    return sanitizeSectionRaw(
        {
            title: titleFallback,
            summary:
                locale === 'de'
                    ? 'Diese Wettbewerbs-Analyse konnte nicht erzeugt werden. Nutze die Tabellen im Report.'
                    : 'This competitive analysis could not be generated. Use the tables in the report.',
            keyFindings: [],
            metricsHighlighted: [],
        },
        titleFallback
    );
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
        openai = new OpenAI({ apiKey: getOpenAIKey(), timeout: OPENAI_AGENT_TIMEOUT_MS });
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
    const projectSetup = slimProjectSetupForAgent(facts.setup);
    const marketContext = slimEchonMarketForAgent(facts.marketContext);

    await progress('agent_site_quality');
    deep.sections.siteQuality = await callSiteQualitySectionAgent(
        openai,
        options.locale,
        {
            domain: slimDomainForAgent(facts.domain),
            metrics: deep.metrics.filter((m) => ['wcag', 'performance', 'eco'].includes(m.pillar)),
            issueGroups: deep.issueGroups.slice(0, 10),
            evidenceIds: evidenceIds.slice(0, 40),
        },
        options.locale === 'de' ? 'Site Quality & UX' : 'Site Quality & UX'
    );

    await progress('agent_seo');
    deep.sections.seoRankings = await callSeoSectionAgent(
        openai,
        options.locale,
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
            rankTrends: facts.rankTrends?.slice(0, 8).map((s) => ({
                keyword: s.keyword,
                points: s.points.slice(-6),
            })),
            rankKeywordDetails: deep.rankKeywordDetails.slice(0, 12).map((k) => ({
                keyword: k.keyword,
                position: k.position,
                positionDelta: k.positionDelta,
                serpLeaderDomain: k.serpLeaderDomain,
            })),
            seoRollup: deep.seoRollup,
            projectSetup,
            evidenceIds: evidenceIds.slice(0, 40),
        },
        options.locale === 'de' ? 'SEO & Rankings' : 'SEO & Rankings'
    );

    await progress('agent_geo');
    const geoAgentPayload = buildGeoAgentPayload(
        facts.geo
            ? {
                  score: facts.geo.score,
                  recommendations: facts.geo.recommendations,
                  competitiveDomains: facts.geo.competitiveDomains.map((d) => ({
                      domain: d.domain,
                      score: d.score,
                      avgPosition: d.avgPosition,
                      shareOfVoice: d.shareOfVoice,
                  })),
              }
            : null,
        deep.geoDeep
    );
    deep.sections.geo = await callGeoSectionAgent(
        openai,
        options.locale,
        {
            ...geoAgentPayload,
            projectSetup,
            evidenceIds: evidenceIds.slice(0, 60),
        },
        options.locale === 'de' ? 'GEO & E-E-A-T' : 'GEO & E-E-A-T'
    );

    await progress('agent_competitive');
    const competitivePayload = buildCompetitiveAgentPayload(facts, deep.competitiveBenchmark);
    deep.sections.competitive = await callCompetitiveSectionAgent(
        openai,
        options.locale,
        {
            ...competitivePayload,
            projectSetup,
            marketContext,
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
                valueProposition: facts.project.valueProposition,
            },
            projectSetup,
            marketContext,
            scores: {
                domainScore: facts.domain?.score,
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
Do NOT repeat the executiveSummary in findings — max 4 findings, each with a distinct angle not already in executiveSummary.
Each finding and recommendation MUST include at least one evidenceId from evidenceIds. Max 6 recommendations — each must be a concrete action, not a restatement of findings.

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
                findings: findingsFromBenchmark.slice(0, 4),
                recommendations: [],
                riskAmpel: {
                    wcag:
                        (facts.domain?.score ?? 0) >= 80
                            ? 'low'
                            : (facts.domain?.score ?? 0) >= 60
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
