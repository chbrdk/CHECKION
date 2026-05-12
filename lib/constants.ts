/**
 * Central place for app-wide paths and asset URLs.
 * Do not hardcode paths in components – reference these constants.
 */

import { toScanStartUrl } from '@/lib/url-normalize';

/** When the app is served under a subpath (e.g. /checkion), set NEXT_PUBLIC_APP_BASE_URL and ideally BASE_PATH to that path so API fetches, redirects, and assets stay aligned. */
const APP_BASE_URL =
  typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_APP_BASE_URL || process.env?.BASE_PATH)
    ? (process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.BASE_PATH || '').replace(/\/$/, '')
    : '';
export const CHECKION_PLATFORM_PRODUCT_ID = 'checkion';

export function getAppBasePath(): string {
  return APP_BASE_URL;
}

export function getPublicAssetPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${APP_BASE_URL}${normalized}`;
}

/**
 * Puppeteer CDP `protocolTimeout` (ms). Full-page `page.screenshot()` maps to `Page.captureScreenshot`
 * and can exceed Puppeteer’s default (~180s) on long / heavy pages.
 * Override with `PUPPETEER_PROTOCOL_TIMEOUT_MS` (minimum 60_000).
 */
export const PUPPETEER_PROTOCOL_TIMEOUT_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env?.PUPPETEER_PROTOCOL_TIMEOUT_MS : undefined;
  const n = raw != null && raw !== '' ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 60_000) return Math.floor(n);
  return 600_000;
})();

/** Set to `1` / `true` to disable cross-user reuse of recent standalone WCAG scans (`standalone_scan_entitlements`). */
export const ENV_DISABLE_STANDALONE_SCAN_REUSE = 'DISABLE_STANDALONE_SCAN_REUSE';

/**
 * How long (hours) a completed standalone session may be reused by another user (same normalized URL + settings).
 * Env: `STANDALONE_SCAN_REUSE_MAX_AGE_HOURS` — default 168 (7 days), min 1, max 8760 (1y).
 */
export function getStandaloneScanReuseMaxAgeHours(): number {
  const raw = typeof process !== 'undefined' ? process.env?.STANDALONE_SCAN_REUSE_MAX_AGE_HOURS : undefined;
  const n = raw != null && raw !== '' ? Number(raw) : NaN;
  if (Number.isFinite(n) && n >= 1 && n <= 8760) return Math.floor(n);
  return 168;
}

// ─── App Routes (pages) ────────────────────────────────────────────────────
export const PATH_HOME = '/';
export const PATH_SCAN = '/scan';
export const PATH_SCAN_DOMAIN = '/scan/domain';
export const PATH_RESULTS = '/results';
export const PATH_DOMAIN = '/domain';
export const PATH_JOURNEY_AGENT = '/journey-agent';
export const PATH_GEO_EEAT = '/geo-eeat';
export const PATH_SHARE = '/share';
export const PATH_LOGIN = '/login';
export const PATH_REGISTER = '/register';
export const PATH_SETTINGS = '/settings';
export const PATH_HISTORY = '/history';
export const PATH_DEVELOPERS = '/developers';
export const PATH_PROJECTS = '/projects';
/** Central list of all domain deep scans for the signed-in user (filters, compare). */
export const PATH_DEEP_SCANS = '/deep-scans';

/** Build app route: /results/[id] */
export const pathResults = (id: string) => `${PATH_RESULTS}/${encodeURIComponent(id)}`;
/** Build app route: /domain/[id] */
export const pathDomain = (id: string, query?: Record<string, string>) => {
  const base = `${PATH_DOMAIN}/${encodeURIComponent(id)}`;
  if (query && Object.keys(query).length) {
    const params = new URLSearchParams(query);
    return `${base}?${params.toString()}`;
  }
  return base;
};
/** Build app route: /journey-agent/[jobId] */
export const pathJourneyAgent = (jobId: string) => `${PATH_JOURNEY_AGENT}/${encodeURIComponent(jobId)}`;
/** Optional query when opening GEO result (e.g. scroll to competitive). */
export type PathGeoEeatQuery = { focus?: 'competitive' };

/** Build app route: /geo-eeat/[jobId] */
export const pathGeoEeat = (jobId: string, query?: PathGeoEeatQuery) => {
  const base = `${PATH_GEO_EEAT}/${encodeURIComponent(jobId)}`;
  if (query?.focus === 'competitive') return `${base}?focus=competitive`;
  return base;
};
/** Build app route: /projects/[id] */
export const pathProject = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}`;
/** Build app route: /projects/[id]/rankings */
export const pathProjectRankings = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/rankings`;
/** Build app route: /projects/[id]/geo */
export const pathProjectGeo = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/geo`;
/** Build app route: /projects/[id]/geo/analysis */
export const pathProjectGeoAnalysis = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/geo/analysis`;
/** Build app route: /projects/[id]/wcag */
export const pathProjectWcag = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/wcag`;
/** Build app route: /projects/[id]/seo */
export const pathProjectSeo = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/seo`;
/** Build app route: /projects/[id]/page-topics — compare page topic landscapes (own + competitors) */
export const pathProjectPageTopics = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/page-topics`;
/** Build app route: /projects/[id]/research */
export const pathProjectResearch = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/research`;
/** Build app route: /deep-scans/compare?ids=uuid1,uuid2 */
export const pathDeepScansCompare = (scanIdA: string, scanIdB: string) => {
    const params = new URLSearchParams({ ids: `${scanIdA},${scanIdB}` });
    return `${PATH_DEEP_SCANS}/compare?${params.toString()}`;
};
/** Build app route: /share/[token] */
export const pathShare = (token: string) => `${PATH_SHARE}/${encodeURIComponent(token)}`;
/** Build app route: /scan/domain?url=...&maxPages=...&projectId=...&classifyPageTopics=...&aiFillProjectMetadata=... (projectId preserves project context for result header + optional API assign). */
export const pathScanDomain = (params: {
  url: string;
  maxPages?: number;
  projectId?: string;
  scanId?: string;
  /** When true, adds `classifyPageTopics=true` so the deep scan triggers per-page LLM classification after completion. */
  classifyPageTopics?: boolean;
  /** When false, adds `aiFillProjectMetadata=false` (skip AI project industry/tags after linked scan). */
  aiFillProjectMetadata?: boolean;
}) => {
  const search = new URLSearchParams({ url: params.url });
  if (params.maxPages != null) search.set('maxPages', String(params.maxPages));
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.scanId) search.set('scanId', params.scanId);
  if (params.classifyPageTopics) search.set('classifyPageTopics', 'true');
  if (params.aiFillProjectMetadata === false) search.set('aiFillProjectMetadata', 'false');
  return `${PATH_SCAN_DOMAIN}?${search.toString()}`;
};

/**
 * Navigate to the live deep-scan page with an existing scan id (resume/progress UI).
 * If `domainOrUrl` cannot be turned into a URL, falls back to the domain result route.
 */
export function pathScanDomainResume(params: {
  domainOrUrl: string;
  scanId: string;
  projectId?: string;
  maxPages?: number;
  classifyPageTopics?: boolean;
  aiFillProjectMetadata?: boolean;
}): string {
  const url = toScanStartUrl(params.domainOrUrl);
  if (!url) {
    return pathDomain(params.scanId, params.projectId ? { projectId: params.projectId } : undefined);
  }
  return pathScanDomain({
    url,
    ...(params.maxPages != null ? { maxPages: params.maxPages } : {}),
    ...(params.projectId ? { projectId: params.projectId } : {}),
    ...(params.classifyPageTopics ? { classifyPageTopics: true } : {}),
    ...(params.aiFillProjectMetadata === false ? { aiFillProjectMetadata: false } : {}),
    scanId: params.scanId,
  });
}

/** Max content width (px) for centered long-form pages (domain/single-scan/dashboard-style). */
export const LAYOUT_MAX_CONTENT_WIDTH_PX = 1600;

/**
 * Inner app frame border thickness when the app shell uses MsqdxAppLayout `borderWidth="thin"`.
 * Keep in sync with `APP_LAYOUT_BORDER_WIDTH.thin` in `@msqdx/react` MsqdxAppLayout.
 */
export const APP_LAYOUT_INNER_BORDER_WIDTH_PX = 3;

// ─── API Routes ────────────────────────────────────────────────────────────
/** Base path for API URLs (e.g. '' or '/checkion' when app is under subpath). Use for client-side fetch. */
export const getApiBase = () => APP_BASE_URL;
export const API_HEALTH = `${APP_BASE_URL}/api/health`;
export const API_AUTH_REGISTER = `${APP_BASE_URL}/api/auth/register`;
export const API_AUTH_PROFILE = `${APP_BASE_URL}/api/auth/profile`;
export const API_AUTH_CHANGE_PASSWORD = `${APP_BASE_URL}/api/auth/change-password`;
export const API_AUTH_TOKENS = `${APP_BASE_URL}/api/auth/tokens`;
/** GET /api/auth/capabilities — UI feature flags for signed-in user */
export const API_AUTH_CAPABILITIES = `${APP_BASE_URL}/api/auth/capabilities`;
/** DELETE /api/auth/tokens/[id] */
export const apiAuthTokenRevoke = (id: string) => `${APP_BASE_URL}/api/auth/tokens/${encodeURIComponent(id)}`;
export const API_SCAN = `${APP_BASE_URL}/api/scan`;
export const API_SCANS = `${APP_BASE_URL}/api/scans`;
export const API_SCANS_DOMAIN = `${APP_BASE_URL}/api/scans/domain`;
export const API_SCAN_DOMAIN = `${APP_BASE_URL}/api/scan/domain`;
export const API_SCAN_JOURNEY_AGENT = `${APP_BASE_URL}/api/scan/journey-agent`;
export const API_SCAN_GEO_EEAT = `${APP_BASE_URL}/api/scan/geo-eeat`;
export const API_SCAN_GEO_EEAT_COMPETITIVE_ONLY = `${API_SCAN_GEO_EEAT}/competitive-only`;
export const API_SALIENCY_GENERATE = `${APP_BASE_URL}/api/saliency/generate`;
export const API_SALIENCY_RESULT = `${APP_BASE_URL}/api/saliency/result`;
export const API_SHARE = `${APP_BASE_URL}/api/share`;
export const API_SEARCH = `${APP_BASE_URL}/api/search`;
export const API_JOURNEYS = `${APP_BASE_URL}/api/journeys`;
export const API_PROJECTS = `${APP_BASE_URL}/api/projects`;
/** POST — Bearer CHECKION_ADMIN_API_KEY: copy `projects.tags` → `domain_scans.tags` for existing scans; invalidates domain lists. */
export const API_ADMIN_DOMAIN_SCANS_SYNC_PROJECT_TAGS = `${APP_BASE_URL}/api/admin/domain-scans/sync-project-tags`;
export const API_RANK_TRACKING_KEYWORDS = `${APP_BASE_URL}/api/rank-tracking/keywords`;
export const API_RANK_TRACKING_REFRESH = `${APP_BASE_URL}/api/rank-tracking/refresh`;

/** Build: GET /api/rank-tracking/keywords?projectId= */
export const apiRankTrackingKeywords = (projectId: string) =>
  `${API_RANK_TRACKING_KEYWORDS}?projectId=${encodeURIComponent(projectId)}`;
/** Build: GET/DELETE /api/rank-tracking/keywords/[id] */
export const apiRankTrackingKeyword = (id: string) => `${API_RANK_TRACKING_KEYWORDS}/${encodeURIComponent(id)}`;
/** Build: GET /api/rank-tracking/keywords/[id]/positions?limit= */
export const apiRankTrackingKeywordPositions = (id: string, limit?: number) => {
  const base = `${API_RANK_TRACKING_KEYWORDS}/${encodeURIComponent(id)}/positions`;
  return limit != null ? `${base}?limit=${limit}` : base;
};
/** Build: POST /api/rank-tracking/refresh */
export const apiRankTrackingRefresh = () => API_RANK_TRACKING_REFRESH;

/** POST /api/scan (single-page scan) */
export const apiScanCreate = API_SCAN;

/**
 * POST /api/scan: **NDJSON stream by default** (progress + complete/error) — avoids HTTP 500 on scan failures
 * when clients omit this header (legacy sync JSON path ran the scan before returning).
 * Set to `0` for legacy `{ success, data }` JSON (scripts/tests).
 */
export const HEADER_CHECKION_SCAN_STREAM = 'x-checkion-scan-stream';
export const HEADER_CHECKION_SCAN_STREAM_ON = '1';
export const HEADER_CHECKION_SCAN_STREAM_OFF = '0';

/** Build: GET /api/scan?limit=&page=&projectId=&industry=&tag= — paginated **summaries**. Use `groupId` for all devices in one session. */
export const apiScanList = (params?: {
  limit?: number;
  page?: number;
  projectId?: string | null;
  industry?: string;
  tag?: string;
  /** When set, returns full `ScanResult[]` for each device (sibling tabs); ignores pagination params. */
  groupId?: string;
}) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.projectId !== undefined) search.set('projectId', params.projectId ?? '');
  if (params?.industry) search.set('industry', params.industry);
  if (params?.tag) search.set('tag', params.tag);
  if (params?.groupId) search.set('groupId', params.groupId);
  return search.toString() ? `${API_SCAN}?${search.toString()}` : API_SCAN;
};

/** Build: GET/DELETE /api/scan/[id] */
export const apiScan = (id: string) => `${API_SCAN}/${encodeURIComponent(id)}`;
/** Build: PATCH /api/scan/[id]/project (assign scan to project) */
export const apiScanProject = (id: string) => `${apiScan(id)}/project`;
/** Build: POST /api/scan/[id]/summarize */
export const apiScanSummarize = (id: string) => `${apiScan(id)}/summarize`;
/** Build: POST /api/scan/[id]/classify (page classification: tags + tier) */
export const apiScanClassify = (id: string) => `${apiScan(id)}/classify`;
/** Build: POST /api/scan/[id]/ux-check (Claude UX Check v2, DIN EN ISO 9241-110) */
export const apiScanUxCheck = (id: string) => `${apiScan(id)}/ux-check`;
/** Build: /api/scan/[id]/screenshot */
export const apiScanScreenshot = (id: string) => `${apiScan(id)}/screenshot`;
/** Build: GET /api/scan/[id]/issues — WCAG issues from `scan_issues` (same access as GET /api/scan/[id]). */
export const apiScanIssues = (id: string) => `${apiScan(id)}/issues`;

/** Build: POST /api/scan/domain */
export const apiScanDomainCreate = API_SCAN_DOMAIN;
/** Build: GET /api/scan/domain/[id]/status */
export const apiScanDomainStatus = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/status`;
/** Build: POST /api/scan/domain/[id]/control — pause / resume / cancel deep scan */
export const apiScanDomainControl = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/control`;
/** Build: GET /api/scan/domain/[id]/summary — `light` omits pages + heavy SEO rows; `seoFull` returns only `aggregated.seo` for Tab 7 merge. */
export const apiScanDomainSummary = (id: string, opts?: { light?: boolean; seoFull?: boolean }) => {
    const base = `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/summary`;
    if (opts?.light) return `${base}?light=1`;
    if (opts?.seoFull) return `${base}?seoFull=1`;
    return base;
};
/** Build: GET /api/scan/domain/[id]/bundle — single read: light aggregates + totalSlimRows. */
export const apiScanDomainBundle = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/bundle`;
/** Build: GET /api/scan/domain/[id]/graph — link graph only (lazy-load visual map). */
export const apiScanDomainGraph = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/graph`;
/** Default page size for domain slim + SEO tables (server max per request remains 500 for slim-pages). */
export const DOMAIN_SLIM_PAGES_PAGE_SIZE = 100;
/** Page size for GET .../seo-pages (server max 200). */
export const DOMAIN_SEO_PAGES_PAGE_SIZE = 50;
/** Build: GET /api/scan/domain/[id]/slim-pages?offset=&limit=&sort=&dir= */
export const apiScanDomainSlimPages = (
    id: string,
    params?: { offset?: number; limit?: number; sort?: string; dir?: 'asc' | 'desc' }
) => {
    const q = new URLSearchParams();
    if (params?.offset != null) q.set('offset', String(params.offset));
    if (params?.limit != null) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.dir) q.set('dir', params.dir);
    const qs = q.toString();
    return `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/slim-pages${qs ? `?${qs}` : ''}`;
};
/** Build: GET /api/scan/domain/[id]/seo-pages?offset=&limit=&sort=&dir= */
export const apiScanDomainSeoPages = (
    id: string,
    params?: { offset?: number; limit?: number; sort?: string; dir?: 'asc' | 'desc' }
) => {
    const q = new URLSearchParams();
    if (params?.offset != null) q.set('offset', String(params.offset));
    if (params?.limit != null) q.set('limit', String(params.limit));
    if (params?.sort) q.set('sort', params.sort);
    if (params?.dir) q.set('dir', params.dir);
    const qs = q.toString();
    return `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/seo-pages${qs ? `?${qs}` : ''}`;
};
/** Build: GET /api/scan/domain/[id]/page-resolve?url= */
export const apiScanDomainPageResolve = (id: string, pageUrl: string) => {
    const q = new URLSearchParams({ url: pageUrl });
    return `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/page-resolve?${q.toString()}`;
};
/** Default page size for domain issue-group lists (cursor APIs). */
export const DOMAIN_ISSUES_PAGE_SIZE = 50;
/** Build: POST /api/scan/domain/[id]/summarize */
export const apiScanDomainSummarize = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/summarize`;
/** Build: POST /api/scan/domain/[id]/journey */
export const apiScanDomainJourney = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/journey`;
/** Build: POST /api/scan/domain/[id]/classify (classify all pages of domain scan) */
export const apiScanDomainClassify = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/classify`;

