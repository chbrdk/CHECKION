/**
 * Per-persona LLM agent: evaluates CHECKION scan data from each AUDION persona's perspective.
 * Produces comparable pillar scores + unique persona-voice insights.
 */

import OpenAI from 'openai';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import { slimDomainForAgent } from '@/lib/project-report/persona-audience-payload';
import {
    PersonaAudienceAgentResultSchema,
    type PersonaAudienceAgentResult,
} from '@/lib/project-report/persona-audience-schema';
import type { AudionPersonaFact } from '@/lib/integrations/audion-audience-client';
import type {
    AudienceFitLevel,
    AudienceInsightFact,
    AudiencePersonaFitFact,
    AudiencePillarFit,
    AudienceReportOverlay,
    AudienceSubScoreFact,
    ProjectReportBundle,
    ProjectReportDeepAnalysis,
    ProjectReportLocale,
} from '@/lib/project-report/types';
import type { SectionAnalysis } from '@/lib/project-report/narrative-schema';
import { slimEchonMarketForAgent } from '@/lib/project-report/echon-market-context';

import type { ReportProgress } from '@/lib/project-report/progress';

const MAX_PERSONA_AGENTS = 8;
const PERSONA_AGENT_TIMEOUT_MS = 120_000;
const PERSONA_AGENT_CONCURRENCY = 2;

export type PersonaAudienceProgressCallback = (progress: ReportProgress) => Promise<void>;

function extractJson(content: string): string {
    const trimmed = content.trim();
    const block = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (block) return block[1].trim();
    return trimmed;
}

function systemPrompt(locale: ProjectReportLocale): string {
    const lang = locale === 'de' ? 'German' : 'English';
    return `You are a UX research agent emulating a specific AUDION persona evaluating a website scan.
Respond in ${lang}. Output valid JSON only.
Score from THIS persona's goals, pain points, and context — not generic marketing scores.
Different personas MUST receive different scores and insights when their profiles differ.
Use 0–100 scores. level: strong (≥70), mixed (40–69), weak (<40), unknown only if data missing.
Be concrete: cite scan metrics, themes, GEO questions, or issues that matter to this persona.`;
}

function slimSections(sections: ProjectReportDeepAnalysis['sections'] | undefined) {
    if (!sections) return null;
    const pick = (s: SectionAnalysis | null | undefined) =>
        s
            ? {
                  title: s.title,
                  summary: s.summary.slice(0, 600),
                  keyFindings: s.keyFindings.slice(0, 4),
              }
            : null;
    return {
        siteQuality: pick(sections.siteQuality),
        seoRankings: pick(sections.seoRankings),
        geo: pick(sections.geo),
        competitive: pick(sections.competitive),
        journey: pick(sections.journey),
    };
}

