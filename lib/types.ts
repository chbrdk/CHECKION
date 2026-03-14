/* ------------------------------------------------------------------ */
/*  CHECKION – Core types                                             */
/* ------------------------------------------------------------------ */

export type WcagStandard = 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';
export type IssueSeverity = 'error' | 'warning' | 'notice';
export type Runner = 'axe' | 'htmlcs';
export type Device = 'desktop' | 'tablet' | 'mobile';

export interface Issue {
    /** WCAG criterion code, e.g. "WCAG2AA.Principle1.Guideline1_1.1_1_1.H37" */
    code: string;
    type: IssueSeverity;
    message: string;
    /** HTML snippet around the offending element */
    context: string;
    /** CSS selector that targets the element */
    selector: string;
    /** Which runner found this issue */
    runner: Runner;
    /** WCAG Level (A, AA, AAA) or Unknown */
    wcagLevel: 'A' | 'AA' | 'AAA' | 'APCA' | 'Unknown';
    /** Optional URL to remediation docs (Deque/W3C) */
    helpUrl?: string | null;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface ScanStats {
    errors: number;
    warnings: number;
    notices: number;
    total: number;
}

export interface Pass {
    id: string;
    description: string;
    help: string;
    nodes: Array<{
        html: string;
        target: string[];
        failureSummary?: string;
    }>;
}

export interface FocusOrder {
    index: number;
    text: string;
    role: string;
    rect: { x: number; y: number; width: number; height: number };
}

export interface UxResult {
    score: number;
    cls: number;
    readability: {
        grade: string;
        score: number;
    };
    tapTargets: {
        issues: string[];
        details?: TouchTargetIssue[]; // Added details
    };
    viewport: {
        isMobileFriendly: boolean;
        issues: string[];
    };
    consoleErrors: Array<{
        type: 'error' | 'warning';
        text: string;
        location?: string;
    }>;
    brokenLinks: Array<{
        href: string;
        status: number;
        text: string;
    }>;
    focusOrder: FocusOrder[];
    structureMap?: StructureNode[];
    altTextIssues?: AltTextIssue[];
    ariaIssues?: AriaIssue[];
    formIssues?: FormIssue[];
    hasSkipLink?: boolean;
    skipLinkHref?: string | null;
    resourceHints?: { preload: string[]; preconnect: string[] };
    reducedMotionInCss?: boolean;
    focusVisibleFailCount?: number;
    mediaAccessibility?: { videosWithoutCaptions: number; audiosWithoutTranscript: number };
    headingHierarchy?: {
        hasSingleH1: boolean;
        h1Count: number;
        skippedLevels: Array<{ from: number; to: number }>;
        outline: Array<{ level: number; text: string }>;
    };
    vagueLinkTexts?: Array<{ href: string; text: string }>;
    imageIssues?: {
        missingDimensions: number;
        missingLazy: number;
        missingSrcset: number;
        details?: Array<{ reason: string; selector?: string }>;
    };
    iframeIssues?: Array<{ hasTitle: boolean; src?: string }>;
    metaRefreshPresent?: boolean;
    fontDisplayIssues?: { withoutFontDisplay: number; blockCount: number };
}

/** LLM-generated UX/CX summary (from POST /api/scan/[id]/summarize). */
export interface LlmSummary {
    summary: string;
    themes: Array<{ name: string; description?: string; severity?: 'high' | 'medium' | 'low' }>;
    recommendations: Array<{ title: string; description: string; priority: 1 | 2 | 3 | 4 | 5; category?: string }>;
    overallGrade?: string;
    modelUsed: string;
    generatedAt: string;
}

export type ScanResult = {
    id: string;
    groupId?: string; // Optional for ad-hoc scans
    url: string;
    timestamp: string;
    standard: WcagStandard;
    device: Device;
    runners: Runner[];
    issues: Issue[];
    passes: any[];
    stats: ScanStats;
    durationMs: number;
    score: number;
    screenshot: string;
    /** Optional attention/saliency heatmap (data URL or base64 PNG) from MDS-ViTNet. */
    saliencyHeatmap?: string;
    allLinks?: string[]; // Internal links found (raw)
    /** Internal links with visible text for semantic search / journey (same set as allLinks). */
    allLinksWithLabels?: Array<{ href: string; text: string }>;
    performance: {
        ttfb: number;
        fcp: number;
        domLoad: number;
        windowLoad: number;
        lcp: number;
        inp?: number | null;
    };
    eco: {
        co2: number;
        grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
        pageWeight: number;
    };
    ux?: UxResult;
    seo?: SeoAudit;
    links?: LinkAudit;
    geo?: GeoAudit;
    privacy?: PrivacyAudit;
    /** E-E-A-T page-level signals (for domain aggregation). */
    eeatSignals?: EeatPageSignals;
    generative?: GenerativeEngineAudit;
    security?: SecurityAudit;
    technicalInsights?: TechnicalInsights;
    /** Set when UX/CX summary has been generated (GET includes it, POST /summarize writes it). */
    llmSummary?: LlmSummary | null;
    /** Page index: regions (what where), findability, optional semantic types (for persona click-path evaluation). */
    pageIndex?: PageIndex;
    /** Estimated scanpath (fixation order) from saliency + DOM heuristic; set when saliency heatmap and pageIndex exist. */
    scanpath?: ScanpathFixation[];
    /** Plain-text excerpt of the page body (for journey agent content evaluation). Capped at ~6k chars. */
    bodyTextExcerpt?: string;
    /** YMYL classification – stricter E-E-A-T for finance/health/legal. */
    ymyl?: YmylResult;
}

export interface TechnicalInsights {
    thirdPartyDomains: string[];
    manifest: { present: boolean; hasName: boolean; hasIcons: boolean; url?: string };
    themeColor: string | null;
    appleTouchIcon: string | null;
    serviceWorkerRegistered?: boolean;
    redirectCount?: number;
    metaRefreshPresent?: boolean;
}

/** Single keyword with frequency and density (content analysis). */
export interface KeywordDensityItem {
    keyword: string;
    count: number;
    densityPercent: number;
}

/** For top keywords: whether they appear in critical SEO elements. */
export interface KeywordPresenceItem {
    keyword: string;
    inTitle: boolean;
    inH1: boolean;
    inMetaDescription: boolean;
}

export interface SeoKeywordAnalysis {
    totalWords: number;
    /** Top content keywords (stop words removed), sorted by count, max ~15. */
    topKeywords: KeywordDensityItem[];
    /** Presence of each top keyword in title, H1, meta description. */
    keywordPresence: KeywordPresenceItem[];
    /** Raw meta keywords if present (meta name="keywords"). */
    metaKeywordsRaw?: string | null;
}

export interface SeoAudit {
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    twitterCard: string | null;
    robotsTxtPresent?: boolean;
    sitemapUrl?: string | null;
    duplicateContentWarning?: boolean;
    skinnyContent?: boolean;
    bodyWordCount?: number;
    structuredDataRequiredFields?: Array<{ type: string; missing: string[] }>;
    /** Keyword extraction from body, density, and presence in title/H1/meta. */
    keywordAnalysis?: SeoKeywordAnalysis;
}

/** AI-recommended Schema.org types for GEO */
export const GEO_RECOMMENDED_SCHEMA_TYPES = [
    'Article', 'FAQPage', 'HowTo', 'Organization', 'Person', 'WebPage', 'NewsArticle', 'WebSite'
] as const;

export interface GenerativeEngineAudit {
    score: number;
    technical: {
        hasLlmsTxt: boolean;
        hasRobotsAllowingAI: boolean;
        schemaCoverage: string[];
        jsonLdErrors?: string[];
        /** Parsed llms.txt: which sections exist (e.g. Description, Rules, Allow, Block) */
        llmsTxtSections?: string[];
        /** True if llms.txt contains a Sitemap URL */
        llmsTxtHasSitemap?: boolean;
        /** Per-bot status from robots.txt */
        aiBotStatus?: Array<{ bot: string; status: 'allowed' | 'blocked' }>;
        /** Content of meta name="robots" (or first robots-like meta) */
        metaRobotsContent?: string | null;
        /** True if page is not noindex (indexable for crawlers) */
        metaRobotsIndexable?: boolean;
        /** Schema @types that are in the recommended AI list */
        recommendedSchemaTypesFound?: string[];
        /** Which recommended types are missing (subset of GEO_RECOMMENDED_SCHEMA_TYPES) */
        missingRecommendedSchemaTypes?: string[];
        /** Article/NewsArticle JSON-LD: at least one has these fields */
        articleSchemaQuality?: {
            hasDatePublished: boolean;
            hasDateModified: boolean;
            hasAuthor: boolean;
        };
        /** Parsed Rules: section content (truncated) */
        llmsTxtRulesContent?: string;
        /** Warnings when robots.txt and llms.txt contradict (e.g. robots blocks GPTBot, llms Allow) */
        llmsTxtRobotsConsistencyWarnings?: string[];
        /** Spec required: Title (H1) and Description (blockquote) present */
        llmsTxtSpecCompliant?: { hasTitle: boolean; hasDescription: boolean };
        /** Markdown URLs in llms.txt and their reachability (200 = ok) */
        llmsTxtMarkdownUrlsReachable?: Array<{ url: string; status: number }>;
    };
    content: {
        faqCount: number;
        tableCount: number;
        listDensity: number;
        citationDensity: number;
        /** Citations that have external links (blockquote+cite or link to http) */
        citationsWithLinks?: number;
    };
    expertise: {
        hasAuthorBio: boolean;
        hasExpertCitations: boolean;
    };
    /** Human-readable score breakdown for GEO tooltip */
    scoreBreakdown?: Array<{ factor: string; points: number }>;
}

export interface GeoAudit {
    serverIp: string | null;
    location: {
        city: string | null;
        country: string | null;
        countryCode?: string | null;
        continent: string | null;
        region?: string | null;
    } | null;
    cdn: {
        detected: boolean;
        provider: string | null;
    };
    languages: {
        htmlLang: string | null;
        hreflangs: Array<{ lang: string; href: string }>;
    };
    /** True if server country/region does not match target (when targetRegion provided) */
    targetRegionMismatch?: boolean;
    /** Optional target region (e.g. DE, EU) from scan params */
    targetRegion?: string | null;
}

/** YMYL page classification – stricter E-E-A-T for finance/health/legal. */
export interface YmylResult {
    isYmyl: boolean;
    confidence: 'high' | 'medium' | 'low';
    signals: string[];
}

export interface PrivacyAudit {
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl: string | null;
    hasCookieBanner: boolean;
    hasTermsOfService: boolean;
}

/** Per-page E-E-A-T signals (for domain-scan aggregation). */
export interface EeatPageSignals {
    hasImpressum: boolean;
    hasContact: boolean;
    hasAboutLink: boolean;
    hasTeamLink: boolean;
    hasCaseStudyMention: boolean;
}

/** Domain-level E-E-A-T aggregate (from deep scan). */
export interface EeatDomainAggregate {
    trust: {
        pagesWithImpressum: number;
        pagesWithContact: number;
        pagesWithPrivacy: number;
        totalPages: number;
    };
    experience: {
        pagesWithAbout: number;
        pagesWithTeam: number;
        pagesWithCaseStudyMention: number;
        totalPages: number;
    };
    expertise: {
        pagesWithAuthorBio: number;
        pagesWithArticleAuthor: number;
        avgCitationsPerPage: number;
        totalPages: number;
    };
    authoritativeness?: string;
}

export interface SecurityAudit {
    contentSecurityPolicy: { present: boolean; value?: string };
    xFrameOptions: { present: boolean; value?: string };
    xContentTypeOptions: { present: boolean; value?: string };
    strictTransportSecurity: { present: boolean; value?: string };
    referrerPolicy: { present: boolean; value?: string };
    mixedContentUrls?: string[];
    sriMissing?: Array<{ tag: string; url: string }>;
    cookieWarnings?: Array<{ message: string }>;
}

export interface LinkAudit {
    broken: LinkResult[];
    total: number;
    internal: number;
    external: number;
    missingNoopener?: Array<{ url: string; text: string }>;
    pdfLinks?: Array<{ url: string; text: string }>;
}

export interface LinkResult {
    url: string;
    text: string;
    statusCode: number;
    message?: string;
    internal: boolean;
}

export type DomainScanStatus = 'queued' | 'scanning' | 'complete' | 'error';

/** Minimal page reference stored in domain scan payload (single scan id = link to /results/[id]). */
export interface SlimPage {
    id: string;
    url: string;
    score: number;
    stats: { errors: number; warnings: number; notices: number };
    ux?: { score: number };
    /** E-E-A-T on-page signals from deep scan (optional; present when stored with extended payload). */
    eeatSignals?: EeatPageSignals;
    /** Has privacy policy (from deep scan). */
    hasPrivacy?: boolean;
}

/** Precomputed during deep scan; stored in domain_scans.payload. */
export type DomainAggregated = Record<string, unknown>;

/** Domain scan with full page results (e.g. for journey agent). Load from scans table when payload has slim pages. */
export type DomainScanResultWithFullPages = Omit<DomainScanResult, 'pages'> & { pages: ScanResult[] };

export type DomainScanResult = {
    id: string;
    domain: string;
    timestamp: string;
    status: DomainScanStatus;
    progress: {
        scanned: number;
        total: number;
        currentUrl?: string;
    };
    totalPages: number;
    score: number;
    /** Stored: SlimPage[] (id = scan id). Legacy payloads may have ScanResult[]; use payload.aggregated to detect. */
    pages: SlimPage[] | ScanResult[];
    /** Precomputed during deep scan; absent on legacy payloads. */
    aggregated?: DomainAggregated;
    graph: {
        nodes: Array<{
            id: string,
            url: string,
            score: number,
            /** URL path depth: 0 = home, 1 = /segment, 2 = /seg1/seg2, etc. */
            depth: number,
            status: 'ok' | 'error',
            /** Page title from document title (SEO) when available */
            title?: string | null
        }>,
        links: Array<{
            source: string,
            target: string
        }>
    };
    systemicIssues: Array<{
        issueId: string,
        title: string,
        count: number,
        pages: string[]
    }>;
    /** E-E-A-T aggregate (from deep scan only). */
    eeat?: EeatDomainAggregate;
    error?: string;
    /** LLM-generated domain-wide UX/CX summary (from POST /api/scan/domain/[id]/summarize). */
    llmSummary?: LlmSummary | null;
};

/** Link with label for section/region assignment. */
export interface StructureLink {
    href: string;
    text: string;
}

export interface StructureNode {
    tag: string;
    text: string;
    level: number; // 1-6 headings, 0 landmarks, 7 button, 8 paragraph
    rect?: { x: number; y: number; width: number; height: number };
    /** Plain-text content of this section/region (for journey: attention zone content). */
    contentSnippet?: string;
    /** Links inside this section/region (for journey: which links belong to which zone). */
    links?: StructureLink[];
    children?: StructureNode[];
    error?: string; // e.g. "Skipped heading level"
}

/** Semantic type for a page region (heuristic from heading/label). */
export type PageIndexRegionType = 'pricing' | 'faq' | 'contact' | 'hero' | 'product' | 'team' | 'about' | 'nav' | 'footer' | 'main' | 'aside' | 'unknown';

/** Single region in the page index: one landmark or heading from structureMap with findability and optional semantic label. */
export interface PageIndexRegion {
    id: string;
    tag: string;
    headingText: string;
    level: number;
    rect?: { x: number; y: number; width: number; height: number };
    indexInDocument: number;
    aboveFold: boolean;
    findabilityScore: number;
    /** Optional: mean saliency (0–1) in this region from heatmap; set when saliency heatmap is available. */
    saliencyProminence?: number;
    semanticType?: PageIndexRegionType;
    /** Plain-text content of this section (attention zone). */
    textSnippet?: string;
    /** Links inside this section/region (attention zone). */
    links?: StructureLink[];
}

/** Page index: what is where and how findable (for persona click-path evaluation). */
export interface PageIndex {
    url: string;
    viewportHeight: number;
    regions: PageIndexRegion[];
}

/** Single fixation in the estimated scanpath (gaze order from saliency + DOM heuristic). */
export interface ScanpathFixation {
    x: number;
    y: number;
    order: number;
    regionId?: string;
    saliency?: number;
}

/** One search result from GET /api/search (dashboard search). */
export type SearchMatchType = 'url' | 'region' | 'issue' | 'seo' | 'domain';

export interface SearchMatch {
    type: 'single' | 'domain';
    id: string;
    url: string;
    domain?: string;
    snippet: string;
    matchType: SearchMatchType;
    timestamp?: string;
    score?: number;
}

/** One step in a user journey (agent-chosen page + optional trigger and region findability). */
export interface JourneyStep {
    pageUrl: string;
    pageTitle?: string;
    /** Link text or region the user would click to get here. */
    triggerLabel?: string;
    /** Why the agent chose this link (e.g. from search_on_page reason). */
    navigationReason?: string;
    /** If the agent backtracked to this step, why it went back from the next page. */
    backtrackFromReason?: string;
    regionId?: string;
    /** Findability score of the matched region (0–1). Higher = easier to find. */
    regionFindability?: number;
    /** Whether the trigger region was above the fold. */
    regionAboveFold?: boolean;
    /** Semantic type of the region (e.g. nav, hero, main). */
    regionSemanticType?: string;
    index: number;
}

/** Result of the journey agent: path of pages and whether the goal was reached. */
export interface JourneyResult {
    steps: JourneyStep[];
    goalReached: boolean;
    message?: string;
}

/** One step from the UX Journey Agent (browser-based: action, selector, screenshot per step). */
export interface UxJourneyAgentStep {
    step: number;
    action: string;
    target?: string;
    selector?: string;
    reasoning?: string;
    /** Human-readable outcome for this step (e.g. "Navigated to ...", "Task completed: ..."). */
    result?: string;
    screenshot?: string;
    timestamp?: string;
}

/** Result of a UX Journey Agent run (Browser Use + Claude). */
export interface UxJourneyAgentResult {
    jobId: string;
    taskDescription: string;
    siteDomain: string;
    steps: UxJourneyAgentStep[];
    success: boolean;
    screenshots?: string[];
    /** If recording was enabled: path/URL to the journey video (use CHECKION proxy /api/scan/journey-agent/[jobId]/video). */
    videoUrl?: string;
}

/** E-E-A-T dimension scores from LLM (1–5) with reasoning. */
export interface EeatLlmScores {
    trust: { score: number; reasoning: string };
    experience: { score: number; reasoning: string };
    expertise: { score: number; reasoning: string };
    authoritativeness?: { score: number; reasoning: string };
}

/** One page result in GEO/E-E-A-T intensive analysis. */
export interface GeoEeatPageResult {
    url: string;
    title?: string;
    /** Technical signals from scan (generative, eeatSignals, seo, privacy, etc.). */
    technical?: {
        generative?: Partial<GenerativeEngineAudit>;
        eeatSignals?: EeatPageSignals;
        hasPrivacy?: boolean;
        hasImpressum?: boolean;
    };
    bodyTextExcerpt?: string;
    /** LLM-derived E-E-A-T scores (Stufe 2). */
    eeatScores?: EeatLlmScores;
    /** GEO fitness score 0–100 and reasoning (Stufe 3). */
    geoFitnessScore?: number;
    geoFitnessReasoning?: string;
    missingGeoElements?: string[];
}

/** One recommendation from LLM (Stufe 4). */
export interface GeoEeatRecommendation {
    priority: number;
    title: string;
    description: string;
    /** Affected URLs or "domain-wide". */
    affectedUrls?: string[];
    dimension?: 'trust' | 'experience' | 'expertise' | 'authoritativeness' | 'geo';
}

/** Citation of a domain in an LLM response for one query. */
export interface CompetitiveCitation {
    domain: string;
    position: number;
    context?: string;
}

/** One query run: provider + extracted citations. */
export interface CompetitiveCitationRun {
    queryId: string;
    query: string;
    provider: string;
    citations: CompetitiveCitation[];
    rawAnswerExcerpt?: string;
}

/** Per-domain metrics for competitive benchmark. */
export interface CompetitiveMetrics {
    domain: string;
    shareOfVoice: number;
    avgPosition: number;
    queryCount: number;
    mentionCount: number;
}

/** Competitive benchmark block inside GeoEeatIntensiveResult. */
export interface CompetitiveBenchmarkResult {
    queries: string[];
    competitors: string[];
    runs: CompetitiveCitationRun[];
    metrics: CompetitiveMetrics[];
}

/** Full result of a GEO/E-E-A-T intensive run (Stufen 1–4 + optional Competitive). */
export interface GeoEeatIntensiveResult {
    pages: GeoEeatPageResult[];
    recommendations: GeoEeatRecommendation[];
    aggregated?: Record<string, unknown>;
    /** Single-model competitive result (legacy). */
    competitive?: CompetitiveBenchmarkResult;
    /** Per-model competitive benchmark (gpt-5-nano, gpt-5-mini, gpt-5). */
    competitiveByModel?: Record<string, CompetitiveBenchmarkResult>;
    error?: string;
}

export interface TouchTargetIssue {
    selector: string;
    element: string;
    text?: string;
    rect: { x: number; y: number; width: number; height: number };
    size: { width: number; height: number };
    message: string;
}

export interface AltTextIssue {
    imgHtml: string;
    alt: string;
    rect: { x: number; y: number; width: number; height: number };
    reason: string; // "Filename", "Too short", "Redundant"
}

export interface AriaIssue {
    element: string;
    attribute: string; // aria-labelledby, for, etc.
    value: string;
    rect: { x: number; y: number; width: number; height: number };
    message: string;
}

export interface FormIssue {
    element: string;
    rect: { x: number; y: number; width: number; height: number };
    message: string; // "Missing label", "Duplicate ID"
}

export interface ScanRequest {
    url: string;
    standard?: WcagStandard;
    device?: Device;
    runners?: Runner[];
}

export interface ScanOptions {
    url: string;
    standard?: WcagStandard;
    device?: Device;
    runners?: Runner[];
}