/** Build: POST /api/scan/journey-agent */
export const apiScanJourneyAgentCreate = API_SCAN_JOURNEY_AGENT;
/** Build: GET /api/scan/journey-agent/history?limit=&projectId= */
export const apiScanJourneyAgentHistory = (params?: { limit?: number; projectId?: string | null }) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.projectId !== undefined) search.set('projectId', params.projectId ?? '');
  const q = search.toString();
  return q ? `${API_SCAN_JOURNEY_AGENT}/history?${q}` : `${API_SCAN_JOURNEY_AGENT}/history`;
};
/** Build: GET /api/scan/journey-agent/[jobId] */
export const apiScanJourneyAgent = (jobId: string) => `${API_SCAN_JOURNEY_AGENT}/${encodeURIComponent(jobId)}`;
/** Build: PATCH /api/scan/journey-agent/[jobId]/project (assign journey run to project) */
export const apiScanJourneyAgentProject = (jobId: string) => `${apiScanJourneyAgent(jobId)}/project`;
/** Build: /api/scan/journey-agent/[jobId]/video */
export const apiScanJourneyAgentVideo = (jobId: string) => `${apiScanJourneyAgent(jobId)}/video`;
/** Build: /api/scan/journey-agent/[jobId]/live/stream */
export const apiScanJourneyAgentLiveStream = (jobId: string) => `${apiScanJourneyAgent(jobId)}/live/stream`;

