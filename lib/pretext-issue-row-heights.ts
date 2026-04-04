/**
 * Row-height estimates for virtualized issue tables using Pretext (`PRETEXT_NPM_URL` in `lib/constants.ts`).
 * Canvas-based `prepare()` only runs in the browser; SSR and tests use fallbacks.
 */
import { prepare, layout } from '@chenglou/pretext';
import type { Issue } from '@/lib/types';
import { DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX, SCAN_ISSUE_LIST_ROW_FALLBACK_PX } from '@/lib/constants';

/** ScanIssueList / ScanIssueRow grid: `1fr` + `1.2fr` + fixed tracks (px). */
const SCAN_ISSUE_FIXED_TRACKS_PX = 80 + 72 + 40;
const SCAN_ISSUE_FR_TOTAL = 1 + 1.2 + 1;
const SCAN_ISSUE_MESSAGE_FR = 1.2;
const SCAN_ISSUE_CODE_FR = 1;
/** MsqdxTypography body2 + lineHeight 1.4 — align with ThemeProvider Inter stack. */
const SCAN_ISSUE_MESSAGE_FONT = '500 14px Inter, Helvetica, Arial, sans-serif';
const SCAN_ISSUE_MESSAGE_LINE_HEIGHT_PX = 14 * 1.4;
const SCAN_ISSUE_CODE_FONT = '400 11.2px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const SCAN_ISSUE_CODE_LINE_HEIGHT_PX = 11.2 * 1.3;
const SCAN_ISSUE_CELL_HPAD_MSG = 24;
const SCAN_ISSUE_CELL_HPAD_CODE = 24;
const SCAN_ISSUE_ROW_VPAD_PX = 16;
const SCAN_ISSUE_CHIP_MIN_PX = 22;
const SCAN_ISSUE_ROW_MIN_PX = 52;

/** DomainAggregatedIssueList grid columns (see component). */
const DOMAIN_AGG_FIXED_TRACKS_PX = 70 + 80 + 72 + 92 + 48;
const DOMAIN_AGG_FR_TOTAL = 1.2 + 1;
const DOMAIN_AGG_MESSAGE_FR = 1.2;
const DOMAIN_AGG_CODE_FR = 1;
const DOMAIN_AGG_MESSAGE_FONT = '500 12px Inter, Helvetica, Arial, sans-serif';
const DOMAIN_AGG_MESSAGE_LINE_HEIGHT_PX = 12 * 1.3;
const DOMAIN_AGG_CODE_FONT = '400 10.4px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
const DOMAIN_AGG_CODE_LINE_HEIGHT_PX = 10.4 * 1.3;
const DOMAIN_AGG_CELL_HPAD = 16;
const DOMAIN_AGG_ROW_VPAD_PX = 8;
const DOMAIN_AGG_CHIP_MIN_PX = 18;

function canUsePretextCanvas(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return typeof OffscreenCanvas !== 'undefined' || typeof document.createElement === 'function';
    } catch {
        return false;
    }
}

/** Content widths inside message/code cells (matches CSS grid `fr` distribution). */
export function scanIssueListMessageAndCodeWidths(containerInnerWidthPx: number): {
    message: number;
    code: number;
} {
    const inner = Math.max(0, containerInnerWidthPx);
    const flexSpace = Math.max(0, inner - SCAN_ISSUE_FIXED_TRACKS_PX);
    const frUnit = flexSpace > 0 ? flexSpace / SCAN_ISSUE_FR_TOTAL : 0;
    const messageTrack = SCAN_ISSUE_MESSAGE_FR * frUnit;
    const codeTrack = SCAN_ISSUE_CODE_FR * frUnit;
    return {
        message: Math.max(48, messageTrack - SCAN_ISSUE_CELL_HPAD_MSG),
        code: Math.max(32, codeTrack - SCAN_ISSUE_CELL_HPAD_CODE),
    };
}