function buildPersonaAgentUserPrompt(
    persona: AudionPersonaFact,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    deep: ProjectReportDeepAnalysis | null,
    sections: ProjectReportDeepAnalysis['sections'] | undefined,
    locale: ProjectReportLocale
): string {
    const lang = locale === 'de' ? 'German' : 'English';
    const payload = {
        project: { name: facts.project.name, domain: facts.project.domain },
        persona: {
            id: persona.id,
            name: persona.name,
            headline: persona.headline,
            segment: persona.segment,
            targetGroup: persona.targetGroupName,
            painPoints: persona.painPoints.slice(0, 6),
            goals: persona.goals.slice(0, 6),
            interests: persona.interests.slice(0, 6),
            latestUxJourney: persona.latestUxJourney,
        },
        scan: {
            domain: slimDomainForAgent(facts.domain),
            rankings: facts.rankings
                ? {
                      score: facts.rankings.score,
                      topKeywords: facts.rankings.topKeywords.slice(0, 8),
                  }
                : null,
            geo: facts.geo ? { score: facts.geo.score } : null,
            geoQuestions: deep?.geoDeep?.questionDetails.slice(0, 8).map((q) => ({
                query: q.queryText,
                position: q.latestPosition,
            })),
            issueGroups: deep?.issueGroups.slice(0, 6).map((g) => ({
                title: g.title,
                pageCount: g.pageCount,
                type: g.type,
            })),
            rankKeywords: deep?.rankKeywordDetails.slice(0, 6).map((k) => ({
                keyword: k.keyword,
                position: k.position,
            })),
        },
        specialistSections: slimSections(sections),
        externalMarketContext: slimEchonMarketForAgent(facts.marketContext),
    };

    return `Evaluate the website scan AS persona "${persona.name}" (${persona.headline}).
If externalMarketContext is present, treat it as recent market/signal pressure relevant to this persona's segment — reflect it in personaPerspective and insights where it matters.
Write personaPerspective in ${lang} — 2–3 sentences in first person ("I…" / "Ich…") about how the site feels for this persona.

Return JSON exactly:
{
  "personaPerspective": "string",
  "overallFit": "strong|mixed|weak|unknown",
  "pillars": [
    { "pillar": "wcag|seo|geo|rankings|performance|topics", "score": 0-100, "level": "strong|mixed|weak|unknown", "note": "one sentence, persona-specific" }
  ],
  "subScores": [
    { "id": "content_relevance|findability|trust_credibility|task_clarity|accessibility_impact|discovery_geo", "label": "short label", "score": 0-100, "level": "...", "note": "..." }
  ],
  "insights": [
    { "kind": "persona_voice|win|friction|content|geo|gap", "title": "...", "description": "..." }
  ]
}

Include all 6 pillars. Provide at least 4 subScores and 3 insights (≥1 persona_voice, ≥1 friction or gap if issues exist).

Scan data:
${JSON.stringify(payload)}`;
}

export function sanitizePersonaAgentResult(raw: unknown): PersonaAudienceAgentResult | null {
    const parsed = PersonaAudienceAgentResultSchema.safeParse(raw);
    if (!parsed.success) return null;
    return parsed.data;
}

async function callPersonaAgent(
    openai: OpenAI,
    persona: AudionPersonaFact,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    deep: ProjectReportDeepAnalysis | null,
    sections: ProjectReportDeepAnalysis['sections'] | undefined,
    locale: ProjectReportLocale
): Promise<PersonaAudienceAgentResult | null> {
    try {
        const completion = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemPrompt(locale) },
                { role: 'user', content: buildPersonaAgentUserPrompt(persona, facts, deep, sections, locale) },
            ],
            response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content ?? '{}';
        return sanitizePersonaAgentResult(JSON.parse(extractJson(content)));
    } catch (err) {
        console.warn(
            `[CHECKION] persona audience agent failed for ${persona.name}:`,
            err instanceof Error ? err.message : err
        );
        return null;
    }
}

function agentInsightToFact(
    personaId: string,
    insight: PersonaAudienceAgentResult['insights'][number],
    index: number
): AudienceInsightFact {
    const kindMap: Record<
        PersonaAudienceAgentResult['insights'][number]['kind'],
        AudienceInsightFact['kind']
    > = {
        persona_voice: 'persona_voice',
        win: 'win',
        friction: 'gap',
        content: 'content',
        geo: 'geo',
        gap: 'gap',
    };
    return {
        id: `ins-agent-${personaId}-${index}`,
        kind: kindMap[insight.kind] ?? 'summary',
        title: insight.title,
        description: insight.description,
        evidenceId: `ev-audience-${personaId}`,
    };
}

