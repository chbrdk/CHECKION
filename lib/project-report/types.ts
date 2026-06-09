/**
 * Project executive report bundle types (version 1.0).
 */

import type { AggregatedEco, AggregatedPerformance } from '@/lib/domain-aggregation';
import type { AggregatedPageClassification } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type {
    ProjectReportNarrative,
    SectionAnalysis,
    SiteQualityMetricInterpretations,
} from '@/lib/project-report/narrative-schema';

export type { SectionAnalysis, SiteQualityMetricInterpretations };
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
    domainScoreDeltaVsOwn: number | null;
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
        ownDomainScoreRank: number;
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
    geoFitnessReasoning?: string | null;
    trustScore: number | null;
    experienceScore: number | null;
    expertiseScore: number | null;
    authoritativenessScore: number | null;
    trustReasoning?: string | null;
    experienceReasoning?: string | null;
    expertiseReasoning?: string | null;
    missingElements: string[];
    hasPrivacy: boolean;
    hasImpressum: boolean;
    evidenceId: string;
}

export interface GeoModelPositionFact {
    modelId: string;
    position: number | null;
    cited: boolean;
}

export interface GeoQuestionDetailFact {
    queryText: string;
    queryIndex: number;
    latestPosition: number | null;
    trend: GeoQuestionHistoryFact['trend'];
    positionsByModel: GeoModelPositionFact[];
    topCitedDomains: string[];
    points: GeoQuestionHistoryPointFact[];
    evidenceId: string;
}

export interface GeoModelBenchmarkFact {
    modelId: string;
    shareOfVoice: number | null;
    avgPosition: number | null;
    mentionCount: number | null;
    queryCount: number | null;
    visibilityScore: number | null;
    evidenceId: string;
}

export interface GeoInsightFact {
    id: string;
    kind: 'question' | 'page' | 'model' | 'eeat' | 'recommendation';
    title: string;
    description: string;
    evidenceId: string;
}

export interface GeoDeepAnalysisFact {
    modelBenchmarks: GeoModelBenchmarkFact[];
    questionDetails: GeoQuestionDetailFact[];
    pages: GeoPageAnalysisFact[];
    deterministicInsights: GeoInsightFact[];
    summary: {
        modelCount: number;
        questionCount: number;
        pageCount: number;
        avgGeoFitness: number | null;
        avgTrust: number | null;
        questionsNotCited: number;
        pagesBelowGeoThreshold: number;
    };
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
    geoDeep: GeoDeepAnalysisFact | null;
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
    /** AUDION personas aligned with CHECKION metrics (comprehensive, when linked) */
    audience: AudienceReportOverlay | null;
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

export type AudienceFitLevel = 'strong' | 'mixed' | 'weak' | 'unknown';

export interface AudiencePillarFit {
    pillar: 'wcag' | 'seo' | 'geo' | 'rankings' | 'performance' | 'topics';
    level: AudienceFitLevel;
    score: number | null;
    /** Persona-specific one-liner (agent evaluation). */
    note?: string | null;
}

export interface AudienceSubScoreFact {
    id: string;
    label: string;
    score: number;
    level: AudienceFitLevel;
    note: string;
}

export interface AudienceInsightFact {
    id: string;
    kind: 'gap' | 'content' | 'geo' | 'journey' | 'summary' | 'persona_voice' | 'win';
    title: string;
    description: string;
    evidenceId: string;
}

export interface GeoQuestionPersonaMatchFact {
    queryText: string;
    latestPosition: number | null;
    relevance: number;
}

export interface AudiencePersonaUxJourneyFact {
    task: string | null;
    success: boolean | null;
    stepsCount: number | null;
    createdAt: string | null;
}

export interface AudiencePersonaFitFact {
    personaId: string;
    personaName: string;
    targetGroupId: string | null;
    targetGroupName: string | null;
    headline: string;
    painPoints: string[];
    goals: string[];
    pillars: AudiencePillarFit[];
    overallFit: AudienceFitLevel;
    insights: AudienceInsightFact[];
    geoQuestionMatches: GeoQuestionPersonaMatchFact[];
    latestUxJourney: AudiencePersonaUxJourneyFact | null;
    evidenceId: string;
    evaluationSource?: 'deterministic' | 'agent';
    personaPerspective?: string | null;
    subScores?: AudienceSubScoreFact[];
}

export interface AudienceTargetGroupFact {
    id: string;
    name: string;
    segment: string;
    description: string | null;
    personaCount: number;
}

export interface AudienceReportOverlay {
    available: boolean;
    reason?: string;
    audionProjectId: string | null;
    audionProjectName: string | null;
    targetGroups: AudienceTargetGroupFact[];
    personas: AudiencePersonaFitFact[];
    summaryInsights: string[];
}
