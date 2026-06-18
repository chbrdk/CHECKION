/**
 * Audience / persona narrative for PPTX — full text, no truncation (normalize splits slides).
 */
import {
    formatAudiencePersonasPdfCaption,
    formatAudiencePillarFitLegend,
    type ProjectReportPdfLabels,
} from '@/lib/project-report/pdf-labels';
import {
    rankPersonaInsightsForPdf,
    selectDistinctPersonasForPdf,
} from '@/lib/project-report/audience-pdf-personas';
import { dedupeInterpretationTexts } from '@/lib/project-report/pdf-text-dedupe';
import type {
    AudiencePersonaFitFact,
    AudienceReportOverlay,
    ProjectReportLocale,
} from '@/lib/project-report/types';

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

    for (const insight of dedupeInterpretationTexts(audience.summaryInsights)) {
        bullets.push(insight);
    }

    const strong = audience.personas.filter((persona) => persona.overallFit === 'strong').length;
    const weak = audience.personas.filter((persona) => persona.overallFit === 'weak').length;

    bullets.push(
        `${labels.audienceTargetGroups}: ${audience.targetGroups.length} · ${labels.audiencePersonas}: ${audience.personas.length}`
    );
    bullets.push(`${labels.audienceStrongFit}: ${strong} · ${labels.audienceWeakFit}: ${weak}`);

    return bullets;
}

export function buildTargetGroupBullets(audience: AudienceReportOverlay): string[] {
    if (audience.targetGroups.length === 0) return [];

    return audience.targetGroups.map((group) => {
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
        bullets.push(`„${persona.personaPerspective.trim()}“`);
    }

    const insights = rankPersonaInsightsForPdf(persona.insights, 6, {
        omitPersonaVoice: Boolean(persona.personaPerspective?.trim()),
    });
    for (const insight of insights) {
        bullets.push(`${insight.title}: ${insight.description}`);
    }

    if (persona.painPoints.length > 0) {
        bullets.push(`${labels.audiencePainPoints}: ${persona.painPoints.join('; ')}`);
    }

    for (const geo of persona.geoQuestionMatches) {
        const position =
            geo.latestPosition != null ? ` (#${Math.round(geo.latestPosition)})` : '';
        bullets.push(`${labels.audienceGeoMatches}: ${geo.queryText}${position}`);
    }

    return bullets;
}

export function buildPersonaDetailBullets(
    persona: AudiencePersonaFitFact,
    labels: ProjectReportPdfLabels,
    locale: ProjectReportLocale
): string[] {
    const bullets: string[] = [];

    if (persona.goals.length > 0) {
        bullets.push(`${goalsLabel(locale)}: ${persona.goals.join('; ')}`);
    }

    for (const pillar of persona.pillars) {
        if (!pillar.note?.trim()) continue;
        bullets.push(`${pillar.pillar.toUpperCase()}: ${pillar.note}`);
    }

    if (persona.latestUxJourney?.task) {
        const journey = persona.latestUxJourney;
        bullets.push(
            `UX-Journey: ${journey.task}${uxJourneyLabel(locale, journey.success ?? null)}`
        );
    }

    const extraInsights = rankPersonaInsightsForPdf(persona.insights, 8, {
        omitPersonaVoice: Boolean(persona.personaPerspective?.trim()),
    }).slice(2);
    for (const insight of extraInsights) {
        bullets.push(`${insight.title}: ${insight.description}`);
    }

    return bullets;
}

export function personaDetailSlideTitle(
    personaName: string,
    labels: ProjectReportPdfLabels
): string {
    return `${personaName} — ${labels.audiencePersonaPerspective}`;
}