/** Build: POST /api/scan/geo-eeat */
export const apiScanGeoEeatCreate = API_SCAN_GEO_EEAT;
/** Build: POST /api/scan/geo-eeat/competitive-only */
export const apiScanGeoEeatCompetitiveOnlyCreate = API_SCAN_GEO_EEAT_COMPETITIVE_ONLY;
/** Build: GET /api/scan/geo-eeat/history?limit=&projectId= */
export const apiScanGeoEeatHistory = (params?: { limit?: number; projectId?: string | null }) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.projectId !== undefined) search.set('projectId', params.projectId ?? '');
  const q = search.toString();
  return q ? `${API_SCAN_GEO_EEAT}/history?${q}` : `${API_SCAN_GEO_EEAT}/history`;
};
/** Build: POST /api/scan/geo-eeat/suggest-competitors-queries */
export const apiScanGeoEeatSuggestQueries = `${API_SCAN_GEO_EEAT}/suggest-competitors-queries`;
/** Build: GET /api/scan/geo-eeat/[jobId] */
export const apiScanGeoEeat = (jobId: string) => `${API_SCAN_GEO_EEAT}/${encodeURIComponent(jobId)}`;
/** Build: POST /api/scan/geo-eeat/[jobId]/rerun-competitive (re-run questions analysis only) */
export const apiScanGeoEeatRerunCompetitive = (jobId: string) =>
    `${API_SCAN_GEO_EEAT}/${encodeURIComponent(jobId)}/rerun-competitive`;
