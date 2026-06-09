/**
 * PDF label strings for project report (de/en).
 */

import type { ProjectReportLocale } from '@/lib/project-report/types';

export interface ProjectReportPdfLabels {
    reportTitle: string;
    reportSubtitle: string;
    executiveSummary: string;
    siteQuality: string;
    seoRankings: string;
    geoEeat: string;
    contentTopics: string;
    competitorComparison: string;
    actionPlan: string;
    tableOfContents: string;
    appendix: string;
    domain: string;
    industry: string;
    date: string;
    pages: string;
    domainScore: string;
    domainScoreRank: string;
    wcagErrors: string;
    performance: string;
    eco: string;
    noData: string;
    keywords: string;
    recommendations: string;
    systemicIssues: string;
    dataSources: string;
    riskAmpel: { wcag: string; geo: string; rankings: string };
    footerTitle: string;
    technicalAppendix: string;
    journeySummary: string;
    metricsOverview: string;
    keyFindings: string;
    metricLabel: string;
    metricValue: string;
    metricBenchmark: string;
    keywordDetails: string;
    geoQuestionHistory: string;
    geoPageAnalysis: string;
    issueGroups: string;
    seoTechnical: string;
    sectionAnalysis: string;
    comprehensiveSubtitle: string;
    competitiveBenchmark: string;
    topicOverlap: string;
    competitiveInsights: string;
    scoreboard: string;
    geoModelBenchmark: string;
    geoQuestionAnalysis: string;
    geoOnPageEeat: string;
    geoAgentAnalysis: string;
    geoInsights: string;
    geoTrend: string;
    geoAvgPosition: string;
    geoModel: string;
    geoRank: string;
    geoTopCited: string;
    geoDomain: string;
    geoNotCited: string;
    geoTrendLabels: {
        improving: string;
        declining: string;
        stable: string;
        unknown: string;
    };
    audienceReality: string;
    audienceTargetGroups: string;
    audiencePersonas: string;
    audienceStrongFit: string;
    audienceWeakFit: string;
    audiencePainPoints: string;
    audiencePillar: string;
    audienceFit: string;
    audienceScore: string;
    audiencePillarRankings: string;
    audiencePillarPerformance: string;
    audiencePillarTopics: string;
    audienceGeoMatches: string;
    audienceMorePersonas: string;
    audiencePersonaPerspective: string;
    audienceSubScores: string;
    audiencePillarNote: string;
    audienceFitLabels: {
        strong: string;
        mixed: string;
        weak: string;
        unknown: string;
    };
    chapterIntros: {
        executive: string;
        siteQuality: string;
        seo: string;
        geo: string;
        topics: string;
        audience: string;
        actions: string;
        deepDive: string;
        appendix: string;
    };
    chapterPrefix: string;
}

