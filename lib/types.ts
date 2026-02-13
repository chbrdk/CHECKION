/* ------------------------------------------------------------------ */
/*  CHECKION – Core types                                             */
/* ------------------------------------------------------------------ */

export type WcagStandard = 'WCAG2A' | 'WCAG2AA' | 'WCAG2AAA';
export type IssueSeverity = 'error' | 'warning' | 'notice';
export type Runner = 'axe' | 'htmlcs';

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

export interface ScanResult {
    id: string;
    groupId?: string; // Optional for backward compatibility, but new scans will have it
    url: string;
    timestamp: string; // ISO 8601
    standard: WcagStandard;
    device: Device;
    runners: Runner[];
    issues: Issue[];
    passes: Pass[];
    stats: ScanStats;
    /** Duration of the scan in milliseconds */
    durationMs: number;
    /** Overall accessibility score (0-100) */
    score: number;
    screenshot?: string; // Base64
    /** Sustainability metrics */
    eco?: {
        co2: number; // grams per visit
        grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
        pageWeight: number; // bytes
    };
    /** Performance metrics */
    performance?: {
        ttfb: number; // ms
        fcp: number; // ms
        lcp: number; // ms
        domLoad: number; // ms
        windowLoad: number; // ms
    };
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