/** Build: GET /api/scan/geo-eeat/[jobId]/competitive-history?limit= */
export const apiScanGeoEeatCompetitiveHistory = (jobId: string, limit?: number) => {
    const base = `${API_SCAN_GEO_EEAT}/${encodeURIComponent(jobId)}/competitive-history`;
    return limit != null ? `${base}?limit=${limit}` : base;
};
/** Build: GET /api/scan/geo-eeat/[jobId]/competitive-history/[runId] */
export const apiScanGeoEeatCompetitiveRun = (jobId: string, runId: string) =>
    `${API_SCAN_GEO_EEAT}/${encodeURIComponent(jobId)}/competitive-history/${encodeURIComponent(runId)}`;
/** Build: PATCH /api/scan/geo-eeat/[jobId]/project (assign geo-eeat run to project) */
export const apiScanGeoEeatProject = (jobId: string) => `${API_SCAN_GEO_EEAT}/${encodeURIComponent(jobId)}/project`;

/** Build: GET /api/saliency/result?jobId=&scanId= */
export const apiSaliencyResult = (jobId: string, scanId: string) =>
  `${API_SALIENCY_RESULT}?jobId=${encodeURIComponent(jobId)}&scanId=${encodeURIComponent(scanId)}`;

/** Build: GET /api/share/by-resource?type=&id= */
export const apiShareByResource = (type: string, id: string) =>
  `${API_SHARE}/by-resource?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
/** Build: GET/DELETE/PATCH /api/share/[token] */
export const apiShareToken = (token: string) => `${API_SHARE}/${encodeURIComponent(token)}`;
/** Build: POST /api/share/[token]/access */
export const apiShareTokenAccess = (token: string) => `${apiShareToken(token)}/access`;
/** Build: GET /api/share/[token]/video */
export const apiShareTokenVideo = (token: string) => `${apiShareToken(token)}/video`;
/** Build: GET /api/share/[token]/pages/[pageId] */
export const apiShareTokenPages = (token: string, pageId: string) =>
  `${apiShareToken(token)}/pages/${encodeURIComponent(pageId)}`;
/** Build: GET /api/share/[token]/pages/[pageId]/screenshot */
export const apiShareTokenPagesScreenshot = (token: string, pageId: string, accessToken?: string) => {
  const base = `${apiShareToken(token)}/pages/${encodeURIComponent(pageId)}/screenshot`;
  return accessToken ? `${base}?access=${encodeURIComponent(accessToken)}` : base;
};

/** Check namespace (proxy to /api/tools/*). */
export const API_CHECKS_CONTRAST = `${APP_BASE_URL}/api/checks/contrast`;
export const API_CHECKS_SSL = `${APP_BASE_URL}/api/checks/ssl`;
export const API_CHECKS_PAGESPEED = `${APP_BASE_URL}/api/checks/pagespeed`;
export const API_CHECKS_WAYBACK = `${APP_BASE_URL}/api/checks/wayback`;
export const API_CHECKS_READABILITY = `${APP_BASE_URL}/api/checks/readability`;

/** Build: GET /api/tools/ssl-labs?host= */
export const apiToolsSslLabs = (host: string) => `${APP_BASE_URL}/api/tools/ssl-labs?host=${encodeURIComponent(host)}`;
/** Build: GET /api/tools/pagespeed?url= */
export const apiToolsPageSpeed = (url: string) => `${APP_BASE_URL}/api/tools/pagespeed?url=${encodeURIComponent(url)}`;
/** Build: GET /api/tools/wayback?url= */
export const apiToolsWayback = (url: string) => `${APP_BASE_URL}/api/tools/wayback?url=${encodeURIComponent(url)}`;
/** Build: GET /api/search?q=&limit= */
export const apiSearch = (q: string, limit?: number) => {
  const params = new URLSearchParams({ q });
  if (limit != null) params.set('limit', String(limit));
  return `${API_SEARCH}?${params.toString()}`;
};

/** Build: DELETE /api/scans/[id] */
export const apiScansDelete = (id: string) => `${API_SCANS}/${encodeURIComponent(id)}`;
/** PATCH /api/scans/[id]/tags — standalone scan-level tags (owner only). */
export const apiScansTags = (id: string) => `${API_SCANS}/${encodeURIComponent(id)}/tags`;
/** Build: GET /api/scans/domain?limit=&page=&projectId=&q=&status=&industry=&tag=&scope= */
export const apiScansDomainList = (params?: {
  limit?: number;
  page?: number;
  projectId?: string | null;
  q?: string;
  status?: string;
  industry?: string;
  /** Single normalized tag (scan or project). */
  tag?: string;
  /** `allUsers` requires allowlist env, `CHECKION_GLOBAL_DOMAIN_SCAN_ALL_AUTHENTICATED`, or admin API key. */
  scope?: 'mine' | 'allUsers';
}) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.projectId !== undefined) search.set('projectId', params.projectId ?? '');
  if (params?.q != null && params.q.trim() !== '') search.set('q', params.q.trim());
  if (params?.status != null && params.status !== '') search.set('status', params.status);
  if (params?.industry != null && params.industry.trim() !== '') search.set('industry', params.industry.trim());
  if (params?.tag != null && params.tag.trim() !== '') search.set('tag', params.tag.trim());
  if (params?.scope === 'allUsers') search.set('scope', 'allUsers');
  return search.toString() ? `${API_SCANS_DOMAIN}?${search.toString()}` : API_SCANS_DOMAIN;
};

/** Build: POST /api/scans/domain/compare */
export const API_SCANS_DOMAIN_COMPARE = `${API_SCANS_DOMAIN}/compare`;
/** Build: DELETE /api/scans/domain/[id] */
export const apiScansDomainDelete = (id: string) => `${API_SCANS_DOMAIN}/${encodeURIComponent(id)}`;
/** Build: PATCH /api/scans/domain/[id]/project (assign domain scan to project) */
export const apiScansDomainProject = (id: string) => `${API_SCANS_DOMAIN}/${encodeURIComponent(id)}/project`;
/** Build: PATCH /api/scans/domain/[id]/tags */
export const apiScansDomainTags = (id: string) => `${API_SCANS_DOMAIN}/${encodeURIComponent(id)}/tags`;

/** Build: GET/POST /api/journeys?limit=&page= */
export const apiJourneysList = (params?: { limit?: number; page?: number }) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.page != null) search.set('page', String(params.page));
  return search.toString() ? `${API_JOURNEYS}?${search.toString()}` : API_JOURNEYS;
};
/** Build: GET/DELETE /api/journeys/[id] */
export const apiJourneys = (id: string) => `${API_JOURNEYS}/${encodeURIComponent(id)}`;

/** Build: GET /api/projects */
export const apiProjectsList = API_PROJECTS;
/** Build: POST /api/projects */
export const apiProjectsCreate = API_PROJECTS;
/** Build: GET/PATCH/DELETE /api/projects/[id] */
export const apiProject = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}`;
/** Build: POST /api/projects/[id]/suggest-competitors */
export const apiProjectSuggestCompetitors = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/suggest-competitors`;
/** Build: POST /api/projects/[id]/suggest-keywords */
export const apiProjectSuggestKeywords = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/suggest-keywords`;
/** Build: POST /api/projects/[id]/research */
export const apiProjectResearch = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/research`;
/** Build: GET /api/projects/[id]/ranking-summary */
export const apiProjectRankingSummary = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/ranking-summary`;
/** Build: GET /api/projects/[id]/geo-summary */
export const apiProjectGeoSummary = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/geo-summary`;
/** Build: GET /api/projects/[id]/geo-latest-result */
export const apiProjectGeoLatestResult = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/geo-latest-result`;
/** GET /api/projects/[id]/domain-summary – latest deep scan summary (score, performance, eco). */
export const apiProjectDomainSummary = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/domain-summary`;
/** GET /api/projects/[id]/domain-summary-all – own + competitor domain summaries. */
export const apiProjectDomainSummaryAll = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/domain-summary-all`;
/** POST /api/projects/[id]/domain-scan-all — optional query flags match route search params. */
export function apiProjectDomainScanAll(
  projectId: string,
  query?: { classifyPageTopics?: boolean; skipUnchangedPages?: boolean; aiFillProjectMetadata?: boolean }
): string {
  const base = `${API_PROJECTS}/${encodeURIComponent(projectId)}/domain-scan-all`;
  if (!query) return base;
  const sp = new URLSearchParams();
  if (query.classifyPageTopics) sp.set('classifyPageTopics', 'true');
  if (query.skipUnchangedPages) sp.set('skipUnchangedPages', 'true');
  if (query.aiFillProjectMetadata === false) sp.set('aiFillProjectMetadata', 'false');
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}
/** POST /api/projects/[id]/domain-scan-competitor – body `{ domain }` (hostname or URL). */
export const apiProjectDomainScanCompetitor = (id: string) =>
  `${API_PROJECTS}/${encodeURIComponent(id)}/domain-scan-competitor`;