export function mergePersonaAgentEvaluation(
    baseline: AudiencePersonaFitFact,
    agent: PersonaAudienceAgentResult | null
): AudiencePersonaFitFact {
    if (!agent) {
        return { ...baseline, evaluationSource: 'deterministic' };
    }

    const pillarByKey = new Map(agent.pillars.map((p) => [p.pillar, p]));
    const pillars: AudiencePillarFit[] = baseline.pillars.map((base) => {
        const fromAgent = pillarByKey.get(base.pillar);
        if (!fromAgent) return base;
        return {
            pillar: base.pillar,
            level: fromAgent.level as AudienceFitLevel,
            score: fromAgent.score,
            note: fromAgent.note,
        };
    });

    const subScores: AudienceSubScoreFact[] = agent.subScores.map((s) => ({
        id: s.id,
        label: s.label,
        score: s.score,
        level: s.level as AudienceFitLevel,
        note: s.note,
    }));

    const journeyInsights = baseline.insights.filter((i) => i.kind === 'journey');
    const agentInsights = agent.insights.map((ins, idx) => agentInsightToFact(baseline.personaId, ins, idx));

    return {
        ...baseline,
        evaluationSource: 'agent',
        personaPerspective: agent.personaPerspective,
        overallFit: agent.overallFit as AudienceFitLevel,
        pillars,
        subScores,
        insights: [...agentInsights, ...journeyInsights].slice(0, 6),
    };
}

async function runPool<T, R>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function runOne(): Promise<void> {
        while (next < items.length) {
            const i = next++;
            results[i] = await worker(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => runOne()));
    return results;
}

export async function enrichAudienceOverlayWithPersonaAgents(
    overlay: AudienceReportOverlay,
    facts: Omit<ProjectReportBundle, 'visuals' | 'narrative' | 'audience'>,
    deep: ProjectReportDeepAnalysis | null,
    sections: ProjectReportDeepAnalysis['sections'] | undefined,
    options: {
        locale: ProjectReportLocale;
        skipLlm?: boolean;
        userId: string;
        projectId: string;
        runId: string;
        onProgress?: PersonaAudienceProgressCallback;
        audionPersonas: AudionPersonaFact[];
    }
): Promise<AudienceReportOverlay> {
    if (!overlay.available || overlay.personas.length === 0 || options.skipLlm) {
        return overlay;
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey(), timeout: PERSONA_AGENT_TIMEOUT_MS });
    } catch {
        return overlay;
    }

    const { makeReportProgress, STAGE_LABELS } = await import('@/lib/project-report/progress');
    const personaById = new Map(options.audionPersonas.map((p) => [p.id, p]));
    const targets = overlay.personas.slice(0, MAX_PERSONA_AGENTS);

    const agentResults = await runPool(targets, PERSONA_AGENT_CONCURRENCY, async (fit, index) => {
        if (options.onProgress) {
            const labels = STAGE_LABELS.agent_persona_audience;
            await options.onProgress(
                makeReportProgress(
                    'agent_persona_audience',
                    `${labels.de} (${index + 1}/${targets.length})`,
                    `${labels.en} (${index + 1}/${targets.length})`,
                    options.locale
                )
            );
        }
        const persona = personaById.get(fit.personaId);
        if (!persona) return null;
        return callPersonaAgent(openai, persona, facts, deep, sections, options.locale);
    });

    const personas = overlay.personas.map((fit, idx) => {
        if (idx >= MAX_PERSONA_AGENTS) return { ...fit, evaluationSource: 'deterministic' as const };
        return mergePersonaAgentEvaluation(fit, agentResults[idx] ?? null);
    });

    const agentCount = agentResults.filter(Boolean).length;
    const de = options.locale === 'de';
    const summaryInsights = [...overlay.summaryInsights];
    if (agentCount > 0) {
        summaryInsights.push(
            de
                ? `${agentCount} Persona(s) durch KI-Agent aus Persona-Sicht bewertet (vergleichbare Säulen + individuelle Insights).`
                : `${agentCount} persona(s) evaluated by AI agent from persona perspective (comparable pillars + unique insights).`
        );
    }

    try {
        reportUsage({
            userId: options.userId,
            eventType: 'project_report_persona_audience',
            rawUnits: { projectId: options.projectId, runId: options.runId, personaAgentCalls: agentCount },
            idempotencyKey: `project_report_persona_audience:${options.runId}`,
        });
    } catch (usageErr) {
        console.warn('[CHECKION] persona audience usage report failed:', usageErr);
    }

    return { ...overlay, personas, summaryInsights };
}
