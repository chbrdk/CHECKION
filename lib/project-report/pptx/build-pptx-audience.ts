/**
 * Audience / persona narrative for PPTX — reuses PDF selection and insight ranking.
 */
import {
    formatAudiencePersonasPdfCaption,
    formatAudiencePillarFitLegend,
    type ProjectReportPdfLabels,
} from '@/lib/project-report/pdf-labels';
import {
    rankPersonaInsightsForPdf,
    selectDistinctPersonasForPdf,
    truncatePersonaInsightText,
} from '@/lib/project-report/audience-pdf-personas';
import { dedupeInterpretationTexts } from '@/lib/project-report/pdf-text-dedupe';
import type {
    AudiencePersonaFitFact,
    AudienceReportOverlay,
    ProjectReportLocale,
} from '@/lib/project-report/types';
import { PPTX_MAX_BULLETS } from '@/lib/project-report/pptx/types';

const PPTX_PERSONA_CHART_BULLETS = 3;
const PPTX_PERSONA_DETAIL_LIMIT = 3;

function goalsLabel(locale: ProjectReportLocale): string {
    return locale === 'de' ? 'Ziele' : 'Goals';
}

function uxJourneyLabel(locale: ProjectReportLocale, success: boolean | null): string {
    if (locale === 'de') {
        if (success === false) return ' (abgebrochen)';
        if (success === true) return ' (erfolgreich)';
        return '';
    }
    if (success === false) return ' (abandoned)';
    if (success === true) return ' (completed)';
    return '';
}

export function selectPersonasForPptx(personas: AudiencePersonaFitFact[]): AudiencePersonaFitFact[] {
    return selectDistinctPersonasForPdf(personas, 3);
}

export function buildAudienceIntroBullets(
    audience: AudienceReportOverlay,
    labels: ProjectReportPdfLabels
): string[] {
    const bullets: string[] = [];

    if (audience.audionProjectName) {
        bullets.push(`AUDION: ${audience.audionProjectName}`);
    }

    for (const insight of dedupeInterpretationTexts(audience.summaryInsights).slice(0, 2)) {
        bullets.push(insight);
    }

    const strong = audience.personas.filter((persona) => persona.overallFit === 'strong').length;
    const weak = audience.personas.filter((persona) => persona.overallFit === 'weak').length;

    bullets.push(
        `${labels.audienceTargetGroups}: ${audience.targetGroups.length} · ${labels.audiencePersonas}: ${audience.personas.length}`
    );
    bullets.push(`${labels.audienceStrongFit}: ${strong} · ${labels.audienceWeakFit}: ${weak}`);

    return bullets.slice(0, PPTX_MAX_BULLETS);
}

export function buildTargetGroupBullets(audience: AudienceReportOverlay): string[] {
    if (audience.targetGroups.length === 0) return [];

    return audience.targetGroups.slice(0, PPTX_MAX_BULLETS).map((group) => {
        const description = group.description ? ` — ${group.description}` : '';
        return `${group.name} (${group.segment}, ${group.personaCount} ${group.personaCount === 1 ? 'Persona' : 'Personas'})${description}`;
    });
}

export function buildPersonasOverviewLead(
    audience: AudienceReportOverlay,
    labels: ProjectReportPdfLabels,
    locale: ProjectReportLocale,
    shownCount: number
): string {
    return [
        formatAudiencePersonasPdfCaption(
            locale,
            shownCount,
            audience.personas.length,
            labels.audienceMorePersonas
        ),
        formatAudiencePillarFitLegend(labels),
    ].join('\n');
}

export function buildPersonaChartSubtitle(
    persona: AudiencePersonaFitFact,
    labels: ProjectReportPdfLabels
): string {
    const parts: string[] = [];
    if (persona.targetGroupName) parts.push(persona.targetGroupName);
    if (persona.headline) parts.push(persona.headline);
    parts.push(`${labels.audienceFit}: ${labels.audienceFitLabels[persona.overallFit]}`);
    return parts.join(' · ');
}

export function buildPersonaChartBullets(
    persona: AudiencePersonaFitFact,
    labels: ProjectReportPdfLabels
): string[] {
    const bullets: string[] = [];

    if (persona.personaPerspective?.trim()) {
        bullets.push(`„${truncatePersonaInsightText(persona.personaPerspective, 140)}“`);
    }

    const insights = rankPersonaInsightsForPdf(persona.insights, 2, {
        omitPersonaVoice: Boolean(persona.personaPerspective?.trim()),
    });
    for (const insight of insights) {
        bullets.push(
            `${insight.title}: ${truncatePersonaInsightText(insight.description, 110)}`
        );
    }

    if (persona.painPoints.length > 0 && bullets.length < PPTX_PERSONA_CHART_BULLETS) {
        bullets.push(`${labels.audiencePainPoints}: ${persona.painPoints.slice(0, 2).join('; ')}`);
    }

    const geo = persona.geoQuestionMatches[0];
    if (geo && bullets.length < PPTX_PERSONA_CHART_BULLETS) {
        const position =
            geo.latestPosition != null ? ` (#${Math.round(geo.latestPosition)})` : '';
        bullets.push(`${labels.audienceGeoMatches}: ${geo.queryText}${position}`);
    }

    return bullets.slice(0, PPTX_PERSONA_CHART_BULLETS);
}

export function buildPersonaDetailBullets(
    persona: AudiencePersonaFitFact,
    labels: ProjectReportPdfLabels,
    locale: ProjectReportLocale
): string[] {
    const bullets: string[] = [];

    if (persona.goals.length > 0) {
        bullets.push(`${goalsLabel(locale)}: ${persona.goals.slice(0, 3).join('; ')}`);
    }

    for (const pillar of persona.pillars) {
        if (!pillar.note?.trim()) continue;
        bullets.push(`${pillar.pillar.toUpperCase()}: ${pillar.note}`);
        if (bullets.length >= PPTX_PERSONA_DETAIL_LIMIT) break;
    }

    if (persona.latestUxJourney?.task && bullets.length < PPTX_PERSONA_DETAIL_LIMIT) {
        const journey = persona.latestUxJourney;
        bullets.push(
            `UX-Journey: ${journey.task}${uxJourneyLabel(locale, journey.success ?? null)}`
        );
    }

    const extraInsights = rankPersonaInsightsForPdf(persona.insights, 4, {
        omitPersonaVoice: Boolean(persona.personaPerspective?.trim()),
    }).slice(2);
    for (const insight of extraInsights) {
        if (bullets.length >= PPTX_PERSONA_DETAIL_LIMIT) break;
        bullets.push(
            `${insight.title}: ${truncatePersonaInsightText(insight.description, 110)}`
        );
    }

    return bullets.slice(0, PPTX_MAX_BULLETS);
}

export function personaDetailSlideTitle(
    personaName: string,
    labels: ProjectReportPdfLabels
): string {
    return `${personaName} — ${labels.audiencePersonaPerspective}`;
}
