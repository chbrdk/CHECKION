/**
 * Types and Zod schema for the DIN EN ISO 9241-110 UX Check (Claude agent v2).
 * Stored in scans.llm_summary with version: 'ux-check-v2'.
 */

import { z } from 'zod';

export const UxCheckProblemSchema = z.object({
    title: z.string(),
    befund: z.array(z.string()).min(1).max(5),
    empfehlung: z.array(z.string()).min(1).max(5),
    heuristik: z.string(),
    severity: z.enum(['Kosmetisch', 'Gering', 'Mittel', 'Schwer', 'Kritisch']),
});
export type UxCheckProblem = z.infer<typeof UxCheckProblemSchema>;

export const UxCheckRatingRowSchema = z.object({
    kategorie: z.string(),
    unterkategorien: z.string().optional(),
    score: z.number().min(0).max(5),
    begruendung: z.string().optional(),
});
export type UxCheckRatingRow = z.infer<typeof UxCheckRatingRowSchema>;

export const UxCheckMatrixRowSchema = z.object({
    problem: z.string(),
    impact: z.string(),
    effort: z.string(),
    prioritaet: z.string(),
});
export type UxCheckMatrixRow = z.infer<typeof UxCheckMatrixRowSchema>;

/** Structured JSON block we ask Claude to output at the end of the analysis. */
export const UxCheckStructuredSchema = z.object({
    header: z.object({
        seitenTitel: z.string().optional(),
        url: z.string(),
        analysdatum: z.string().optional(),
    }).optional(),
    problems: z.array(UxCheckProblemSchema).default([]),
    positiveAspects: z.array(z.string()).default([]),
    ratingTable: z.array(UxCheckRatingRowSchema).default([]),
    impactEffortMatrix: z.array(UxCheckMatrixRowSchema).default([]),
    recommendations: z.array(z.string()).max(10).default([]),
});
export type UxCheckStructured = z.infer<typeof UxCheckStructuredSchema>;

/** Full payload stored in llm_summary when version is ux-check-v2. */
export const UxCheckV2SummarySchema = z.object({
    version: z.literal('ux-check-v2'),
    /** Optional: full markdown report for display */
    reportMarkdown: z.string().optional(),
    structured: UxCheckStructuredSchema,
    modelUsed: z.string(),
    generatedAt: z.string(),
});
export type UxCheckV2Summary = z.infer<typeof UxCheckV2SummarySchema>;

export function isUxCheckV2Summary(value: unknown): value is UxCheckV2Summary {
    return UxCheckV2SummarySchema.safeParse(value).success && (value as { version?: string }).version === 'ux-check-v2';
}
