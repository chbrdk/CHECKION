export type PlexonAssistantPptxLabels = {
    pinnedSection: string;
    findings: string;
    recommendations: string;
    footerSuffix: string;
    coverSubtitle: string;
    variant: string;
    unknownBlock: string;
    chartFallback: string;
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
    };
}
