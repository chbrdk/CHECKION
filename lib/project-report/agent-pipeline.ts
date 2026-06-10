/**
 * Multi-stage LLM synthesis for project executive report narrative.
 */

import OpenAI from 'openai';
import { OPENAI_MODEL, getOpenAIKey } from '@/lib/llm/config';
import { reportUsage } from '@/lib/usage-report';
import type { ProjectReportBundle, ProjectReportLocale } from '@/lib/project-report/types';
import {
    PLACEHOLDER_NARRATIVE,
    type ProjectReportNarrative,
} from '@/lib/project-report/narrative-schema';
import { validateNarrativeEvidence } from '@/lib/project-report/agent-qa';
import { sanitizeNarrativeRaw } from '@/lib/project-report/narrative-sanitize';
import { slimProjectSetupForAgent } from '@/lib/project-report/project-setup-context';

const MAX_FINDINGS = 8;
const MAX_RECOMMENDATIONS = 5;

function extractJson(content: string): string {
    const trimmed = content.trim();
    const block = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (block) return block[1].trim();
    return trimmed;
}

function buildReducedFactsPayload(bundle: Omit<ProjectReportBundle, 'visuals' | 'narrative'>) {
    return {
        project: {
            name: bundle.project.name,
            domain: bundle.project.domain,
            industry: bundle.project.industry,
            valueProposition: bundle.project.valueProposition,
            competitors: bundle.project.competitors,
        },
        projectSetup: slimProjectSetupForAgent(bundle.setup),
        scores: {
            domainScore: bundle.domain?.score ?? null,
            seo: bundle.domain?.seoOnPageScore ?? null,
            geo: bundle.geo?.score ?? null,
            rankings: bundle.rankings?.score ?? null,
        },
        domain: bundle.domain
            ? {
                  totalPages: bundle.domain.totalPageCount,
                  issueStats: bundle.domain.issueStats,
                  systemicIssues: bundle.domain.systemicIssues.map((i) => ({
                      title: i.title,
                      count: i.count,
                      evidenceId: i.evidenceId,
                  })),
                  llmSummary: bundle.domain.llmSummary?.summary ?? null,
              }
            : null,
        competitors: bundle.competitors
            .filter((c) => c.status === 'complete')
            .map((c) => ({
                domain: c.domain,
                domainScore: c.score,
                seoScore: c.seoOnPageScore,
                evidenceId: c.evidenceId,
            })),
        rankings: bundle.rankings
            ? {
                  score: bundle.rankings.score,
                  topKeywords: bundle.rankings.topKeywords.slice(0, 10),
              }
            : null,
        geo: bundle.geo
            ? {
                  score: bundle.geo.score,
                  recommendations: bundle.geo.recommendations.slice(0, 6),
                  competitiveDomains: bundle.geo.competitiveDomains.slice(0, 8),
              }
            : null,
        evidenceIds: bundle.provenance.map((p) => p.evidenceId),
    };
}

function systemPrompt(locale: ProjectReportLocale): string {
    const lang = locale === 'de' ? 'German' : 'English';
    return `You are a senior digital strategy analyst for CHECKION project reports.
Respond in ${lang}. Output valid JSON only.
Every finding and recommendation MUST reference only evidenceIds from the input evidenceIds list.
Do not invent metrics or scores. Priority 1 = highest.
Risk levels: low, medium, high, unknown.`;
}

function userPrompt(stage: string, payload: string, locale: ProjectReportLocale): string {
    const lang = locale === 'de' ? 'German' : 'English';
    if (stage === 'full') {
        return `Analyze this project report facts and produce a complete narrative in ${lang}.

Return JSON matching this shape:
{
  "executiveSummary": "2-3 paragraphs",
  "competitiveLandscape": "1 paragraph",
  "findings": [{ "title": "", "description": "", "severity": "low|medium|high", "evidenceIds": ["ev-..."] }],
  "recommendations": [{ "title": "", "description": "", "priority": 1-5, "category": "", "evidenceIds": ["ev-..."] }],
  "riskAmpel": { "wcag": "low|medium|high|unknown", "geo": "...", "rankings": "..." }
}

Max ${MAX_FINDINGS} findings, max ${MAX_RECOMMENDATIONS} recommendations.

Facts:
${payload}`;
    }
    return `Stage: ${stage}\nFacts:\n${payload}`;
}

async function callLlm(
    openai: OpenAI,
    locale: ProjectReportLocale,
    stage: string,
    payload: string
): Promise<string> {
    const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
            { role: 'system', content: systemPrompt(locale) },
            { role: 'user', content: userPrompt(stage, payload, locale) },
        ],
        response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content ?? '';
}

export async function synthesizeProjectReportNarrative(
    bundle: Omit<ProjectReportBundle, 'visuals' | 'narrative'>,
    options: { userId: string; projectId: string; runId: string; skipLlm?: boolean }
): Promise<ProjectReportNarrative> {
    if (options.skipLlm) {
        return {
            ...PLACEHOLDER_NARRATIVE,
            executiveSummary:
                bundle.locale === 'de'
                    ? 'LLM-Synthese wurde übersprungen. Der Report enthält deterministische Fakten und Metriken.'
                    : 'LLM synthesis was skipped. This report contains deterministic facts and metrics.',
            synthesisAvailable: false,
        };
    }

    let openai: OpenAI;
    try {
        openai = new OpenAI({ apiKey: getOpenAIKey() });
    } catch {
        return {
            ...PLACEHOLDER_NARRATIVE,
            executiveSummary:
                bundle.locale === 'de'
                    ? 'LLM-Synthese nicht verfügbar (API-Schlüssel fehlt). Metriken und Tabellen sind vollständig.'
                    : 'LLM synthesis unavailable (API key missing). Metrics and tables are complete.',
            synthesisAvailable: false,
        };
    }

    const payloadJson = JSON.stringify(buildReducedFactsPayload(bundle), null, 0);

    try {
        const raw = await callLlm(openai, bundle.locale, 'full', payloadJson);
        const parsed = JSON.parse(extractJson(raw));
        const validIds = new Set(bundle.provenance.map((p) => p.evidenceId));
        const fallbackId =
            bundle.provenance.find((p) => p.evidenceId.startsWith('ev-wcag'))?.evidenceId ??
            bundle.provenance[0]?.evidenceId ??
            'ev-wcag-score';
        const sanitized = sanitizeNarrativeRaw(parsed, validIds, fallbackId);
        const qa = validateNarrativeEvidence(
            {
                ...sanitized,
                modelUsed: OPENAI_MODEL,
                generatedAt: new Date().toISOString(),
                synthesisAvailable: true,
            },
            bundle.provenance
        );

        reportUsage({
            userId: options.userId,
            eventType: 'project_report_synthesis',
            rawUnits: { projectId: options.projectId, runId: options.runId },
            idempotencyKey: `project_report_synthesis:${options.runId}`,
        });

        return qa;
    } catch (e) {
        console.error('[CHECKION] project report synthesis error:', e);
        return {
            ...PLACEHOLDER_NARRATIVE,
            executiveSummary:
                bundle.locale === 'de'
                    ? 'LLM-Synthese fehlgeschlagen. Der Report enthält deterministische Fakten und Metriken.'
                    : 'LLM synthesis failed. This report contains deterministic facts and metrics.',
            synthesisAvailable: false,
        };
    }
}
