/**
 * Shared normalization of `Issue` into flat columns used by `scan_issues` and `domain_page_issues`.
 */
import type { Issue } from '@/lib/types';

/** Columns aligned with DB string/json fields (single source for drift prevention). */
export type WcagIssueFlatColumns = {
    code: string;
    type: string;
    message: string;
    context: string;
    selector: string;
    runner: string;
    wcagLevel: string;
    helpUrl: string | null;
    /** Stored as jsonb on `scan_issues`; on domain rows use `metaFromWcagIssueFlat`. */
    boundingBox: Issue['boundingBox'] | null;
};

export function issueToFlatColumns(issue: Issue): WcagIssueFlatColumns {
    return {
        code: issue.code,
        type: issue.type,
        message: issue.message,
        context: issue.context ?? '',
        selector: issue.selector ?? '',
        runner: issue.runner,
        wcagLevel: issue.wcagLevel,
        helpUrl: issue.helpUrl ?? null,
        boundingBox: issue.boundingBox ?? null,
    };
}

/** `domain_page_issues.meta` — bounding box only when present. */
export function metaFromWcagIssueFlat(f: WcagIssueFlatColumns): Record<string, unknown> | null {
    return f.boundingBox ? { boundingBox: f.boundingBox } : null;
}