/** GET /api/projects/[id]/domain-scans/active – queued/scanning/paused/cancelling deep scans for this project. */
export const apiProjectDomainScansActive = (id: string) =>
  `${API_PROJECTS}/${encodeURIComponent(id)}/domain-scans/active`;
/** GET /api/scan/domain/by-domain?domain= – latest completed scan for domain (current user). */
export const apiScanDomainByDomain = (domain: string) => `${API_SCAN_DOMAIN}/by-domain?domain=${encodeURIComponent(domain)}`;

/** GET /api/scan/domain/[id]/issue-groups */
export const apiScanDomainIssueGroups = (id: string, params?: { limit?: number; cursorPageCount?: number; cursorGroupKey?: string; type?: string; wcagLevel?: string; q?: string }) => {
    const base = `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/issue-groups`;
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.cursorPageCount != null) search.set('cursorPageCount', String(params.cursorPageCount));
    if (params?.cursorGroupKey) search.set('cursorGroupKey', params.cursorGroupKey);
    if (params?.type) search.set('type', params.type);
    if (params?.wcagLevel) search.set('wcagLevel', params.wcagLevel);
    if (params?.q) search.set('q', params.q);
    return search.toString() ? `${base}?${search.toString()}` : base;
};

/** GET /api/scan/domain/[id]/issue-groups/[groupKey]/pages */
export const apiScanDomainIssueGroupPages = (id: string, groupKey: string, params?: { limit?: number; cursorUrl?: string }) => {
    const base = `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/issue-groups/${encodeURIComponent(groupKey)}/pages`;
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.cursorUrl) search.set('cursorUrl', params.cursorUrl);
    return search.toString() ? `${base}?${search.toString()}` : base;
};

