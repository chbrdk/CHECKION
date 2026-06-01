/**
 * Project research result schema for OpenAI Structured Outputs.
 * Used by POST /api/projects/[id]/research.
 *
 * OpenAI rejects z.record() (propertyNames). LLM returns market-keyed lists as arrays;
 * API responses use Record<string, string[]>.
 */
import { z } from 'zod';

const stringArray = z.array(z.string().trim()).min(1).max(20);

/** One market's keyword/query list (OpenAI-safe, no dynamic object keys). */
export const marketStringsEntrySchema = z.object({
  marketKey: z.string(),
  items: stringArray,
});

/** Parsed model output – passed to zodResponseFormat. */
export const projectResearchOpenAISchema = z.object({
  targetGroups: stringArray,
  valueProposition: z.string().trim().max(500).nullable(),
  /** Flat list (primary market or legacy). */
  seoKeywords: stringArray,
  /** Per market; null when single-market / not used. */
  seoKeywordsByMarket: z.array(marketStringsEntrySchema).nullable(),
  geoQueries: stringArray,
  geoQueriesByMarket: z.array(marketStringsEntrySchema).nullable(),
  competitors: stringArray,
  marketKeys: z.array(z.string()).nullable(),
});

export type ProjectResearchOpenAIResult = z.infer<typeof projectResearchOpenAISchema>;

export type ProjectResearchResult = Omit<
  ProjectResearchOpenAIResult,
  'seoKeywordsByMarket' | 'geoQueriesByMarket'
> & {
  seoKeywordsByMarket: Record<string, string[]> | null;
  geoQueriesByMarket: Record<string, string[]> | null;
};

const marketRecordSchema = z.record(z.string(), stringArray);

/** Validates normalized API JSON (not sent to OpenAI). */
export const projectResearchResultSchema = z.object({
  targetGroups: stringArray,
  valueProposition: z.string().trim().max(500).nullable(),
  seoKeywords: stringArray,
  seoKeywordsByMarket: marketRecordSchema.nullable(),
  geoQueries: stringArray,
  geoQueriesByMarket: marketRecordSchema.nullable(),
  competitors: stringArray,
  marketKeys: z.array(z.string()).nullable(),
});

export function marketEntriesToRecord(
  entries: z.infer<typeof marketStringsEntrySchema>[] | null | undefined
): Record<string, string[]> {
  if (!entries?.length) return {};
  const out: Record<string, string[]> = {};
  for (const { marketKey, items } of entries) {
    const key = marketKey.trim().toLowerCase();
    if (key) out[key] = items;
  }
  return out;
}

export function normalizeResearchResult(
  data: ProjectResearchOpenAIResult,
  fallbackMarketKeys: string[]
): ProjectResearchResult {
  const keys = data.marketKeys?.length ? data.marketKeys : fallbackMarketKeys;
  const primary = keys[0] ?? fallbackMarketKeys[0] ?? 'de-de';
  const seoBy = marketEntriesToRecord(data.seoKeywordsByMarket);
  const geoBy = marketEntriesToRecord(data.geoQueriesByMarket);
  return {
    targetGroups: data.targetGroups,
    valueProposition: data.valueProposition,
    competitors: data.competitors,
    marketKeys: keys,
    seoKeywords: seoBy[primary]?.length ? seoBy[primary]! : data.seoKeywords,
    geoQueries: geoBy[primary]?.length ? geoBy[primary]! : data.geoQueries,
    seoKeywordsByMarket: Object.keys(seoBy).length ? seoBy : null,
    geoQueriesByMarket: Object.keys(geoBy).length ? geoBy : null,
  };
}
