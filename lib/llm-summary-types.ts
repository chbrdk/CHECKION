/**
 * Types and Zod schema for the LLM-generated UX/CX summary.
 */

import { z } from 'zod';

export const UxCxThemeSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    severity: z.enum(['high', 'medium', 'low']).optional(),
});

export const UxCxRecommendationSchema = z.object({
    title: z.string(),
    description: z.string(),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    category: z.string().optional(),
});

/** Schema for parsing LLM output (modelUsed/generatedAt are set by the backend). */
export const UxCxSummarySchema = z.object({
    summary: z.string(),
    themes: z.array(UxCxThemeSchema),
    recommendations: z.array(UxCxRecommendationSchema),
    overallGrade: z.string().optional(),
    modelUsed: z.string().optional(),
    generatedAt: z.string().optional(),
});

export type UxCxTheme = z.infer<typeof UxCxThemeSchema>;
export type UxCxRecommendation = z.infer<typeof UxCxRecommendationSchema>;

export interface UxCxSummary {
    /** 2–4 Sätze Gesamtbewertung (UX/CX + A11y) */
    summary: string;
    /** Themenbündel mit Kurzbeschreibung oder Schwere */
    themes: Array<{ name: string; description?: string; severity?: 'high' | 'medium' | 'low' }>;
    /** Konkrete Handlungsempfehlungen, priorisiert */
    recommendations: Array<{
        title: string;
        description: string;
        priority: 1 | 2 | 3 | 4 | 5;
        category?: string;
    }>;
    /** Optional: Gesamtnote oder Reifegrad */
    overallGrade?: string;
    modelUsed: string;
    generatedAt: string;
}
