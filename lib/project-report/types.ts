/**
 * Project executive report bundle types (version 1.0).
 */

import type { AggregatedEco, AggregatedPerformance } from '@/lib/domain-aggregation';
import type { AggregatedPageClassification } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { ProjectReportNarrative } from '@/lib/project-report/narrative-schema';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

import type { ReportProgress } from '@/lib/project-report/progress';

export type ProjectReportLocale = 'de' | 'en';
/** executive = fast (~1–2 min); full = appendix; comprehensive = deep multi-agent (~5–15 min) */
export type ProjectReportVariant = 'executive' | 'full' | 'comprehensive';
export type ProjectReportRunStatus = 'queued' | 'running' | 'complete' | 'error';
export type ProjectReportBundleVersion = '1.0' | '2.0';

export interface ProvenanceEntry {
    evidenceId: string;
    source: string;
    label: string;
    value?: string | number | null;
}

export interface FreshnessSource {
    key: string;
    label: string;
    updatedAt: string | null;
    available: boolean;
}

export interface FreshnessMeta {
    sources: FreshnessSource[];
}

export interface ProjectFacts {
    id: string;
    name: string;
    domain: string | null;
    industry: string | null;
    valueProposition: string | null;
    tags: string[];
    competitors: string[];
    counts: {
        domainScans: number;
        journeyRuns: number;
        geoEeatRuns: number;
        singleScans: number;
        rankTrackingKeywords: number;
    };
}

export interface DomainPerformanceFacts {
    avgTtfb: number | null;
    avgFcp: number | null;
    avgLcp: number | null;
}

export interface DomainEcoFacts {
    avgCo2: number | null;
    gradeDistribution: Record<string, number>;
}

export interface SystemicIssueFact {
    issueId: string;
    title: string;
    count: number;
    evidenceId: string;
}

export interface DomainFacts {
    scanId: string;
    domain: string;
    score: number;
    wcagScore: number;
    seoOnPageScore: number;
    seoOnPageLabel: string;
    totalPageCount: number;
    scannedAt: string | null;
    issueStats: { errors: number; warnings: number; notices: number };
    performance: DomainPerformanceFacts | null;
    eco: DomainEcoFacts | null;
    pageClassification: AggregatedPageClassification | null;
    systemicIssues: SystemicIssueFact[];
    llmSummary: UxCxSummary | null;
    evidenceIds: {
        wcagScore: string;
        seoScore: string;
        domainScore: string;
    };
}

export interface CompetitorFacts {
    domain: string;
    scanId: string | null;
    status: string;
    score: number;
    wcagScore: number;
    seoOnPageScore: number;
    seoOnPageLabel: string;
    totalPageCount: number;
    pageClassification: AggregatedPageClassification | null;
    issueStats: { errors: number; warnings: number; notices: number };
    performance: DomainPerformanceFacts | null;
    eco: DomainEcoFacts | null;
    systemicIssues: SystemicIssueFact[];
    llmSummary: UxCxSummary | null;
    evidenceIds: { wcagScore: string; seoScore: string; domainScore: string };
    evidenceId: string;
}

/** Per-domain score row in competitive benchmark (own + deep-scanned competitors). */
export interface CompetitorScoreComparison {
    domain: string;
    isOwn: boolean;
    scanStatus: string;
    domainScore: number;
    wcagScore: number;
    seoOnPageScore: number;
    totalPageCount: number;
    wcagErrors: number | null;
    avgLcp: number | null;
    avgCo2: number | null;
    geoScore: number | null;
    rankingScore: number | null;
    wcagDeltaVsOwn: number | null;
    seoDeltaVsOwn: number | null;
    evidenceId: string;
}

export interface TopicOverlapThemeSnapshot {
    score: number;
    pageCount: number;
    maxTier: number;
    avgTier: number;
}

export interface TopicOverlapRow {
    themeTag: string;
    themeTagKey: string;
    own: TopicOverlapThemeSnapshot | null;
    competitors: Record<string, TopicOverlapThemeSnapshot>;
    presentOn: string[];
    evidenceId: string;
}

export interface CompetitiveInsightFact {
    id: string;
    kind: 'lead' | 'gap' | 'parity' | 'topic_gap' | 'topic_lead';
    title: string;
    description: string;
    evidenceId: string;
}

export interface CompetitiveBenchmarkFacts {
    scoreboard: CompetitorScoreComparison[];
    topicOverlap: TopicOverlapRow[];
    deterministicInsights: CompetitiveInsightFact[];
    summary: {
        completeCompetitorCount: number;
        ownWcagRank: number;
        ownSeoRank: number;
        sharedThemeCount: number;
        uniqueOwnThemes: number;
        themesOnlyCompetitorsHave: number;
    };
}

export interface RankingKeywordFact {
    id: string;
    keyword: string;
    position: number | null;
    evidenceId: string;
}