export function domainAggregatedMessageAndCodeWidths(containerInnerWidthPx: number): {
    message: number;
    code: number;
} {
    const inner = Math.max(0, containerInnerWidthPx);
    const flexSpace = Math.max(0, inner - DOMAIN_AGG_FIXED_TRACKS_PX);
    const frUnit = flexSpace > 0 ? flexSpace / DOMAIN_AGG_FR_TOTAL : 0;
    const messageTrack = DOMAIN_AGG_MESSAGE_FR * frUnit;
    const codeTrack = DOMAIN_AGG_CODE_FR * frUnit;
    return {
        message: Math.max(48, messageTrack - DOMAIN_AGG_CELL_HPAD),
        code: Math.max(32, codeTrack - DOMAIN_AGG_CELL_HPAD),
    };
}

function shortCode(code: string): string {
    return code.length > 48 ? `${code.slice(0, 48)}…` : code;
}

/**
 * Per-row height estimates for `ScanIssueList` (collapsed `<details>` only; `measureElement` still corrects).
 */
export function estimateScanIssueListRowHeights(issues: readonly Issue[], containerInnerWidthPx: number): number[] {
    if (!canUsePretextCanvas() || containerInnerWidthPx <= 0) {
        return issues.map(() => SCAN_ISSUE_LIST_ROW_FALLBACK_PX);
    }
    const { message: msgW, code: codeW } = scanIssueListMessageAndCodeWidths(containerInnerWidthPx);
    const prepMessage = new Map<string, ReturnType<typeof prepare>>();
    const prepCode = new Map<string, ReturnType<typeof prepare>>();
    return issues.map((issue) => {
        try {
            let pm = prepMessage.get(issue.message);
            if (!pm) {
                pm = prepare(issue.message, SCAN_ISSUE_MESSAGE_FONT);
                prepMessage.set(issue.message, pm);
            }
            const c = shortCode(issue.code);
            let pc = prepCode.get(c);
            if (!pc) {
                pc = prepare(c, SCAN_ISSUE_CODE_FONT);
                prepCode.set(c, pc);
            }
            const hMsg = layout(pm, msgW, SCAN_ISSUE_MESSAGE_LINE_HEIGHT_PX).height;
            const hCode = layout(pc, codeW, SCAN_ISSUE_CODE_LINE_HEIGHT_PX).height;
            const contentH = Math.max(hMsg, hCode, SCAN_ISSUE_CHIP_MIN_PX);
            return Math.max(SCAN_ISSUE_ROW_MIN_PX, Math.ceil(contentH + SCAN_ISSUE_ROW_VPAD_PX));
        } catch {
            return SCAN_ISSUE_LIST_ROW_FALLBACK_PX;
        }
    });
}

/**
 * Per-row estimates for paginated `DomainAggregatedIssueList` rows.
 */
export function estimateDomainAggregatedRowHeights(
    issues: readonly Issue[],
    containerInnerWidthPx: number
): number[] {
    if (!canUsePretextCanvas() || containerInnerWidthPx <= 0) {
        return issues.map(() => DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX);
    }
    const { message: msgW, code: codeW } = domainAggregatedMessageAndCodeWidths(containerInnerWidthPx);
    const prepMessage = new Map<string, ReturnType<typeof prepare>>();
    const prepCode = new Map<string, ReturnType<typeof prepare>>();
    return issues.map((issue) => {
        try {
            const msg = issue.message ?? '';
            let pm = prepMessage.get(msg);
            if (!pm) {
                pm = prepare(msg, DOMAIN_AGG_MESSAGE_FONT);
                prepMessage.set(msg, pm);
            }
            const c = shortCode(issue.code ?? '');
            let pc = prepCode.get(c);
            if (!pc) {
                pc = prepare(c, DOMAIN_AGG_CODE_FONT);
                prepCode.set(c, pc);
            }
            const hMsg = layout(pm, msgW, DOMAIN_AGG_MESSAGE_LINE_HEIGHT_PX).height;
            const hCode = layout(pc, codeW, DOMAIN_AGG_CODE_LINE_HEIGHT_PX).height;
            const contentH = Math.max(hMsg, hCode, DOMAIN_AGG_CHIP_MIN_PX);
            return Math.max(
                DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
                Math.ceil(contentH + DOMAIN_AGG_ROW_VPAD_PX)
            );
        } catch {
            return DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX;
        }
    });
}
