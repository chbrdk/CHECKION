/**
 * Text budgets and slide-zone geometry for MSQDX 16:9 masters.
 * Values are calibrated from placeholder bounding boxes in the PPT master.
 * @see assets/report-templates/msqdx-ppt-zone-calibration.json
 */
import {
    getMsqdxColumnZoneCalibration,
    getMsqdxContentZoneCalibration,
    loadMsqdxPptZoneCalibration,
} from '@/lib/project-report/pptx/load-msqdx-ppt-zone-calibration';
import type { ReportSlide, ReportSlideChartType, ReportSlideContent } from '@/lib/project-report/pptx/types';

const CONTENT_ZONES = getMsqdxContentZoneCalibration();

export const PPTX_ZONE_GEOMETRY = {
    slideWidth: loadMsqdxPptZoneCalibration().slideSize.width,
    slideHeight: loadMsqdxPptZoneCalibration().slideSize.height,
    marginX: CONTENT_ZONES.body.x,
    footerTop: CONTENT_ZONES.footer.y,
    titleBottom: CONTENT_ZONES.title.bottom,
    eyebrowTop: CONTENT_ZONES.eyebrow.y,
    eyebrowLineHeight: +(CONTENT_ZONES.eyebrow.h / Math.max(CONTENT_ZONES.eyebrow.budget.maxLines, 1)).toFixed(3),
    eyebrowMaxLines: CONTENT_ZONES.eyebrow.budget.maxLines,
    bodyTop: CONTENT_ZONES.body.y,
    elementGap: CONTENT_ZONES.chart.gap,
    bulletLineHeight: +(13 * 1.2) / 72,
    bulletBandPadding: 0.14,
    minChartHeight: CONTENT_ZONES.chart.minHeightBar,
    maxChartHeight: CONTENT_ZONES.chart.maxHeight,
    charsPerTitleLine: CONTENT_ZONES.title.budget.maxCharsPerLine,
    charsPerEyebrowLine: CONTENT_ZONES.eyebrow.budget.maxCharsPerLine,
    charsPerBullet: CONTENT_ZONES.body.budget.maxCharsPerLine,
    charsPerColumnLine: getMsqdxColumnZoneCalibration()?.budget.maxCharsPerLine ?? 54,
    columnMaxLines: getMsqdxColumnZoneCalibration()?.budget.maxLines ?? 21,
} as const;

export type PptxTextZone = 'title' | 'eyebrow' | 'body' | 'chartBullets' | 'column';

export type PptxZoneBudget = {
    maxLines: number;
    maxCharsPerLine: number;
    maxItems?: number;
};

const CHART_BULLET_CHARS = Math.floor(CONTENT_ZONES.body.budget.maxCharsPerLine * 0.95);

export const PPTX_ZONE_BUDGETS: Record<PptxTextZone, PptxZoneBudget> = {
    title: CONTENT_ZONES.title.budget,
    eyebrow: CONTENT_ZONES.eyebrow.budget,
    body: CONTENT_ZONES.body.budget,
    chartBullets: { maxLines: 1, maxCharsPerLine: CHART_BULLET_CHARS, maxItems: 2 },
    column: getMsqdxColumnZoneCalibration()?.budget ?? {
        maxLines: PPTX_ZONE_GEOMETRY.columnMaxLines,
        maxCharsPerLine: PPTX_ZONE_GEOMETRY.charsPerColumnLine,
    },
};

export type PptxChartLayout = {
    x: number;
    y: number;
    w: number;
    h: number;
    bulletTop: number;
    bulletHeight: number;
    fittedSubtitle?: string;
    onSlideBullets: string[];
    overflowBullets: string[];
};

function ellipsis(text: string, maxChars: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= maxChars) return trimmed;
    if (maxChars <= 1) return '…';
    return `${trimmed.slice(0, maxChars - 1).trim()}…`;
}

export function estimateLineCount(text: string, charsPerLine: number): number {
    const normalized = text.trim();
    if (!normalized) return 0;
    const hardLines = normalized.split(/\n+/).length;
    const wrapped = Math.ceil(normalized.length / Math.max(charsPerLine, 1));
    return Math.max(hardLines, wrapped);
}