/** GET /api/scan/domain/[id]/pages/[pageId]/issues */
export const apiScanDomainPageIssues = (id: string, pageId: string, params?: { limit?: number; cursorId?: string }) => {
    const base = `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/pages/${encodeURIComponent(pageId)}/issues`;
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.cursorId) search.set('cursorId', params.cursorId);
    return search.toString() ? `${base}?${search.toString()}` : base;
};
/** Build: GET /api/projects/[id]/geo-question-history?limit= */
export const apiProjectGeoQuestionHistory = (id: string, limit?: number) => {
    const base = `${API_PROJECTS}/${encodeURIComponent(id)}/geo-question-history`;
    return limit != null ? `${base}?limit=${limit}` : base;
};

// ─── Other Paths ───────────────────────────────────────────────────────────
/** Public path for the black MSQDX logo (PDF reports, print). Resolve with origin in browser: `${window.location.origin}${PDF_LOGO_PATH}` */
export const PDF_LOGO_PATH = '/msqdx-logo-black.svg';

/** Cookie and localStorage key for UI language (de/en). Used by lib/i18n. */
export const LOCALE_STORAGE_KEY = 'checkion_locale';

/** Number of scans per page on the dashboard (single + domain lists). */
export const DASHBOARD_SCANS_PAGE_SIZE = 10;
/** Issues per page on the single-scan results page (list view). */
export const RESULTS_ISSUES_PAGE_SIZE = 50;
/** Search results to show initially; "load more" adds this many. */
export const SEARCH_RESULTS_PAGE_SIZE = 15;
/** Saved journeys per page on the dashboard. */
export const DASHBOARD_JOURNEYS_PAGE_SIZE = 10;
/** Domain scan: pages (URLs) to show initially; "load more" adds this many. */
export const DOMAIN_PAGES_INITIAL = 50;
/** Domain scan: increment when "load more" is clicked. */
export const DOMAIN_PAGES_INCREMENT = 50;
/** Scanned pages table: rows per page (pagination). */
export const DOMAIN_PAGES_TABLE_PAGE_SIZE = 50;
/** Aggregated issues table: rows per page (pagination). */
export const DOMAIN_ISSUES_TABLE_PAGE_SIZE = 50;
/** SEO on-page table: rows per page (pagination). */
export const SEO_TABLE_PAGE_SIZE = 15;
/** GEO analysis pages table: rows per page (pagination). */
export const GEO_TABLE_PAGE_SIZE = 15;
/** SEO keywords card: show this many chips initially; "load more" shows rest. */
export const SEO_KEYWORDS_INITIAL_SHOWN = 15;
/** SEO page: URL lists (missing canonical, noindex) show this many initially; "load more" expands. */
export const SEO_URL_LIST_INITIAL = 15;
/** Share page (deep scan): scanned pages list page size (prev/next pagination). */
export const SHARE_DOMAIN_PAGES_PAGE_SIZE = 10;

