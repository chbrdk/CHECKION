/**
 * Project executive report bundle types (version 1.0).
 */

import type { AggregatedEco, AggregatedPerformance } from '@/lib/domain-aggregation';
import type { AggregatedPageClassification } from '@/lib/types';
import type { UxCxSummary } from '@/lib/llm-summary-types';
import type { ProjectReportNarrative } from '@/lib/project-report/narrative-schema';
import type { VisualSpec } from '@/lib/project-report/chart-specs';

export type ProjectReportLocale = 'de' | 'en';
export type ProjectReportVariant = 'executive' | 'full';
export type ProjectReportRunStatus = 'queued' | 'running' | 'complete' | 'error';

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
    evidenceId: string;
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

export interface ProjectReportBundle {
    version: '1.0';
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