export function fitTextToZone(text: string, zone: PptxTextZone): string {
    const budget = PPTX_ZONE_BUDGETS[zone];
    const maxChars = budget.maxCharsPerLine * budget.maxLines;
    return ellipsis(text.replace(/\s+/g, ' '), maxChars);
}

export function fitBulletsToZone(
    bullets: string[],
    zone: PptxTextZone
): { fitted: string[]; overflow: string[] } {
    const budget = PPTX_ZONE_BUDGETS[zone];
    const maxItems = budget.maxItems ?? bullets.length;
    const fitted: string[] = [];
    const overflow: string[] = [];

    for (const bullet of bullets) {
        const normalized = ellipsis(bullet.replace(/\s+/g, ' '), budget.maxCharsPerLine);
        if (fitted.length < maxItems) {
            fitted.push(normalized);
        } else {
            overflow.push(normalized);
        }
    }

    return { fitted, overflow };
}

export function fitColumnContent(content: ReportSlideContent): ReportSlideContent {
    const budget = PPTX_ZONE_BUDGETS.column;
    const maxChars = budget.maxCharsPerLine * budget.maxLines;

    if (content.kind === 'text') {
        return { kind: 'text', text: ellipsis(content.text.replace(/\s+/g, ' '), maxChars) };
    }

    const { fitted, overflow } = fitBulletsToZone(content.bullets, 'column');
    if (overflow.length > 0 && fitted.length > 0) {
        const last = fitted[fitted.length - 1]!;
        fitted[fitted.length - 1] = ellipsis(`${last} (+${overflow.length})`, budget.maxCharsPerLine);
    }
    return { kind: 'bullets', bullets: fitted };
}

function chartMinHeight(chartType: ReportSlideChartType): number {
    const chart = CONTENT_ZONES.chart;
    if (chartType === 'radar') return chart.minHeightRadar;
    if (chartType === 'line') return chart.minHeightLine;
    return chart.minHeightBar;
}

export function computeChartLayout(input: {
    subtitle?: string;
    bullets?: string[];
    chartType: ReportSlideChartType;
}): PptxChartLayout {
    const chartZone = CONTENT_ZONES.chart;
    const fittedSubtitle = input.subtitle ? fitTextToZone(input.subtitle, 'eyebrow') : undefined;
    const { fitted, overflow } = fitBulletsToZone(input.bullets ?? [], 'chartBullets');

    const bulletHeight = fitted.length > 0 ? chartZone.bulletBandHeight : 0;
    const available = CONTENT_ZONES.footer.y - chartZone.gap - chartZone.y - bulletHeight;
    const chartHeight = Math.max(chartMinHeight(input.chartType), available);

    return {
        x: chartZone.x,
        y: chartZone.y,
        w: chartZone.w,
        h: chartHeight,
        bulletTop: chartZone.y + chartHeight + chartZone.gap,
        bulletHeight,
        fittedSubtitle,
        onSlideBullets: fitted,
        overflowBullets: overflow,
    };
}

export function fitBulletSlide(input: {
    title: string;
    lead?: string;
    bullets: string[];
}): {
    title: string;
    lead?: string;
    bullets: string[];
    overflowBullets: string[];
} {
    const title = fitTextToZone(input.title, 'title');
    const lead = input.lead?.trim() ? fitTextToZone(input.lead, 'eyebrow') : undefined;
    const { fitted, overflow } = fitBulletsToZone(input.bullets, 'body');

    return { title, lead, bullets: fitted, overflowBullets: overflow };
}

export function overflowBulletsSlides(
    base: Extract<ReportSlide, { kind: 'bullets' }>,
    overflowBullets: string[],
    suffix: string
): Extract<ReportSlide, { kind: 'bullets' }>[] {
    if (overflowBullets.length === 0) return [];
    const chunkSize = PPTX_ZONE_BUDGETS.body.maxItems ?? 6;
    const chunks: string[][] = [];
    for (let i = 0; i < overflowBullets.length; i += chunkSize) {
        chunks.push(overflowBullets.slice(i, i + chunkSize));
    }
    return chunks.map((bullets, index) => ({
        kind: 'bullets' as const,
        layout: 'CONTENT' as const,
        title: `${base.title}${suffix}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`,
        bullets,
        footer: base.footer,
    }));
}