/** Domain result tabs: default row height estimate (px) for `VirtualScrollList` (SEO/GEO URL rows). */
export const DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX = 52;
/** Links & SEO tab: SEO page rows (URL + metrics) — two lines + padding; virtual list initial estimate. */
export const DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX = 88;
/** Vertical gap between virtualized rows (px). Prefer virtualizer `gap` over `margin` on row children so measurements stay stable. */
export const DOMAIN_TAB_VIRTUAL_SCROLL_GAP_PX = 6;
/** Extra rows above/below viewport when virtualizing domain tab lists. */
export const DOMAIN_TAB_VIRTUAL_OVERSCAN = 12;
/** Virtual chip lists (`VirtualChipList`): one chip per row when scroll mode; ~MsqdxChip small + gap. */
export const VIRTUAL_CHIP_LIST_ROW_ESTIMATE_PX = 30;
export const VIRTUAL_CHIP_LIST_OVERSCAN = 8;
export const VIRTUAL_CHIP_LIST_MAX_HEIGHT_PX = 260;
/** At or above this item count, use virtualization; below, plain flex-wrap (cheap for small lists). */
export const VIRTUAL_CHIP_LIST_INLINE_THRESHOLD = 16;
/** Domain overview: systemic issue cards — row height estimate (px) for virtual list. */
/** Kompakte SystemicIssueScrollRow: py/px/kleinere Typo (VirtualScrollList). */
export const DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX = 96;
/** Domain UX-Audit tab: max. kaputte Links in der Vorschau-Liste (virtualisiert). */
export const DOMAIN_UX_BROKEN_LINKS_PREVIEW = 30;
/** GET .../summary?light=1 — cap per-page UX lists (overview cards use similar slice limits). */
export const DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP = 12;
/** Light summary: same cap as UX broken-link preview. */
export const DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP = DOMAIN_UX_BROKEN_LINKS_PREVIEW;
/** Light summary: sample URL lists for SEO/infra (full rows via seoFull or full summary). */
export const DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP = 5;
export const DOMAIN_LIGHT_SUMMARY_SEO_KEYWORDS_CAP = 25;
export const DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_CAP = 80;
export const DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP = 25;
export const DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP = 30;
export const DOMAIN_LIGHT_SUMMARY_GENERATIVE_PAGES_CAP = 40;
export const DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP = 30;
/** Light summary: max themes in `aggregated.pageClassification.topThemes`. */
export const DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP = 20;
/** Light summary: max rows in `aggregated.pageClassification.pageSamples`. */
export const DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP = 5;
/** Light summary: max `relatedPages` entries per theme in `aggregated.pageClassification.topThemes`. */
export const DOMAIN_LIGHT_SUMMARY_PAGE_CLASSIFICATION_THEME_RELATED_PAGES_CAP = 12;

/**
 * Persisted `domain_scans.payload.aggregated`: same caps as light summary by default
 * (URL-heavy arrays); tune here independently to shrink JSONB on disk.
 */
export const DOMAIN_STORED_SUMMARY_UX_LIST_CAP = DOMAIN_LIGHT_SUMMARY_UX_LIST_CAP;
export const DOMAIN_STORED_SUMMARY_UX_BROKEN_LINKS_CAP = DOMAIN_LIGHT_SUMMARY_UX_BROKEN_LINKS_CAP;
export const DOMAIN_STORED_SUMMARY_SEO_URL_SAMPLE_CAP = DOMAIN_LIGHT_SUMMARY_SEO_URL_SAMPLE_CAP;
export const DOMAIN_STORED_SUMMARY_SEO_KEYWORDS_CAP = DOMAIN_LIGHT_SUMMARY_SEO_KEYWORDS_CAP;
export const DOMAIN_STORED_SUMMARY_LINKS_BROKEN_CAP = DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_CAP;
export const DOMAIN_STORED_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP = DOMAIN_LIGHT_SUMMARY_LINKS_BROKEN_BY_PAGE_CAP;
export const DOMAIN_STORED_SUMMARY_INFRA_URL_LIST_CAP = DOMAIN_LIGHT_SUMMARY_INFRA_URL_LIST_CAP;
export const DOMAIN_STORED_SUMMARY_GENERATIVE_PAGES_CAP = DOMAIN_LIGHT_SUMMARY_GENERATIVE_PAGES_CAP;
export const DOMAIN_STORED_SUMMARY_STRUCTURE_URL_LIST_CAP = DOMAIN_LIGHT_SUMMARY_STRUCTURE_URL_LIST_CAP;
export const DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_TOP_THEMES_CAP = 40;
export const DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_PAGE_SAMPLES_CAP = 8;
/** Stored payload: max `relatedPages` per theme (id + url for deep links without slim list). */
export const DOMAIN_STORED_SUMMARY_PAGE_CLASSIFICATION_THEME_RELATED_PAGES_CAP = 32;

/** Max themes sent to the rollup-refinement LLM (before `toStoredAggregated` caps to stored limit). */
export const DOMAIN_THEME_ROLLUP_REFINE_LLM_CANDIDATES_CAP = 55;

/** Legacy aggregated-issues table: estimated grid row height for virtualization. */
export const DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX = 56;

/** Scan results virtualized issue table: fallback row height when Pretext/canvas is unavailable. */
export const SCAN_ISSUE_LIST_ROW_FALLBACK_PX = 72;

/** Multiline text measurement for virtual list row heights — reference URLs (do not duplicate in code). */
export const PRETEXT_PACKAGE_NAME = '@chenglou/pretext';
export const PRETEXT_NPM_URL = 'https://www.npmjs.com/package/@chenglou/pretext';
export const PRETEXT_REPO_URL = 'https://github.com/chenglou/pretext';

/** Base path for public share landing pages. Full URL: origin + SHARE_PATH + '/' + token */
export const SHARE_PATH = '/share';

/** Cache revalidate times (seconds). Used by lib/cache with unstable_cache. */
export const CACHE_REVALIDATE_SCAN = 60;
export const CACHE_REVALIDATE_DOMAIN = 60;
/** Browser hint (seconds): serve stale JSON while revalidating; aligns with React Query bundle `staleTime` / refetch. */
export const CACHE_DOMAIN_JSON_STALE_WHILE_REVALIDATE = 120;
export const CACHE_REVALIDATE_SHARE = 300;
export const CACHE_REVALIDATE_LIST = 30;

/**
 * HTTP `Cache-Control` for authenticated domain-scan JSON GETs (summary, bundle, slim-pages, graph).
 * `private` — not shared CDNs; `max-age` matches CACHE_REVALIDATE_DOMAIN (also DomainScanProvider bundle staleTime ms).
 */
export const HTTP_CACHE_CONTROL_PRIVATE_DOMAIN_JSON =
    `private, max-age=${CACHE_REVALIDATE_DOMAIN}, stale-while-revalidate=${CACHE_DOMAIN_JSON_STALE_WHILE_REVALIDATE}` as const;

