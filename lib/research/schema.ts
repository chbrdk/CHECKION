/**
 * Project research result schema for OpenAI Structured Outputs.
 * Used by POST /api/projects/[id]/research.
 */
import { z } from 'zod';

const stringArray = z.array(z.string().trim()).min(1).max(20);
const marketKeyedStrings = z.record(z.string(), stringArray);

export const projectResearchResultSchema = z.object({
  targetGroups: stringArray,
  valueProposition: z.string().trim().max(500).nullable(),
  /** Flat list (primary market or legacy). */
  seoKeywords: stringArray,
  /** Per marketKey (e.g. de-de, us-en). */
  seoKeywordsByMarket: marketKeyedStrings.optional(),
  geoQueries: stringArray,
  geoQueriesByMarket: marketKeyedStrings.optional(),
  competitors: stringArray,
  /** Market keys used for this research run. */
  marketKeys: z.array(z.string()).optional(),
});

export type ProjectResearchResult = z.infer<typeof projectResearchResultSchema>;
