/**
 * Zod schema for LLM-generated project report narrative.
 */

import { z } from 'zod';

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'unknown']);

export const ProjectReportFindingSchema = z.object({
    title: z.string(),
    description: z.string(),
    severity: RiskLevelSchema.optional(),
    evidenceIds: z.array(z.string()).min(1),
});

export const ProjectReportRecommendationSchema = z.object({
    title: z.string(),
    description: z.string(),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    category: z.string().optional(),
    evidenceIds: z.array(z.string()).min(1),
});

export const ProjectReportRiskAmpelSchema = z.object({
    wcag: RiskLevelSchema,
    geo: RiskLevelSchema,
    rankings: RiskLevelSchema,
});

export const SiteQualityMetricInterpretationsSchema = z.object({
    domainScore: z.string().optional(),
    wcagErrors: z.string().optional(),
    performance: z.string().optional(),
    eco: z.string().optional(),
    systemicIssues: z.string().optional(),
});

/** Section-specific KPI explanations — keys vary by chapter (site quality, SEO, …). */
export const MetricInterpretationsSchema = z.record(z.string(), z.string()).optional();

export const SectionAnalysisSchema = z.object({
    title: z.string(),
    summary: z.string(),
    keyFindings: z.array(z.string()),
    metricsHighlighted: z.array(z.string()),
    metricInterpretations: MetricInterpretationsSchema,
});

export type SiteQualityMetricInterpretations = z.infer<typeof SiteQualityMetricInterpretationsSchema>;
export type MetricInterpretations = z.infer<typeof MetricInterpretationsSchema>;

export const ProjectReportNarrativeSchema = z.object({
    executiveSummary: z.string(),
    competitiveLandscape: z.string().optional(),
    findings: z.array(ProjectReportFindingSchema),
    recommendations: z.array(ProjectReportRecommendationSchema),
    riskAmpel: ProjectReportRiskAmpelSchema,
    sections: z
        .object({
            siteQuality: SectionAnalysisSchema.optional(),
            seoRankings: SectionAnalysisSchema.optional(),
            geo: SectionAnalysisSchema.optional(),
            competitive: SectionAnalysisSchema.optional(),
            journey: SectionAnalysisSchema.optional(),
        })
        .optional(),
    modelUsed: z.string().optional(),
    generatedAt: z.string().optional(),
    synthesisAvailable: z.boolean().optional(),
});

export type SectionAnalysis = z.infer<typeof SectionAnalysisSchema>;
export type ProjectReportFinding = z.infer<typeof ProjectReportFindingSchema>;
export type ProjectReportRecommendation = z.infer<typeof ProjectReportRecommendationSchema>;
export type ProjectReportRiskAmpel = z.infer<typeof ProjectReportRiskAmpelSchema>;
export type ProjectReportNarrative = z.infer<typeof ProjectReportNarrativeSchema>;

export const PLACEHOLDER_NARRATIVE: ProjectReportNarrative = {
    executiveSummary: '',
    findings: [],
    recommendations: [],
    riskAmpel: { wcag: 'unknown', geo: 'unknown', rankings: 'unknown' },
    synthesisAvailable: false,
};