/** Screenshot storage: env key for backend (local disk vs S3). Use "s3" for shared storage across instances. */
export const ENV_SCREENSHOT_STORAGE = 'SCREENSHOT_STORAGE';
/** Path for local screenshot files. Must match Coolify volume "Source Path" if using persistent storage (e.g. /screenshots or /screenshot). */
export const ENV_SCAN_SCREENSHOTS_PATH = 'SCAN_SCREENSHOTS_PATH';
/** S3 bucket for screenshots when SCREENSHOT_STORAGE=s3. Fallback: S3_BUCKET. */
export const ENV_SCREENSHOT_S3_BUCKET = 'SCREENSHOT_S3_BUCKET';
/** Optional S3 key prefix (e.g. "screenshots"). */
export const ENV_SCREENSHOT_S3_PREFIX = 'SCREENSHOT_S3_PREFIX';
/** AWS region for S3 (default eu-central-1). */
export const ENV_SCREENSHOT_AWS_REGION = 'SCREENSHOT_AWS_REGION';

/** When `1`/`true`/`yes`, enables verbose scanner and journey-agent debug logs (axe injection, CLS, tool traces). */
export const ENV_CHECKION_SCAN_DEBUG = 'CHECKION_SCAN_DEBUG';

/** When `1`/`true`/`yes`, emits one JSON line per scan to stdout: `{"type":"checkion.scan.timing",...}` for log aggregation. */
export const ENV_CHECKION_SCAN_TIMING_LOG = 'CHECKION_SCAN_TIMING_LOG';

/**
 * `page.goto` / pa11y timeout (ms). On timeout, navigation fails and many heuristic fields may be empty.
 * Override: `SCAN_NAVIGATION_TIMEOUT_MS` (min 10_000, default 60_000).
 */
export const SCAN_NAVIGATION_TIMEOUT_MS = (() => {
    const raw = typeof process !== 'undefined' ? process.env?.SCAN_NAVIGATION_TIMEOUT_MS : undefined;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 10_000) return Math.floor(n);
    return 60_000;
})();

/** Max distinct third-party script hostnames collected early (consentSignals). Env: `SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP`. */
export const SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP = (() => {
    const raw = typeof process !== 'undefined' ? process.env?.SCAN_EARLY_THIRD_PARTY_SCRIPT_HOST_CAP : undefined;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 4 && n <= 200) return Math.floor(n);
    return 40;
})();

/** Max script `response` events counted toward `scriptTransferBytesApprox` (limits work on huge SPAs). Env: `SCAN_SCRIPT_RESOURCE_COUNT_CAP`. */
export const SCAN_SCRIPT_RESOURCE_COUNT_CAP = (() => {
    const raw = typeof process !== 'undefined' ? process.env?.SCAN_SCRIPT_RESOURCE_COUNT_CAP : undefined;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 20 && n <= 10_000) return Math.floor(n);
    return 500;
})();

/** Green Web greencheck fetch timeout (ms). Env: `SCAN_GREEN_WEB_FETCH_TIMEOUT_MS`. */
export const SCAN_GREEN_WEB_FETCH_TIMEOUT_MS = (() => {
    const raw = typeof process !== 'undefined' ? process.env?.SCAN_GREEN_WEB_FETCH_TIMEOUT_MS : undefined;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 500 && n <= 60_000) return Math.floor(n);
    return 4500;
})();

/** When set (e.g. `redis://redis:6379`), rate limits use Redis so multiple app instances share counters. Falls back to in-memory if unset or connection fails. */
export const ENV_REDIS_URL = 'REDIS_URL';

/** When `1`/`true`/`yes`, never connects to Redis for rate limiting (in-memory only). Use if `REDIS_URL` points at an unreachable host and logs spam `EAI_AGAIN` / `getaddrinfo`. */
export const ENV_CHECKION_DISABLE_REDIS_RATE_LIMIT = 'CHECKION_DISABLE_REDIS_RATE_LIMIT';

/** When `1`/`true`/`yes`, skip auto-filling `projects.tags` from domain `topThemes` after a linked deep scan. */
export const ENV_CHECKION_DISABLE_AUTO_PROJECT_TAGS = 'CHECKION_DISABLE_AUTO_PROJECT_TAGS';
/** When `1`/`true`/`yes`, replace existing project tags with rollup-derived tags when auto-tags run. */
export const ENV_CHECKION_AUTO_TAGS_OVERWRITE = 'CHECKION_AUTO_TAGS_OVERWRITE';

/** Optional base URL for the UX Journey Agent (Python/Browser Use). If set, POST /api/scan/journey-agent forwards to this service. On Coolify: use internal service URL (e.g. http://ux-journey-agent:8320). */
export const ENV_UX_JOURNEY_AGENT_URL = 'UX_JOURNEY_AGENT_URL';

/** When truthy (`1`, `true`, `yes`), enables the UX Journey Agent UI + API in CHECKION. */
export const ENV_CHECKION_ENABLE_UX_JOURNEY_AGENT = 'CHECKION_ENABLE_UX_JOURNEY_AGENT';

/** Optional base URL for GEO/E-E-A-T intensive + competitive benchmark service. If set, POST /api/scan/geo-eeat can delegate long-running jobs to this service. */
export const ENV_GEO_EEAT_SERVICE_URL = 'GEO_EEAT_SERVICE_URL';

/** If set, Next.js rewrites /mcp and /mcp/* to this URL (MCP server). Enables single-domain deployment: origin/mcp → MCP. Use internal URL in Coolify (e.g. http://checkion-mcp:3100). */
export const ENV_MCP_SERVER_URL = 'MCP_SERVER_URL';

// ─── Structure & Semantics (results tab) ───────────────────────────────────
/** Initial number of document outline entries shown before "show more". */
export const OUTLINE_INITIAL_VISIBLE = 20;
/** Initial number of headings shown in structure map before "show more". */
export const STRUCTURE_MAP_HEADINGS_INITIAL = 15;
/** Initial number of page index regions shown before "show more". */
export const PAGE_INDEX_INITIAL_VISIBLE = 10;

// ─── Project industry taxonomy (IDs in DB; labels in locales `industryPool.*`) ─
export {
    INDUSTRY_POOL,
    INDUSTRY_POOL_IDS,
    isIndustryPoolId,
    type IndustryPoolId,
} from '@/lib/industry-pool';
