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
    allLinks?: string[]; // Internal links found (raw)
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
    generative?: GenerativeEngineAudit;
    security?: SecurityAudit;
    technicalInsights?: TechnicalInsights;
    /** Set when UX/CX summary has been generated (GET includes it, POST /summarize writes it). */
    llmSummary?: LlmSummary | null;
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
    };
    content: {
        faqCount: number;
        tableCount: number;
        listDensity: number;
        citationDensity: number;
    };
    expertise: {
        hasAuthorBio: boolean;
        hasExpertCitations: boolean;
    };
}

export interface GeoAudit {
    serverIp: string | null;
    location: {
        city: string | null;
        country: string | null;
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
}

export interface PrivacyAudit {
    hasPrivacyPolicy: boolean;
    privacyPolicyUrl: string | null;
    hasCookieBanner: boolean;
    hasTermsOfService: boolean;
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
    pages: ScanResult[];
    graph: {
        nodes: Array<{
            id: string,
            url: string,
            score: number,
            depth: number,
            status: 'ok' | 'error'
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
    error?: string;
};

export interface StructureNode {
    tag: string;
    text: string;
    level: number; // 1-6 for headings, 0 for landmarks
    rect?: { x: number; y: number; width: number; height: number };
    children?: StructureNode[];
    error?: string; // e.g. "Skipped heading level"
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
