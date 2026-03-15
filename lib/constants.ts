/**
 * Central place for app-wide paths and asset URLs.
 * Do not hardcode paths in components – reference these constants.
 */

/** When the app is served under a subpath (e.g. /checkion), set NEXT_PUBLIC_APP_BASE_URL to that path so API fetches hit the correct origin path. */
const APP_BASE_URL = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_BASE_URL) ? process.env.NEXT_PUBLIC_APP_BASE_URL.replace(/\/$/, '') : '';

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
/** Build app route: /projects/[id]/research */
export const pathProjectResearch = (id: string) => `${PATH_PROJECTS}/${encodeURIComponent(id)}/research`;
/** Build app route: /share/[token] */
export const pathShare = (token: string) => `${PATH_SHARE}/${encodeURIComponent(token)}`;
/** Build app route: /scan/domain?url=...&maxPages=... */
export const pathScanDomain = (params: { url: string; maxPages?: number }) => {
  const search = new URLSearchParams({ url: params.url });
  if (params.maxPages != null) search.set('maxPages', String(params.maxPages));
  return `${PATH_SCAN_DOMAIN}?${search.toString()}`;
};

// ─── API Routes ────────────────────────────────────────────────────────────
/** Base path for API URLs (e.g. '' or '/checkion' when app is under subpath). Use for client-side fetch. */
export const getApiBase = () => APP_BASE_URL;
export const API_HEALTH = `${APP_BASE_URL}/api/health`;
export const API_AUTH_REGISTER = `${APP_BASE_URL}/api/auth/register`;
export const API_AUTH_PROFILE = `${APP_BASE_URL}/api/auth/profile`;
export const API_AUTH_CHANGE_PASSWORD = `${APP_BASE_URL}/api/auth/change-password`;
export const API_AUTH_TOKENS = `${APP_BASE_URL}/api/auth/tokens`;
/** DELETE /api/auth/tokens/[id] */
export const apiAuthTokenRevoke = (id: string) => `${APP_BASE_URL}/api/auth/tokens/${encodeURIComponent(id)}`;
export const API_SCAN = `${APP_BASE_URL}/api/scan`;
export const API_SCANS = `${APP_BASE_URL}/api/scans`;
export const API_SCANS_DOMAIN = `${APP_BASE_URL}/api/scans/domain`;
export const API_SCAN_DOMAIN = `${APP_BASE_URL}/api/scan/domain`;
export const API_SCAN_JOURNEY_AGENT = `${APP_BASE_URL}/api/scan/journey-agent`;
export const API_SCAN_GEO_EEAT = `${APP_BASE_URL}/api/scan/geo-eeat`;
export const API_SALIENCY_GENERATE = `${APP_BASE_URL}/api/saliency/generate`;
export const API_SALIENCY_RESULT = `${APP_BASE_URL}/api/saliency/result`;
export const API_SHARE = `${APP_BASE_URL}/api/share`;
export const API_SEARCH = `${APP_BASE_URL}/api/search`;
export const API_JOURNEYS = `${APP_BASE_URL}/api/journeys`;
export const API_PROJECTS = `${APP_BASE_URL}/api/projects`;
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
/** Build: POST /api/scan/[id]/classify (page classification: tags + tier) */
export const apiScanClassify = (id: string) => `${apiScan(id)}/classify`;
/** Build: POST /api/scan/[id]/ux-check (Claude UX Check v2, DIN EN ISO 9241-110) */
export const apiScanUxCheck = (id: string) => `${apiScan(id)}/ux-check`;
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
/** POST /api/projects/[id]/domain-scan-all – start deep scan for own + all competitors. */
export const apiProjectDomainScanAll = (id: string) => `${API_PROJECTS}/${encodeURIComponent(id)}/domain-scan-all`;
/** GET /api/scan/domain/by-domain?domain= – latest completed scan for domain (current user). */
export const apiScanDomainByDomain = (domain: string) => `${API_SCAN_DOMAIN}/by-domain?domain=${encodeURIComponent(domain)}`;
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

/** If set, Next.js rewrites /mcp and /mcp/* to this URL (MCP server). Enables single-domain deployment: origin/mcp → MCP. Use internal URL in Coolify (e.g. http://checkion-mcp:3100). */
export const ENV_MCP_SERVER_URL = 'MCP_SERVER_URL';
