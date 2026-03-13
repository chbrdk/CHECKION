/**
 * Project research result schema for OpenAI Structured Outputs.
 * Used by POST /api/projects/[id]/research.
 */
import { z } from 'zod';

const stringArray = z.array(z.string().trim()).min(1).max(20);

export const projectResearchResultSchema = z.object({
  targetGroups: stringArray,
  valueProposition: z.string().trim().max(500).nullable(),
  seoKeywords: stringArray,
  geoQueries: stringArray,
  competitors: stringArray,
});

export type ProjectResearchResult = z.infer<typeof projectResearchResultSchema>;