const LABELS: Record<ProjectReportLocale, ProjectReportPdfLabels> = {
    de: {
        reportTitle: 'Projekt-Report',
        reportSubtitle: 'Executive Lagebild',
        executiveSummary: 'Executive Summary',
        siteQuality: 'Site Quality & UX',
        seoRankings: 'SEO & Rankings',
        geoEeat: 'GEO & E-E-A-T',
        contentTopics: 'Content & Seitenthemen',
        competitorComparison: 'Wettbewerbsvergleich',
        actionPlan: 'Maßnahmenplan',
        tableOfContents: 'Inhaltsverzeichnis',
        appendix: 'Anhang',
        domain: 'Domain',
        industry: 'Branche',
        date: 'Datum',
        pages: 'Seiten',
        domainScore: 'Domain-Score (UX)',
        domainScoreRank: 'Domain-Rang',
        wcagErrors: 'WCAG Fehler / Warnungen',
        performance: 'Performance (TTFB / FCP / LCP)',
        eco: 'CO₂ / Eco',
        noData: 'Keine Daten — Scan starten',
        keywords: 'Top Keywords',
        recommendations: 'Empfehlungen',
        systemicIssues: 'Systemische Issues',
        dataSources: 'Datenquellen',
        riskAmpel: { wcag: 'Domain', geo: 'GEO', rankings: 'Rankings' },
        footerTitle: 'CHECKION Projekt-Report',
        technicalAppendix: 'Technischer Anhang',
        journeySummary: 'UX Journey Agent',
        metricsOverview: 'KPI-Übersicht',
        keyFindings: 'Zentrale Erkenntnisse',
        metricLabel: 'Metrik',
        metricValue: 'Wert',
        metricBenchmark: 'Einordnung',
        keywordDetails: 'Keyword-Details & Trends',
        geoQuestionHistory: 'GEO-Fragen-Verlauf',
        geoPageAnalysis: 'GEO Seitenanalyse',
        issueGroups: 'Issue-Gruppen',
        seoTechnical: 'SEO Technik-Rollup',
        sectionAnalysis: 'Tiefenanalyse',
        comprehensiveSubtitle: 'Umfassende Analyse',
        competitiveBenchmark: 'Wettbewerbs-Benchmark (Deep Scan)',
        topicOverlap: 'Seitenthemen — Overlap',
        competitiveInsights: 'Wettbewerbs-Erkenntnisse',
        scoreboard: 'Scoreboard',
        geoModelBenchmark: 'LLM-Sichtbarkeit nach Modell',
        geoQuestionAnalysis: 'GEO-Testfragen & Zitationen',
        geoOnPageEeat: 'On-Page GEO & E-E-A-T',
        geoAgentAnalysis: 'KI-Bewertung GEO',
        geoInsights: 'GEO-Erkenntnisse',
        geoTrend: 'Trend',
        geoAvgPosition: 'Ø Position',
        geoModel: 'LLM-Modell',
        geoRank: 'Rang',
        geoTopCited: 'Top-Zitationen',
        geoDomain: 'Domain',
        geoNotCited: 'nicht zitiert',
        geoTrendLabels: {
            improving: 'steigend',
            declining: 'fallend',
            stable: 'stabil',
            unknown: 'unbekannt',
        },
        audienceReality: 'Zielgruppen & Personas (AUDION)',
        audienceTargetGroups: 'Zielgruppen',
        audiencePersonas: 'Personas',
        audienceStrongFit: 'Starke Passung',
        audienceWeakFit: 'Schwache Passung',
        audiencePainPoints: 'Pain Points',
        audiencePillar: 'Säule',
        audienceFit: 'Passung',
        audienceScore: 'Score',
        audiencePillarRankings: 'Rankings',
        audiencePillarPerformance: 'Performance',
        audiencePillarTopics: 'Themen',
        audienceGeoMatches: 'Relevante GEO-Fragen',
        audienceMorePersonas: 'weitere Personas im AUDION-Projekt',
        audiencePersonaPerspective: 'Persona-Sicht',
        audienceSubScores: 'Detail-Scores (Persona-Sicht)',
        audiencePillarNote: 'Hinweis',
        audienceFitLabels: {
            strong: 'stark',
            mixed: 'gemischt',
            weak: 'schwach',
            unknown: '–',
        },
        chapterIntros: {
            executive:
                'Das Executive Summary bündelt das Gesamtlagebild: Wo steht die Domain, welche Risiken sind relevant und wie ordnen sich SEO, GEO und UX ein? Lesen Sie dieses Kapitel zuerst — die folgenden Abschnitte vertiefen die Einzelbereiche mit Messwerten und Detailanalysen.',
            siteQuality:
                'Site Quality & UX bewertet die technische und erlebnisbezogene Qualität Ihrer Website anhand des Domain-Scores, Performance-Kennzahlen und wiederkehrender Issues über viele Seiten. Hier erkennen Sie, ob Barrierefreiheit, Geschwindigkeit und Stabilität Ihre Nutzer und Rankings belasten.',
            seo: 'SEO & Rankings zeigt, wie gut Ihre Seiten für Suchmaschinen aufgestellt sind und wo Sie in den SERPs stehen. On-Page-Scores, Keyword-Positionen und Trends helfen, sichtbare Lücken gegenüber Wettbewerbern zu priorisieren.',
            geo: 'GEO & E-E-A-T misst, wie gut Ihre Inhalte in KI-Antworten (ChatGPT, Perplexity u. a.) gefunden und zitiert werden — ergänzt um klassische Experience-, Expertise- und Trust-Signale. Dieses Kapitel verbindet Sichtbarkeits-Scores mit konkreten Optimierungshinweisen.',
            topics:
                'Content & Seitenthemen ordnet Ihre inhaltliche Breite und Schwerpunkte ein: welche Themen die Domain trägt und wie sie im Vergleich zu Wettbewerbern positioniert ist. Nutzen Sie es, um Content-Lücken und Überschneidungen strategisch zu verstehen.',
            audience:
                'Zielgruppen & Personas (AUDION) übersetzt Messwerte in menschliche Perspektiven: Wie passen UX, SEO und GEO zu definierten Personas und deren Zielen? Die Bewertung hilft, Maßnahmen nicht nur technisch, sondern aus Nutzersicht zu priorisieren.',
            actions:
                'Der Maßnahmenplan bündelt priorisierte Empfehlungen aus allen Analysen — von schnellen Fixes bis zu strategischen Projekten. Ergänzend zeigen UX-Journey-Ergebnisse, wo reale Nutzerpfade noch Reibung erzeugen.',
            deepDive:
                'Die KPI-Übersicht und Tiefenanalysen liefern Einzelmetriken, Benchmarks und KI-gestützte Detailauswertungen für Comprehensive-Reports. Hier finden Sie Rohdaten-Nähe, Wettbewerbsvergleiche auf Metrikebene und GEO-Fragen im Detail.',
            appendix:
                'Der Anhang dokumentiert Datenquellen, Aktualität und Verweise auf Detailansichten in CHECKION. Er dient der Nachvollziehbarkeit und für technische Vertiefung außerhalb des PDFs.',
        },
        chapterPrefix: 'Kapitel',
    },
    en: {
        reportTitle: 'Project Report',
        reportSubtitle: 'Executive Overview',
        executiveSummary: 'Executive Summary',
        siteQuality: 'Site Quality & UX',
        seoRankings: 'SEO & Rankings',
        geoEeat: 'GEO & E-E-A-T',
        contentTopics: 'Content & Page Topics',
        competitorComparison: 'Competitor Comparison',
        actionPlan: 'Action Plan',
        tableOfContents: 'Table of Contents',
        appendix: 'Appendix',
        domain: 'Domain',
        industry: 'Industry',
        date: 'Date',
        pages: 'Pages',
        domainScore: 'Domain Score (UX)',
        domainScoreRank: 'Domain rank',
        wcagErrors: 'WCAG errors / warnings',
        performance: 'Performance (TTFB / FCP / LCP)',
        eco: 'CO₂ / Eco',
        noData: 'No data — start a scan',
        keywords: 'Top Keywords',
        recommendations: 'Recommendations',
        systemicIssues: 'Systemic Issues',
        dataSources: 'Data sources',
        riskAmpel: { wcag: 'Domain', geo: 'GEO', rankings: 'Rankings' },
        footerTitle: 'CHECKION Project Report',
        technicalAppendix: 'Technical Appendix',
        journeySummary: 'UX Journey Agent',
        metricsOverview: 'KPI Overview',
        keyFindings: 'Key Findings',
        metricLabel: 'Metric',
        metricValue: 'Value',
        metricBenchmark: 'Benchmark',
        keywordDetails: 'Keyword Details & Trends',
        geoQuestionHistory: 'GEO Question History',
        geoPageAnalysis: 'GEO Page Analysis',
        issueGroups: 'Issue Groups',
        seoTechnical: 'SEO Technical Rollup',
        sectionAnalysis: 'Deep Analysis',
        comprehensiveSubtitle: 'Comprehensive Analysis',
        competitiveBenchmark: 'Competitive Benchmark (Deep Scan)',
        topicOverlap: 'Page Topics — Overlap',
        competitiveInsights: 'Competitive Insights',
        scoreboard: 'Scoreboard',
        geoModelBenchmark: 'LLM visibility by model',
        geoQuestionAnalysis: 'GEO test queries & citations',
        geoOnPageEeat: 'On-page GEO & E-E-A-T',
        geoAgentAnalysis: 'AI GEO assessment',
        geoInsights: 'GEO insights',
        geoTrend: 'Trend',
        geoAvgPosition: 'Avg position',
        geoModel: 'LLM model',
        geoRank: 'Rank',
        geoTopCited: 'Top citations',
        geoDomain: 'Domain',
        geoNotCited: 'not cited',
        geoTrendLabels: {
            improving: 'improving',
            declining: 'declining',
            stable: 'stable',
            unknown: 'unknown',
        },
        audienceReality: 'Audiences & Personas (AUDION)',
        audienceTargetGroups: 'Target groups',
        audiencePersonas: 'Personas',
        audienceStrongFit: 'Strong fit',
        audienceWeakFit: 'Weak fit',
        audiencePainPoints: 'Pain points',
        audiencePillar: 'Pillar',
        audienceFit: 'Fit',
        audienceScore: 'Score',
        audiencePillarRankings: 'Rankings',
        audiencePillarPerformance: 'Performance',
        audiencePillarTopics: 'Topics',
        audienceGeoMatches: 'Relevant GEO questions',
        audienceMorePersonas: 'more personas in AUDION project',
        audiencePersonaPerspective: 'Persona perspective',
        audienceSubScores: 'Detail scores (persona view)',
        audiencePillarNote: 'Note',
        audienceFitLabels: {
            strong: 'strong',
            mixed: 'mixed',
            weak: 'weak',
            unknown: '–',
        },
        chapterIntros: {
            executive:
                'The executive summary condenses the overall picture: domain health, key risks, and how SEO, GEO, and UX fit together. Read this section first — the following chapters drill into metrics and detailed analyses.',
            siteQuality:
                'Site Quality & UX assesses technical and experiential quality via the domain score, performance metrics, and recurring issues across pages. Use it to see whether accessibility, speed, or stability are holding back users and rankings.',
            seo: 'SEO & Rankings shows on-page health and SERP positions. Scores, keyword ranks, and trends highlight gaps versus competitors that deserve priority.',
            geo: 'GEO & E-E-A-T measures visibility and citations in AI answers (ChatGPT, Perplexity, etc.), plus classic experience, expertise, and trust signals. This chapter links visibility scores to concrete optimization guidance.',
            topics:
                'Content & Page Topics maps thematic coverage and how you compare to competitors. Use it to understand content gaps and overlaps strategically.',
            audience:
                'Audiences & Personas (AUDION) translate metrics into human perspectives: how UX, SEO, and GEO fit defined personas and goals. It helps prioritize work from a user viewpoint, not only technically.',
            actions:
                'The action plan lists prioritized recommendations from all analyses — from quick fixes to strategic projects. UX journey results show where real user paths still create friction.',
            deepDive:
                'KPI overview and deep dives provide per-metric detail, benchmarks, and AI-assisted analysis for comprehensive reports. Expect raw-data proximity, competitive metric comparisons, and GEO question detail.',
            appendix:
                'The appendix documents data sources, freshness, and links to detail views in CHECKION. It supports traceability and technical follow-up outside the PDF.',
        },
        chapterPrefix: 'Chapter',
    },
};

export function getProjectReportPdfLabels(locale: ProjectReportLocale): ProjectReportPdfLabels {
    return LABELS[locale];
}