export interface RankingFacts {
    score: number | null;
    keywordCount: number;
    lastUpdated: string | null;
    competitorScores: Record<string, number>;
    topKeywords: RankingKeywordFact[];
    evidenceId: string;
}

export interface GeoRecommendationFact {
    title: string;
    description: string;
    priority?: number;
}

export interface GeoCompetitiveDomainFact {
    domain: string;
    shareOfVoice: number | null;
    avgPosition: number | null;
    score: number | null;
    evidenceId: string;
}

export interface GeoFacts {
    score: number | null;
    runId: string | null;
    runUrl: string | null;
    runCreatedAt: string | null;
    status: string | null;
    recommendations: GeoRecommendationFact[];
    competitiveDomains: GeoCompetitiveDomainFact[];
    competitorScores: Record<string, number>;
    evidenceId: string;
}

/** Rank position history point for trend charts (V2). */
export interface RankTrendPoint {
    recordedAt: string;
    position: number | null;
}

export interface RankTrendSeries {
    keywordId: string;
    keyword: string;
    points: RankTrendPoint[];
}

export interface JourneySummaryFact {
    runId: string;
    url: string;
    task: string;
    status: string;
    createdAt: string;
    stepCount: number | null;
    summary: string | null;
}

/** Single KPI with interpretation for comprehensive reports. */
export interface MetricInsight {
    id: string;
    pillar: 'wcag' | 'seo' | 'geo' | 'rankings' | 'performance' | 'eco' | 'competitive';
    label: string;
    value: string | number | null;
    unit?: string;
    benchmark?: string;
    interpretation?: string;
    evidenceId: string;
}

export interface SectionAnalysis {
    title: string;
    summary: string;
    keyFindings: string[];
    metricsHighlighted: string[];
}

export interface GeoQuestionHistoryPointFact {
    recordedAt: string;
    avgPosition: number | null;
}

export interface GeoQuestionHistoryFact {
    queryText: string;
    queryIndex: number;
    points: GeoQuestionHistoryPointFact[];
    latestPosition: number | null;
    trend: 'improving' | 'declining' | 'stable' | 'unknown';
    evidenceId: string;
}

export interface GeoPageAnalysisFact {
    url: string;
    title?: string;
    geoFitnessScore: number | null;
    trustScore: number | null;
    experienceScore: number | null;
    expertiseScore: number | null;
    missingElements: string[];
}

export interface RankKeywordDetailFact {
    id: string;
    keyword: string;
    position: number | null;
    previousPosition: number | null;
    positionDelta: number | null;
    serpLeaderDomain: string | null;
    competitorPositions: Record<string, number | null>;
    points: RankTrendPoint[];
    evidenceId: string;
}

export interface IssueGroupFact {
    groupKey: string;
    title: string;
    type: string;
    pageCount: number;
    wcagLevel?: string;
    evidenceId: string;
}

export interface SeoRollupFacts {
    pagesMissingTitle: number | null;
    pagesMissingMeta: number | null;
    pagesMissingH1: number | null;
    duplicateTitles: number | null;
    brokenLinksCount: number | null;
    jsonLdPages: number | null;
}

export interface ProjectReportDeepAnalysis {
    metrics: MetricInsight[];
    sections: {
        siteQuality: SectionAnalysis | null;
        seoRankings: SectionAnalysis | null;
        geo: SectionAnalysis | null;
        competitive: SectionAnalysis | null;
        journey: SectionAnalysis | null;
    };
    geoQuestionHistory: GeoQuestionHistoryFact[];
    geoPages: GeoPageAnalysisFact[];
    rankKeywordDetails: RankKeywordDetailFact[];
    issueGroups: IssueGroupFact[];
    seoRollup: SeoRollupFacts | null;
    competitiveBenchmark: CompetitiveBenchmarkFacts | null;
}

export interface ProjectReportBundle {
    version: ProjectReportBundleVersion;
    generatedAt: string;
    locale: ProjectReportLocale;
    variant: ProjectReportVariant;
    project: ProjectFacts;
    domain: DomainFacts | null;
    competitors: CompetitorFacts[];
    rankings: RankingFacts | null;
    geo: GeoFacts | null;
    rankTrends: RankTrendSeries[];
    journey: JourneySummaryFact | null;
    visuals: VisualSpec[];
    narrative: ProjectReportNarrative | null;
    /** Populated for full/comprehensive variants */
    deep: ProjectReportDeepAnalysis | null;
    provenance: ProvenanceEntry[];
    freshness: FreshnessMeta;
    /** Deep links for appendix (paths only — resolve with origin in client). */
    links: {
        projectPath: string;
        domainScanPath: string | null;
        geoRunPath: string | null;
        rankingsPath: string;
    };
}

export interface CollectProjectReportOptions {
    locale: ProjectReportLocale;
    variant: ProjectReportVariant;
}
