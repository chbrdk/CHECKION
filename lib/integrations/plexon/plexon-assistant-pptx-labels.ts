export type PlexonAssistantPptxLabels = {
    pinnedSection: string;
    findings: string;
    recommendations: string;
    footerSuffix: string;
    coverSubtitle: string;
    variant: string;
    unknownBlock: string;
    chartFallback: string;
    moreMetrics: string;
    metricColumn: string;
    valueColumn: string;
    hintColumn: string;
    personaConfidence: string;
    personaPillarFit: string;
    personas: string;
    knowledgeEntries: string;
    continued: string;
    chartPeak: string;
};

export function getPlexonAssistantPptxLabels(locale: 'de' | 'en'): PlexonAssistantPptxLabels {
    if (locale === 'en') {
        return {
            pinnedSection: 'Pinned analysis',
            findings: 'Findings',
            recommendations: 'Recommendations',
            footerSuffix: 'PLEXON · MSQDX Assistant Report',
            coverSubtitle: 'Curated session report',
            variant: 'Assistant Report',
            unknownBlock: 'Block type not mapped — see web report.',
            chartFallback: 'Chart data',
            moreMetrics: 'Additional KPIs',
            metricColumn: 'Metric',
            valueColumn: 'Value',
            hintColumn: 'Note',
            personaConfidence: 'Confidence',
            personaPillarFit: 'Fit by pillar',
            personas: 'Personas',
            knowledgeEntries: 'Knowledge entries',
            continued: 'cont.',
            chartPeak: 'Peak',
        };
    }
    return {
        pinnedSection: 'Gepinnte Analyse',
        findings: 'Erkenntnisse',
        recommendations: 'Handlungsempfehlungen',
        footerSuffix: 'PLEXON · MSQDX Assistant Report',
        coverSubtitle: 'Kuratierter Session-Report',
        variant: 'Assistant Report',
        unknownBlock: 'Block-Typ nicht abbildbar — siehe Web-Report.',
        chartFallback: 'Diagrammdaten',
        moreMetrics: 'Weitere KPIs',
        metricColumn: 'Kennzahl',
        valueColumn: 'Wert',
        hintColumn: 'Hinweis',
        personaConfidence: 'Confidence',
        personaPillarFit: 'Passung nach Säule',
        personas: 'Personas',
        knowledgeEntries: 'Wissenseinträge',
        continued: 'Forts.',
        chartPeak: 'Spitzenwert',
    };
}
