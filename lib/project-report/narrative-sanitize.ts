/**
 * Coerce LLM JSON into shapes that pass Zod narrative validation.
 */

import {
    ProjectReportNarrativeSchema,
    SectionAnalysisSchema,
    type ProjectReportNarrative,
    type SectionAnalysis,
} from '@/lib/project-report/narrative-schema';

type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

const RISK_LEVELS = new Set<RiskLevel>(['low', 'medium', 'high', 'unknown']);

function asString(v: unknown, fallback = ''): string {
    if (typeof v === 'string') return v.trim() || fallback;
    if (v == null) return fallback;
    return String(v);
}

function asStringArray(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    return v.map((x) => asString(x)).filter(Boolean);
}

export function coercePriority(v: unknown): 1 | 2 | 3 | 4 | 5 {
    const n = typeof v === 'string' ? parseInt(v.replace(/\D/g, ''), 10) : Number(v);
    if (n >= 1 && n <= 5) return n as 1 | 2 | 3 | 4 | 5;
    return 3;
}

export function coerceRiskLevel(v: unknown): RiskLevel {
    const s = asString(v, 'unknown').toLowerCase();
    return RISK_LEVELS.has(s as RiskLevel) ? (s as RiskLevel) : 'unknown';
}

export function pickEvidenceIds(
    ids: unknown,
    validIds: Set<string>,
    fallbackId: string
): string[] {
    const fromLlm = asStringArray(ids).filter((id) => validIds.has(id));
    if (fromLlm.length > 0) return fromLlm;
    if (validIds.has(fallbackId)) return [fallbackId];
    const first = validIds.values().next().value;
    return first ? [first] : [fallbackId];
}

function sanitizeMetricInterpretations(
    metricRaw: Record<string, unknown>
): Record<string, string> | undefined {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(metricRaw)) {
        const text = asString(value);
        if (text) out[key] = text;
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

export function sanitizeSectionRaw(raw: unknown, titleFallback: string): SectionAnalysis {
    const o =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
    const metricRaw =
        o.metricInterpretations && typeof o.metricInterpretations === 'object'
            ? (o.metricInterpretations as Record<string, unknown>)
            : {};

    return SectionAnalysisSchema.parse({
        title: asString(o.title, titleFallback),
        summary: asString(o.summary, 'Analysis unavailable for this section.'),
        keyFindings: asStringArray(o.keyFindings),
        metricsHighlighted: asStringArray(o.metricsHighlighted),
        metricInterpretations: sanitizeMetricInterpretations(metricRaw),
    });
}

export function sanitizeNarrativeRaw(
    raw: unknown,
    validEvidenceIds: Set<string>,
    fallbackEvidenceId: string
): ProjectReportNarrative {
    const o =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};

    const findingsRaw = Array.isArray(o.findings) ? o.findings : [];
    const recommendationsRaw = Array.isArray(o.recommendations) ? o.recommendations : [];
    const riskRaw =
        o.riskAmpel && typeof o.riskAmpel === 'object'
            ? (o.riskAmpel as Record<string, unknown>)
            : {};

    const findings = findingsRaw
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const f = item as Record<string, unknown>;
            const title = asString(f.title);
            const description = asString(f.description);
            if (!title && !description) return null;
            return {
                title: title || 'Finding',
                description: description || title,
                severity: f.severity != null ? coerceRiskLevel(f.severity) : undefined,
                evidenceIds: pickEvidenceIds(f.evidenceIds, validEvidenceIds, fallbackEvidenceId),
            };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
        .slice(0, 12);

    const recommendations = recommendationsRaw
        .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const r = item as Record<string, unknown>;
            const title = asString(r.title);
            const description = asString(r.description);
            if (!title && !description) return null;
            return {
                title: title || 'Recommendation',
                description: description || title,
                priority: coercePriority(r.priority),
                category: asString(r.category) || undefined,
                evidenceIds: pickEvidenceIds(r.evidenceIds, validEvidenceIds, fallbackEvidenceId),
            };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
        .slice(0, 8);

    return ProjectReportNarrativeSchema.parse({
        executiveSummary: asString(
            o.executiveSummary,
            'Executive summary could not be generated from specialist analyses.'
        ),
        competitiveLandscape: asString(o.competitiveLandscape) || undefined,
        findings,
        recommendations,
        riskAmpel: {
            wcag: coerceRiskLevel(riskRaw.wcag),
            geo: coerceRiskLevel(riskRaw.geo),
            rankings: coerceRiskLevel(riskRaw.rankings),
        },
    });
}

/** Stitch section summaries when synthesizer fails but specialists succeeded. */
export function buildExecutiveSummaryFromSections(
    sections: {
        siteQuality?: SectionAnalysis | null;
        seoRankings?: SectionAnalysis | null;
        geo?: SectionAnalysis | null;
        competitive?: SectionAnalysis | null;
        journey?: SectionAnalysis | null;
    },
    locale: 'de' | 'en'
): string {
    const blocks: string[] = [];
    for (const section of [
        sections.siteQuality,
        sections.seoRankings,
        sections.geo,
        sections.competitive,
        sections.journey,
    ]) {
        if (section?.summary?.trim()) {
            blocks.push(section.title ? `${section.title}\n${section.summary}` : section.summary);
        }
    }
    if (blocks.length === 0) {
        return locale === 'de'
            ? 'Spezialisten-Analysen nicht verfügbar. Metriken und Tabellen sind vollständig.'
            : 'Specialist analyses unavailable. Metrics and tables are complete.';
    }
    const intro =
        locale === 'de'
            ? 'Zusammenfassung aus den Bereichs-Analysen (Executive-Synthesizer ausgefallen):\n\n'
            : 'Summary compiled from section analyses (executive synthesizer unavailable):\n\n';
    return intro + blocks.join('\n\n');
}
