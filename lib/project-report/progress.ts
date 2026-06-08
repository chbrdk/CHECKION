/**
 * Report generation progress stages (UI + DB).
 */

export type ReportProgressStage =
    | 'queued'
    | 'collecting'
    | 'collecting_deep'
    | 'agent_site_quality'
    | 'agent_seo'
    | 'agent_geo'
    | 'agent_competitive'
    | 'agent_journey'
    | 'agent_synthesizer'
    | 'agent_persona_audience'
    | 'building_charts'
    | 'complete'
    | 'error';

export interface ReportProgress {
    stage: ReportProgressStage;
    label: string;
    percent: number;
    updatedAt: string;
}

export const REPORT_STAGE_PERCENT: Record<ReportProgressStage, number> = {
    queued: 0,
    collecting: 8,
    collecting_deep: 18,
    agent_site_quality: 30,
    agent_seo: 42,
    agent_geo: 54,
    agent_competitive: 66,
    agent_journey: 74,
    agent_synthesizer: 84,
    agent_persona_audience: 90,
    building_charts: 94,
    complete: 100,
    error: 0,
};

export function makeReportProgress(
    stage: ReportProgressStage,
    labelDe: string,
    labelEn: string,
    locale: 'de' | 'en'
): ReportProgress {
    return {
        stage,
        label: locale === 'de' ? labelDe : labelEn,
        percent: REPORT_STAGE_PERCENT[stage],
        updatedAt: new Date().toISOString(),
    };
}

export const STAGE_LABELS: Record<
    ReportProgressStage,
    { de: string; en: string }
> = {
    queued: { de: 'In Warteschlange', en: 'Queued' },
    collecting: { de: 'Basisdaten sammeln', en: 'Collecting base data' },
    collecting_deep: { de: 'Tiefenanalyse-Daten laden', en: 'Loading deep analysis data' },
    agent_site_quality: { de: 'Agent: Site Quality & UX', en: 'Agent: Site quality & UX' },
    agent_seo: { de: 'Agent: SEO & Rankings', en: 'Agent: SEO & rankings' },
    agent_geo: { de: 'Agent: GEO & E-E-A-T', en: 'Agent: GEO & E-E-A-T' },
    agent_competitive: { de: 'Agent: Wettbewerb', en: 'Agent: Competitive landscape' },
    agent_journey: { de: 'Agent: UX Journey', en: 'Agent: UX journey' },
    agent_synthesizer: { de: 'Agent: Executive Summary', en: 'Agent: Executive summary' },
    agent_persona_audience: { de: 'Agent: Persona-Sicht', en: 'Agent: Persona perspective' },
    building_charts: { de: 'Visualisierungen erstellen', en: 'Building visualizations' },
    complete: { de: 'Fertig', en: 'Complete' },
    error: { de: 'Fehler', en: 'Error' },
};
