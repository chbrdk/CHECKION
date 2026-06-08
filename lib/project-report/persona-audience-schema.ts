/**
 * Zod schema for persona-perspective scan evaluation (AUDION × CHECKION report ch. 06).
 */

import { z } from 'zod';

export const AudienceFitLevelSchema = z.enum(['strong', 'mixed', 'weak', 'unknown']);

export const PersonaPillarKeySchema = z.enum([
    'wcag',
    'seo',
    'geo',
    'rankings',
    'performance',
    'topics',
]);

export const PersonaAgentInsightKindSchema = z.enum([
    'persona_voice',
    'win',
    'friction',
    'content',
    'geo',
    'gap',
]);

export const PersonaAudiencePillarSchema = z.object({
    pillar: PersonaPillarKeySchema,
    score: z.number().min(0).max(100),
    level: AudienceFitLevelSchema,
    note: z.string().min(1).max(400),
});

export const PersonaAudienceSubScoreSchema = z.object({
    id: z.enum([
        'content_relevance',
        'findability',
        'trust_credibility',
        'task_clarity',
        'accessibility_impact',
        'discovery_geo',
    ]),
    label: z.string().min(1).max(80),
    score: z.number().min(0).max(100),
    level: AudienceFitLevelSchema,
    note: z.string().min(1).max(300),
});

export const PersonaAudienceAgentInsightSchema = z.object({
    kind: PersonaAgentInsightKindSchema,
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(600),
});

export const PersonaAudienceAgentResultSchema = z.object({
    personaPerspective: z.string().min(20).max(900),
    overallFit: AudienceFitLevelSchema,
    pillars: z.array(PersonaAudiencePillarSchema).min(4).max(8),
    subScores: z.array(PersonaAudienceSubScoreSchema).min(3).max(8),
    insights: z.array(PersonaAudienceAgentInsightSchema).min(2).max(8),
});

export type PersonaAudienceAgentResult = z.infer<typeof PersonaAudienceAgentResultSchema>;
