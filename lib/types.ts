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
    links?: string[]; // Internal links found
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
    ux?: {
        score: number;
        cls: number;
        readability: string;
        tapTargets: { issues: any[] };
        viewport: { isMobileFriendly: boolean; issues: string[] };
        consoleErrors: any[];
        brokenLinks: any[];
    };
};

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

export interface UxResult {
    score: number;
    cls: number;
    readability: {
        score: number;
        grade: string;
        wordCount: number;
    };
    tapTargets: {
        score: number;
        issues: Array<{
            selector: string;
            text: string;
            size: { width: number; height: number };
        }>;
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
