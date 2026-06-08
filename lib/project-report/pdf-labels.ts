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
}

const LABELS: Record<ProjectReportLocale, ProjectReportPdfLabels> = {
    de: {
        reportTitle: 'Projekt-Report',
        reportSubtitle: 'Executive Lagebild',
        executiveSummary: 'Executive Summary',
        siteQuality: 'Site Quality & WCAG',
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
        wcagErrors: 'WCAG Fehler / Warnungen',
        performance: 'Performance (TTFB / FCP / LCP)',
        eco: 'CO₂ / Eco',
        noData: 'Keine Daten — Scan starten',
        keywords: 'Top Keywords',
        recommendations: 'Empfehlungen',
        systemicIssues: 'Systemische Issues',
        dataSources: 'Datenquellen',
        riskAmpel: { wcag: 'WCAG', geo: 'GEO', rankings: 'Rankings' },
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
    },
    en: {
        reportTitle: 'Project Report',
        reportSubtitle: 'Executive Overview',
        executiveSummary: 'Executive Summary',
        siteQuality: 'Site Quality & WCAG',
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
        wcagErrors: 'WCAG errors / warnings',
        performance: 'Performance (TTFB / FCP / LCP)',
        eco: 'CO₂ / Eco',
        noData: 'No data — start a scan',
        keywords: 'Top Keywords',
        recommendations: 'Recommendations',
        systemicIssues: 'Systemic Issues',
        dataSources: 'Data sources',
        riskAmpel: { wcag: 'WCAG', geo: 'GEO', rankings: 'Rankings' },
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
    },
};

export function getProjectReportPdfLabels(locale: ProjectReportLocale): ProjectReportPdfLabels {
    return LABELS[locale];
}
