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
            executive: 'Lagebild, Risiken und strategische Einordnung auf Basis aller Projekt-Daten.',
            siteQuality: 'Domain-Score (UX), Performance, Nachhaltigkeit und systemische Qualitätsissues.',
            seo: 'On-Page SEO, Keyword-Rankings und SERP-Trends.',
            geo: 'GEO-Score, E-E-A-T, AI-Sichtbarkeit und Empfehlungen.',
            topics: 'Seitenthemen und Deep-Scan-Vergleich mit Wettbewerbern.',
            audience: 'AUDION-Personas: KI bewertet Scans aus Persona-Sicht — vergleichbare Säulen, individuelle Insights.',
            actions: 'Priorisierte Maßnahmen und UX-Journey-Erkenntnisse.',
            deepDive: 'Einzelmetriken, Benchmarks und KI-Tiefenanalysen.',
            appendix: 'Datenquellen, Links und technischer Anhang.',
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
            executive: 'Executive overview, risks, and strategic context across all project data.',
            siteQuality: 'Domain score (UX), performance, sustainability, and systemic quality issues.',
            seo: 'On-page SEO, keyword rankings, and SERP trends.',
            geo: 'GEO score, E-E-A-T, AI visibility, and recommendations.',
            topics: 'Page topics and deep-scan competitor comparison.',
            audience: 'AUDION personas: AI evaluates scans from each persona view — comparable pillars, unique insights.',
            actions: 'Prioritized actions and UX journey insights.',
            deepDive: 'Individual metrics, benchmarks, and AI deep-dive analyses.',
            appendix: 'Data sources, links, and technical appendix.',
        },
        chapterPrefix: 'Chapter',
    },
};

export function getProjectReportPdfLabels(locale: ProjectReportLocale): ProjectReportPdfLabels {
    return LABELS[locale];
}
