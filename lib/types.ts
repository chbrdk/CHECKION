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
};

export interface SeoAudit {
    title: string | null;
    metaDescription: string | null;
    h1: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    twitterCard: string | null;
}

export interface GenerativeEngineAudit {
    score: number;
    technical: {
        hasLlmsTxt: boolean;
        hasRobotsAllowingAI: boolean;
        schemaCoverage: string[];
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

export interface LinkAudit {
    broken: LinkResult[];
    total: number;
    internal: number;
    external: number;
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
