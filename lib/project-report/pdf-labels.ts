/**
 * PDF label strings for project report (de/en).
 */

import type { ProjectReportLocale } from '@/lib/project-report/types';

export function formatAudiencePersonasPdfCaption(
    locale: 'de' | 'en',
    shown: number,
    total: number,
    morePersonasLabel: string
): string {
    if (locale === 'de') {
        const base = `${shown} differenzierendste Personas von ${total}`;
        return total > shown ? `${base} · ${morePersonasLabel}` : base;
    }
    const base = `${shown} most distinct personas of ${total}`;
    return total > shown ? `${base} · ${morePersonasLabel}` : base;
}

export function formatAudiencePillarFitLegend(labels: ProjectReportPdfLabels): string {
    return `+ ${labels.audienceFitLabels.strong} · ~ ${labels.audienceFitLabels.mixed} · − ${labels.audienceFitLabels.weak}`;
}

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
    seoOnPage: string;
    seoOnPageSection: string;
    seoOnPageLabel: string;
    serpKeywordRankings: string;
    rankingScore: string;
    rankTrends: string;
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
    rankingCompetitorComparison: string;
    geoQuestionHistory: string;
    geoPageAnalysis: string;
    issueGroups: string;
    seoTechnical: string;
    sectionAnalysis: string;
    comprehensiveSubtitle: string;
    competitiveBenchmark: string;
    competitiveScanChanges: string;
    scanChangesNewPages: string;
    scanChangesUpdatedPages: string;
    scanChangesRemovedPages: string;
    scanChangesNewThemes: string;
    scanChangesDomain: string;
    topicOverlap: string;
    competitiveInsights: string;
    scoreboard: string;
    competitiveOwnDomainNote: string;
    topicOverlapTheme: string;
    topicOverlapOwn: string;
    topicOverlapBestCompetitor: string;
    topicOverlapStatus: string;
    topicOverlapStatusGap: string;
    topicOverlapStatusLead: string;
    topicOverlapStatusShared: string;
    uniqueOwnThemes: string;
    themesOnlyCompetitorsHave: string;
    serpLeader: string;
    seoRank: string;
    geoModelBenchmark: string;
    geoQuestionAnalysis: string;
    geoOnPageEeat: string;
    geoAgentAnalysis: string;
    geoInsights: string;
    geoScore: string;
    llmModels: string;
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
    marketSignals: string;
    marketSignalsSource: string;
    marketSignalsFindings: string;
    marketSignalsImplications: string;
    marketSignalsWatchlist: string;
    marketSignalsContradictions: string;
    marketSignalsEvidenceGaps: string;
    marketSignalsSources: string;
    marketSignalsConfidence: string;
    chapterIntros: {
        executive: string;
        marketSignals: string;
        siteQuality: string;
        systemicIssues: string;
        seo: string;
        seoOnPage: string;
        serpRankings: string;
        keywords: string;
        rankTrends: string;
        geo: string;
        geoModelVisibility: string;
        geoCompetitive: string;
        geoInsights: string;
        geoRecommendations: string;
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
        seoRankings: 'SEO',
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
        seoOnPage: 'SEO On-Page',
        seoOnPageSection: 'On-Page SEO',
        seoOnPageLabel: 'On-Page-Einordnung',
        serpKeywordRankings: 'SERP & Keyword-Rankings',
        rankingScore: 'Ranking-Score',
        rankTrends: 'Rank-Trends',
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
        rankingCompetitorComparison: 'Ranking-Vergleich Wettbewerber',
        geoQuestionHistory: 'GEO-Fragen-Verlauf',
        geoPageAnalysis: 'GEO Seitenanalyse',
        issueGroups: 'Issue-Gruppen',
        seoTechnical: 'SEO Technik-Rollup',
        sectionAnalysis: 'Tiefenanalyse',
        comprehensiveSubtitle: 'Umfassende Analyse',
        competitiveBenchmark: 'Wettbewerbs-Benchmark (Deep Scan)',
        competitiveScanChanges: 'Änderungen seit letztem Scan',
        scanChangesNewPages: 'Neue Seiten',
        scanChangesUpdatedPages: 'Aktualisierte Seiten',
        scanChangesNewThemes: 'Neue/verstärkte Themen',
        scanChangesRemovedPages: 'Entfernt',
        scanChangesDomain: 'Domain',
        topicOverlap: 'Seitenthemen — Overlap',
        competitiveInsights: 'Wettbewerbs-Erkenntnisse',
        scoreboard: 'Scoreboard',
        competitiveOwnDomainNote: 'Eigene Domain',
        topicOverlapTheme: 'Thema',
        topicOverlapOwn: 'Eigene',
        topicOverlapBestCompetitor: 'Bester Wettbewerber',
        topicOverlapStatus: 'Status',
        topicOverlapStatusGap: 'Lücke',
        topicOverlapStatusLead: 'Alleinstellung',
        topicOverlapStatusShared: 'Gemeinsam',
        uniqueOwnThemes: 'Eigene Top-Themen',
        themesOnlyCompetitorsHave: 'Nur beim Wettbewerb',
        serpLeader: 'SERP-Leader',
        seoRank: 'SEO-Rang',
        geoModelBenchmark: 'LLM-Sichtbarkeit nach Modell',
        geoQuestionAnalysis: 'GEO-Testfragen & Zitationen',
        geoOnPageEeat: 'On-Page GEO & E-E-A-T',
        geoAgentAnalysis: 'KI-Bewertung GEO',
        geoInsights: 'GEO-Erkenntnisse',
        geoScore: 'GEO-Score',
        llmModels: 'LLM-Modelle',
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
        marketSignals: 'Markt & Signale',
        marketSignalsSource: 'ECHON · externe Signale & Research (persona-bezogen)',
        marketSignalsFindings: 'Zentrale Markt-Findings',
        marketSignalsImplications: 'Implikationen für die Website',
        marketSignalsWatchlist: 'Watchlist',
        marketSignalsContradictions: 'Spannungsfelder',
        marketSignalsEvidenceGaps: 'Evidenz-Lücken',
        marketSignalsSources: 'Quellen (Signals/Waves)',
        marketSignalsConfidence: 'Konfidenz',
        chapterIntros: {
            executive:
                'Das Executive Summary bündelt das Gesamtlagebild: Wo steht die Domain, welche Risiken sind relevant und wie ordnen sich SEO, GEO und UX ein? Lesen Sie dieses Kapitel zuerst — die folgenden Abschnitte vertiefen die Einzelbereiche mit Messwerten und Detailanalysen.',
            marketSignals:
                'Markt & Signale fasst externe ECHON-Research zusammen — Trends, Regulierung und Wettbewerbsdynamik, abgeleitet aus den verknüpften Personas. Dieses Kapitel ergänzt Scan-Daten um den Marktdruck von außen; es wiederholt nicht die Executive Summary.',
            siteQuality:
                'Site Quality & UX bewertet die technische und erlebnisbezogene Qualität Ihrer Website anhand des Domain-Scores, Performance-Kennzahlen und wiederkehrender Issues über viele Seiten. Hier erkennen Sie, ob Barrierefreiheit, Geschwindigkeit und Stabilität Ihre Nutzer und Rankings belasten.',
            systemicIssues:
                'Systemische Issues sind wiederkehrende Fehler- oder UX-Muster, die auf vielen Seiten gleich auftreten. Im Gegensatz zu Einzelfunden lässt sich hier oft mit einer zentralen Korrektur (Template, Komponente, CSS) eine große Zahl von Seiten verbessern.',
            seo: 'SEO im Report trennt zwei Blickwinkel: die On-Page-Bewertung aus dem Domain-Scan (Meta, Überschriften, technische Basics) und die messbaren SERP-Positionen Ihrer getrackten Keywords.',
            seoOnPage:
                'On-Page SEO bewertet, wie gut Ihre Seiten im Domain-Scan für Crawler aufbereitet sind — Titel, Meta-Beschreibungen, Überschriften und strukturelle Signale. Das ist unabhängig davon, ob Sie für konkrete Suchbegriffe bereits ranken.',
            serpRankings:
                'SERP & Keyword-Rankings zeigt, wo Ihre Domain bei getrackten Suchbegriffen in den Ergebnissen steht — inklusive SERP-Leadern und Trends über die Zeit.',
            keywords:
                'Getrackte Keywords sind Suchbegriffe, für die Ihre Domain in Google & Co. regelmäßig positioniert wird. Positionen (z. B. #8) zeigen, wie sichtbar Sie für konkrete Suchanfragen sind — Top 10 bedeutet erste Ergebnisseite.',
            rankTrends:
                'Rank-Trends zeigen, ob Keyword-Positionen über Wochen steigen oder fallen. Steigende Trends bedeuten bessere Sichtbarkeit; fallende Trends sind ein Frühwarnsignal für Content- oder Wettbewerbsprobleme.',
            geo: 'GEO & E-E-A-T misst, wie gut Ihre Inhalte in KI-Antworten (ChatGPT, Perplexity u. a.) gefunden und zitiert werden — ergänzt um klassische Experience-, Expertise- und Trust-Signale. Dieses Kapitel verbindet Sichtbarkeits-Scores mit konkreten Optimierungshinweisen.',
            geoModelVisibility:
                'LLM-Sichtbarkeit zeigt pro KI-Modell (GPT, Claude, Gemini …), wie oft Ihre Domain in Antworten erwähnt oder zitiert wird — inklusive durchschnittlicher Position und Share of Voice.',
            geoCompetitive:
                'Der GEO-Wettbewerbsvergleich ordnet Ihre Sichtbarkeit gegenüber anderen Domains ein: Wer wird bei denselben Fragen bevorzugt zitiert?',
            geoInsights:
                'GEO-Erkenntnisse sind automatisch erkannte Muster aus Testfragen, Modellen und On-Page-Signalen — z. B. fehlende Zitationen oder schwaches E-E-A-T auf zentralen Seiten.',
            geoRecommendations:
                'Priorisierte GEO-Empfehlungen leiten sich aus Scan, Testfragen und E-E-A-T-Analyse ab — umsetzbar als Content-, Struktur- oder Trust-Maßnahmen.',
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
        seoRankings: 'SEO',
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
        seoOnPage: 'SEO On-Page',
        seoOnPageSection: 'On-page SEO',
        seoOnPageLabel: 'On-page rating',
        serpKeywordRankings: 'SERP & keyword rankings',
        rankingScore: 'Ranking score',
        rankTrends: 'Rank trends',
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
        rankingCompetitorComparison: 'Competitor ranking comparison',
        geoQuestionHistory: 'GEO Question History',
        geoPageAnalysis: 'GEO Page Analysis',
        issueGroups: 'Issue Groups',
        seoTechnical: 'SEO Technical Rollup',
        sectionAnalysis: 'Deep Analysis',
        comprehensiveSubtitle: 'Comprehensive Analysis',
        competitiveBenchmark: 'Competitive Benchmark (Deep Scan)',
        competitiveScanChanges: 'Changes since last scan',
        scanChangesNewPages: 'New pages',
        scanChangesUpdatedPages: 'Updated pages',
        scanChangesNewThemes: 'New/strengthened themes',
        scanChangesRemovedPages: 'Removed',
        scanChangesDomain: 'Domain',
        topicOverlap: 'Page Topics — Overlap',
        competitiveInsights: 'Competitive Insights',
        scoreboard: 'Scoreboard',
        competitiveOwnDomainNote: 'Own domain',
        topicOverlapTheme: 'Theme',
        topicOverlapOwn: 'Own',
        topicOverlapBestCompetitor: 'Best competitor',
        topicOverlapStatus: 'Status',
        topicOverlapStatusGap: 'Gap',
        topicOverlapStatusLead: 'Unique',
        topicOverlapStatusShared: 'Shared',
        uniqueOwnThemes: 'Unique own themes',
        themesOnlyCompetitorsHave: 'Competitor-only themes',
        serpLeader: 'SERP leader',
        seoRank: 'SEO rank',
        geoModelBenchmark: 'LLM visibility by model',
        geoQuestionAnalysis: 'GEO test queries & citations',
        geoOnPageEeat: 'On-page GEO & E-E-A-T',
        geoAgentAnalysis: 'AI GEO assessment',
        geoInsights: 'GEO insights',
        geoScore: 'GEO score',
        llmModels: 'LLM models',
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
        marketSignals: 'Market & Signals',
        marketSignalsSource: 'ECHON · external signals & research (persona-driven)',
        marketSignalsFindings: 'Key market findings',
        marketSignalsImplications: 'Implications for the website',
        marketSignalsWatchlist: 'Watchlist',
        marketSignalsContradictions: 'Tension points',
        marketSignalsEvidenceGaps: 'Evidence gaps',
        marketSignalsSources: 'Sources (signals/waves)',
        marketSignalsConfidence: 'Confidence',
        chapterIntros: {
            executive:
                'The executive summary condenses the overall picture: domain health, key risks, and how SEO, GEO, and UX fit together. Read this section first — the following chapters drill into metrics and detailed analyses.',
            marketSignals:
                'Market & Signals summarizes external ECHON research — trends, regulation, and competitive dynamics derived from linked personas. It adds outside market pressure to scan data without repeating the executive summary.',
            siteQuality:
                'Site Quality & UX assesses technical and experiential quality via the domain score, performance metrics, and recurring issues across pages. Use it to see whether accessibility, speed, or stability are holding back users and rankings.',
            systemicIssues:
                'Systemic issues are recurring error or UX patterns that appear the same way on many pages. Unlike one-off findings, a single fix (template, component, CSS) can often improve a large share of the site.',
            seo: 'SEO in this report separates two views: on-page quality from the domain scan (meta, headings, technical basics) and measurable SERP positions for your tracked keywords.',
            seoOnPage:
                'On-page SEO reflects how well pages are prepared for crawlers in the domain scan — titles, meta descriptions, headings, and structural signals. This is independent of whether you already rank for specific queries.',
            serpRankings:
                'SERP & keyword rankings show where your domain appears for tracked search terms — including SERP leaders and trends over time.',
            keywords:
                'Tracked keywords are search terms your domain is monitored for in Google and other engines. Positions (e.g. #8) show visibility for specific queries — top 10 means the first results page.',
            rankTrends:
                'Rank trends show whether keyword positions improve or decline over weeks. Rising trends mean better visibility; falling trends warn of content or competitive issues early.',
            geo: 'GEO & E-E-A-T measures visibility and citations in AI answers (ChatGPT, Perplexity, etc.), plus classic experience, expertise, and trust signals. This chapter links visibility scores to concrete optimization guidance.',
            geoModelVisibility:
                'LLM visibility shows per AI model (GPT, Claude, Gemini, etc.) how often your domain is mentioned or cited in answers — including average position and share of voice.',
            geoCompetitive:
                'The GEO competitive comparison shows how your visibility stacks up against other domains: who gets cited for the same queries?',
            geoInsights:
                'GEO insights are automatically detected patterns from test queries, models, and on-page signals — e.g. missing citations or weak E-E-A-T on key pages.',
            geoRecommendations:
                'Prioritized GEO recommendations come from scans, test queries, and E-E-A-T analysis — actionable as content, structure, or trust improvements.',
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
