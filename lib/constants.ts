/**
 * Central place for app-wide paths and asset URLs.
 * Do not hardcode paths in components – reference these constants.
 */

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
/** Build app route: /geo-eeat/[jobId] */
export const pathGeoEeat = (jobId: string) => `${PATH_GEO_EEAT}/${encodeURIComponent(jobId)}`;
/** Build app route: /projects/[id] */
export const pathProject = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}`;
/** Build app route: /share/[token] */
export const pathShare = (token: string) => `${PATH_SHARE}/${encodeURIComponent(token)}`;
/** Build app route: /scan/domain?url=...&maxPages=... */
export const pathScanDomain = (params: { url: string; maxPages?: number }) => {
  const search = new URLSearchParams({ url: params.url });
  if (params.maxPages != null) search.set('maxPages', String(params.maxPages));
  return `${PATH_SCAN_DOMAIN}?${search.toString()}`;
};

// ─── API Routes ────────────────────────────────────────────────────────────
export const API_HEALTH = '/api/health';
export const API_AUTH_REGISTER = '/api/auth/register';
export const API_AUTH_PROFILE = '/api/auth/profile';
export const API_AUTH_CHANGE_PASSWORD = '/api/auth/change-password';
export const API_AUTH_TOKENS = '/api/auth/tokens';
/** DELETE /api/auth/tokens/[id] */
export const apiAuthTokenRevoke = (id: string) => `${API_AUTH_TOKENS}/${encodeURIComponent(id)}`;
export const API_SCAN = '/api/scan';
export const API_SCANS = '/api/scans';
export const API_SCANS_DOMAIN = '/api/scans/domain';
export const API_SCAN_DOMAIN = '/api/scan/domain';
export const API_SCAN_JOURNEY_AGENT = '/api/scan/journey-agent';
export const API_SCAN_GEO_EEAT = '/api/scan/geo-eeat';
export const API_SALIENCY_GENERATE = '/api/saliency/generate';
export const API_SALIENCY_RESULT = '/api/saliency/result';
export const API_SHARE = '/api/share';
export const API_SEARCH = '/api/search';
export const API_JOURNEYS = '/api/journeys';
export const API_PROJECTS = '/api/projects';

/** POST /api/scan (single-page scan) */
export const apiScanCreate = API_SCAN;

/** Build: GET /api/scan?limit=&page=&projectId= */
export const apiScanList = (params?: { limit?: number; page?: number; projectId?: string | null }) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.projectId !== undefined) search.set('projectId', params.projectId ?? '');
  return search.toString() ? `${API_SCAN}?${search.toString()}` : API_SCAN;
};

/** Build: GET/DELETE /api/scan/[id] */
export const apiScan = (id: string) => `${API_SCAN}/${encodeURIComponent(id)}`;
/** Build: PATCH /api/scan/[id]/project (assign scan to project) */
export const apiScanProject = (id: string) => `${apiScan(id)}/project`;
/** Build: POST /api/scan/[id]/summarize */
export const apiScanSummarize = (id: string) => `${apiScan(id)}/summarize`;
/** Build: /api/scan/[id]/screenshot */
export const apiScanScreenshot = (id: string) => `${apiScan(id)}/screenshot`;

/** Build: POST /api/scan/domain */
export const apiScanDomainCreate = API_SCAN_DOMAIN;
/** Build: GET /api/scan/domain/[id]/status */
export const apiScanDomainStatus = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/status`;
/** Build: GET /api/scan/domain/[id]/summary */
export const apiScanDomainSummary = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/summary`;
/** Build: POST /api/scan/domain/[id]/summarize */
export const apiScanDomainSummarize = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/summarize`;
/** Build: POST /api/scan/domain/[id]/journey */
export const apiScanDomainJourney = (id: string) => `${API_SCAN_DOMAIN}/${encodeURIComponent(id)}/journey`;

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

/** Build: GET /api/tools/ssl-labs?host= */
export const apiToolsSslLabs = (host: string) => `/api/tools/ssl-labs?host=${encodeURIComponent(host)}`;
/** Build: GET /api/tools/pagespeed?url= */
export const apiToolsPageSpeed = (url: string) => `/api/tools/pagespeed?url=${encodeURIComponent(url)}`;
/** Build: GET /api/tools/wayback?url= */
/** Build: GET /api/tools/wayback?url= */
export const apiToolsWayback = (url: string) => `/api/tools/wayback?url=${encodeURIComponent(url)}`;
/** Build: GET /api/search?q=&limit= */
export const apiSearch = (q: string, limit?: number) => {
  const params = new URLSearchParams({ q });
  if (limit != null) params.set('limit', String(limit));
  return `${API_SEARCH}?${params.toString()}`;
};

/** Build: DELETE /api/scans/[id] */
export const apiScansDelete = (id: string) => `${API_SCANS}/${encodeURIComponent(id)}`;
/** Build: GET /api/scans/domain?limit=&page=&projectId= */
export const apiScansDomainList = (params?: { limit?: number; page?: number; projectId?: string | null }) => {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set('limit', String(params.limit));
  if (params?.page != null) search.set('page', String(params.page));
  if (params?.projectId !== undefined) search.set('projectId', params.projectId ?? '');
  return search.toString() ? `${API_SCANS_DOMAIN}?${search.toString()}` : API_SCANS_DOMAIN;
};
/** Build: DELETE /api/scans/domain/[id] */
export const apiScansDomainDelete = (id: string) => `${API_SCANS_DOMAIN}/${encodeURIComponent(id)}`;
/** Build: PATCH /api/scans/domain/[id]/project (assign domain scan to project) */
export const apiScansDomainProject = (id: string) => `${API_SCANS_DOMAIN}/${encodeURIComponent(id)}/project`;

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
/** Share page (deep scan): scanned pages list page size (prev/next pagination). */
export const SHARE_DOMAIN_PAGES_PAGE_SIZE = 10;

/** Base path for public share landing pages. Full URL: origin + SHARE_PATH + '/' + token */
export const SHARE_PATH = '/share';

/** Cache revalidate times (seconds). Used by lib/cache with unstable_cache. */
export const CACHE_REVALIDATE_SCAN = 60;
export const CACHE_REVALIDATE_DOMAIN = 60;
export const CACHE_REVALIDATE_SHARE = 300;
export const CACHE_REVALIDATE_LIST = 30;

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

/** Optional base URL for the UX Journey Agent (Python/Browser Use). If set, POST /api/scan/journey-agent forwards to this service. On Coolify: use internal service URL (e.g. http://ux-journey-agent:8320). */
export const ENV_UX_JOURNEY_AGENT_URL = 'UX_JOURNEY_AGENT_URL';

/** Optional base URL for GEO/E-E-A-T intensive + competitive benchmark service. If set, POST /api/scan/geo-eeat can delegate long-running jobs to this service. */
export const ENV_GEO_EEAT_SERVICE_URL = 'GEO_EEAT_SERVICE_URL';
