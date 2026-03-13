/**
 * Zod schemas for API request body validation.
 * Use parseApiBody() to parse + validate and return apiError on failure.
 */
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { apiError, API_STATUS } from './api-error-handler';

/** URL string that must be valid HTTP/HTTPS */
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .refine(
    (s) => {
      try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL format. Include protocol (e.g. https://example.com).' }
  );

/** WCAG standard */
export const wcagStandardSchema = z.enum(['WCAG2A', 'WCAG2AA', 'WCAG2AAA']).optional();

/** Scan runners */
export const runnersSchema = z.array(z.enum(['axe', 'htmlcs'])).optional();

/** POST /api/scan */
export const scanBodySchema = z.object({
  url: urlSchema,
  standard: wcagStandardSchema,
  runners: runnersSchema,
  targetRegion: z.string().max(10).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

/** POST /api/scan/domain */
export const scanDomainBodySchema = z.object({
  url: urlSchema,
  useSitemap: z.boolean().optional(),
  maxPages: z.number().int().min(1).optional(),
  projectId: z.string().uuid().nullable().optional(),
});

/** POST /api/scan/journey-agent */
export const journeyAgentBodySchema = z.object({
  url: urlSchema,
  task: z.string().min(1, 'Task is required'),
  projectId: z.string().uuid().nullable().optional(),
});

/** POST /api/scan/domain/[id]/journey */
export const domainJourneyBodySchema = z.object({
  goal: z.string().min(1, 'Goal is required'),
  stream: z.boolean().optional(),
});

/** POST /api/scan/geo-eeat */
export const geoEeatBodySchema = z.object({
  url: urlSchema,
  domainScanId: z.string().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  runCompetitive: z.boolean().optional(),
  competitors: z.array(z.string()).optional(),
  queries: z.array(z.string()).optional(),
  generateQueries: z.boolean().optional(),
}).refine(
  (data) => {
    if (!data.runCompetitive) return true;
    const hasCompetitors = Array.isArray(data.competitors) && data.competitors.length > 0;
    const hasQueries = Array.isArray(data.queries) && data.queries.length > 0;
    return hasCompetitors || hasQueries;
  },
  { message: 'When runCompetitive is true, provide competitors and/or queries.' }
);

/** Password complexity: min 8 chars, at least one uppercase, one lowercase, one digit */
const PASSWORD_MIN_LENGTH = 8;
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter')
  .refine((p) => /[a-z]/.test(p), 'Password must contain at least one lowercase letter')
  .refine((p) => /\d/.test(p), 'Password must contain at least one digit');

/** POST /api/share */
export const shareBodySchema = z.object({
  type: z.enum(['single', 'domain', 'journey', 'geo_eeat']),
  id: z.string().min(1, 'ID is required'),
  password: z.string().optional(),
});

/** POST /api/auth/register */
export const registerBodySchema = z.object({
  email: z.string().email('Valid email required'),
  password: passwordSchema,
  name: z.string().optional(),
});

/** POST /api/auth/change-password */
export const changePasswordBodySchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
});

/** POST /api/saliency/generate */
export const saliencyGenerateBodySchema = z.object({
  scanId: z.string().min(1, 'scanId is required'),
});

/** POST /api/scan/geo-eeat/suggest-competitors-queries */
export const suggestCompetitorsBodySchema = z.object({
  url: z.string().min(1, 'URL is required').refine(
    (s) => {
      try {
        new URL(s.startsWith('http') ? s : `https://${s}`);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL' }
  ),
});

/** POST /api/tools/readability */
export const readabilityBodySchema = z.object({
  text: z.string().min(1, 'Text is required'),
}).refine((d) => d.text.replace(/\s+/g, ' ').trim().length > 0, { message: 'Text is empty' });

/** PATCH /api/share/[token] */
export const sharePasswordBodySchema = z.object({
  password: z.union([z.string(), z.null()]),
});

/** POST /api/share/[token]/access */
export const shareAccessBodySchema = z.object({
  password: z.string().optional(),
});

/** POST /api/journeys */
export const journeysBodySchema = z.object({
  domainScanId: z.string().min(1, 'domainScanId is required'),
  goal: z.string().min(1, 'Goal is required'),
  result: z.object({
    steps: z.array(z.unknown()),
  }),
  name: z.string().optional(),
});

/** POST /api/projects (create project) */
export const projectCreateBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  domain: z.string().optional().nullable(),
});

/** PATCH /api/projects/[id] (update project) */
export const projectUpdateBodySchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().optional().nullable(),
  competitors: z.array(z.string().trim().min(1)).optional(),
});

/** PATCH .../project (assign resource to project) */
export const projectAssignmentBodySchema = z.object({
  projectId: z.string().uuid().nullable(),
});

/** 2-letter locale code (gl or hl) for SERP main markets */
const twoLetterLocale = z.string().length(2, 'Use 2-letter code (e.g. de, en)').transform((s) => s.toLowerCase().trim());

/** POST /api/rank-tracking/keywords – country and language required (main markets) */
export const rankTrackingKeywordCreateBodySchema = z.object({
  projectId: z.string().uuid().min(1, 'projectId is required'),
  domain: z.string().min(1, 'domain is required'),
  keyword: z.string().min(1, 'keyword is required'),
  country: twoLetterLocale,
  language: twoLetterLocale,
  device: z.string().max(20).optional().nullable(),
});

/** POST /api/rank-tracking/refresh */
export const rankTrackingRefreshBodySchema = z.object({
  keywordId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
}).refine((d) => d.keywordId != null || d.projectId != null, {
  message: 'Provide keywordId or projectId',
});

function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  if (!first) return 'Validation failed';
  const path = first.path?.length ? first.path.join('.') + ': ' : '';
  const msg = typeof first.message === 'string' ? first.message : 'Invalid value';
  return path + msg;
}

/**
 * Parse request JSON and validate with Zod schema.
 * Returns NextResponse (error) or the parsed data.
 */
export async function parseApiBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<NextResponse | T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return apiError('Invalid JSON', API_STATUS.BAD_REQUEST);
  }

  const result = schema.safeParse(raw);
  if (result.success) return result.data;

  const message = formatZodError(result.error);
  return apiError(message, API_STATUS.BAD_REQUEST);
}
