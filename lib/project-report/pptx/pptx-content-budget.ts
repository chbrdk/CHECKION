/**
 * Text budgets and slide-zone geometry for MSQDX 16:9 masters.
 * Values are calibrated from placeholder bounding boxes in the PPT master.
 * Text is never truncated — overflow is split to additional slides.
 * @see assets/report-templates/msqdx-ppt-zone-calibration.json
 */
import {
    getMsqdxColumnZoneCalibration,
    getMsqdxContentZoneCalibration,
    loadMsqdxPptZoneCalibration,
} from '@/lib/project-report/pptx/load-msqdx-ppt-zone-calibration';
import { PPTX_TYPOGRAPHY } from '@/lib/project-report/pptx/pptx-typography';
import {
    chunkBulletsForSlides,
    measureTextHeightForString,
    packBulletsByHeight,
    packBulletsByLineBudget,
    partitionTextToZone,
    PPTX_ZONE_BUDGETS,
    splitTextToPages,
    wrapTextToLines,
    type PptxTextZone,
    type PptxZoneBudget,
} from '@/lib/project-report/pptx/pptx-text-layout';
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
    bulletLineHeight: +(PPTX_TYPOGRAPHY.chartBullet.fontPt * PPTX_TYPOGRAPHY.chartBullet.lineSpacing) / 72,
    bulletBandPadding: 0.14,
    minChartHeight: CONTENT_ZONES.chart.minHeightBar,
    maxChartHeight: CONTENT_ZONES.chart.maxHeight,
    charsPerTitleLine: CONTENT_ZONES.title.budget.maxCharsPerLine,
    charsPerEyebrowLine: CONTENT_ZONES.eyebrow.budget.maxCharsPerLine,
    charsPerBullet: CONTENT_ZONES.body.budget.maxCharsPerLine,
    charsPerColumnLine: getMsqdxColumnZoneCalibration()?.budget.maxCharsPerLine ?? 54,
    columnMaxLines: getMsqdxColumnZoneCalibration()?.budget.maxLines ?? 21,
} as const;

export type { PptxTextZone, PptxZoneBudget };
export { PPTX_ZONE_BUDGETS };

export type PptxChartLayout = {
    x: number;
    y: number;
    w: number;
    h: number;
    bulletTop: number;
    bulletHeight: number;
    fittedSubtitle?: string;
    overflowSubtitle?: string;
    onSlideBullets: string[];
    overflowBullets: string[];
};

export { wrapTextToLines, partitionTextToZone, splitTextToPages, measureTextHeightForString };

export function estimateLineCount(text: string, charsPerLine: number): number {
    return wrapTextToLines(text, charsPerLine).length;
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
    let overflowSubtitle: string | undefined;
    let fittedSubtitle: string | undefined;

    if (input.subtitle?.trim()) {
        const partitioned = partitionTextToZone(input.subtitle, 'eyebrow');
        fittedSubtitle = partitioned.onSlide || undefined;
        overflowSubtitle = partitioned.overflow || undefined;
    }

    const maxBulletBand = Math.max(
        0,
        CONTENT_ZONES.footer.y - chartZone.gap - chartZone.y - chartMinHeight(input.chartType) - chartZone.gap
    );

    let { packed, overflow, bandHeight } = packBulletsByHeight(
        input.bullets ?? [],
        'chartBullets',
        maxBulletBand,
        PPTX_ZONE_GEOMETRY.bulletBandPadding
    );

    let available = CONTENT_ZONES.footer.y - chartZone.gap - chartZone.y - bandHeight - chartZone.gap;
    let chartHeight = Math.max(chartMinHeight(input.chartType), available);

    if (chartHeight > available && packed.length > 0) {
        overflow = [...packed.splice(packed.length - 1), ...overflow];
        const retry = packBulletsByHeight(packed, 'chartBullets', maxBulletBand, PPTX_ZONE_GEOMETRY.bulletBandPadding);
        packed = retry.packed;
        overflow = [...retry.overflow, ...overflow];
        bandHeight = retry.bandHeight;
        available = CONTENT_ZONES.footer.y - chartZone.gap - chartZone.y - bandHeight - chartZone.gap;
        chartHeight = Math.max(chartMinHeight(input.chartType), available);
    }

    return {
        x: chartZone.x,
        y: chartZone.y,
        w: chartZone.w,
        h: chartHeight,
        bulletTop: chartZone.y + chartHeight + chartZone.gap,
        bulletHeight: bandHeight,
        fittedSubtitle,
        overflowSubtitle,
        onSlideBullets: packed,
        overflowBullets: overflow,
    };
}

export function layoutBulletSlide(input: {
    title: string;
    lead?: string;
    bullets: string[];
}): {
    title: string;
    titleOverflowPages: string[];
    lead?: string;
    leadOverflow?: string;
    bullets: string[];
    overflowBullets: string[];
} {
    const titlePages = splitTextToPages(input.title, 'title');
    const title = titlePages[0] ?? '';
    const titleOverflowPages = titlePages.slice(1);

    let lead: string | undefined;
    let leadOverflow: string | undefined;
    if (input.lead?.trim()) {
        const partitioned = partitionTextToZone(input.lead, 'eyebrow');
        lead = partitioned.onSlide || undefined;
        leadOverflow = partitioned.overflow || undefined;
    }

    const { packed, overflow } = packBulletsByLineBudget(input.bullets, 'body', PPTX_ZONE_BUDGETS.body.maxLines);

    return {
        title,
        titleOverflowPages,
        lead,
        leadOverflow,
        bullets: packed,
        overflowBullets: overflow,
    };
}

export function layoutColumnContent(content: ReportSlideContent): {
    content: ReportSlideContent;
    overflow: ReportSlideContent | null;
} {
    const budget = PPTX_ZONE_BUDGETS.column;

    if (content.kind === 'text') {
        const partitioned = partitionTextToZone(content.text, 'column');
        return {
            content: { kind: 'text', text: partitioned.onSlide },
            overflow: partitioned.overflow ? { kind: 'text', text: partitioned.overflow } : null,
        };
    }

    const { packed, overflow } = packBulletsByLineBudget(content.bullets, 'column', budget.maxLines);
    return {
        content: { kind: 'bullets', bullets: packed },
        overflow: overflow.length > 0 ? { kind: 'bullets', bullets: overflow } : null,
    };
}

export function overflowBulletsSlides(
    base: Extract<ReportSlide, { kind: 'bullets' }>,
    overflowBullets: string[],
    suffix: string
): Extract<ReportSlide, { kind: 'bullets' }>[] {
    if (overflowBullets.length === 0) return [];
    const chunks = chunkBulletsForSlides(overflowBullets, 'body');
    return chunks.map((bullets, index) => ({
        kind: 'bullets' as const,
        layout: 'CONTENT' as const,
        title: `${base.title}${suffix}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`,
        bullets,
        footer: base.footer,
    }));
}

export function titleOverflowSlides(
    baseTitle: string,
    overflowPages: string[],
    footer: string,
    suffix: string
): Extract<ReportSlide, { kind: 'bullets' }>[] {
    return overflowPages.map((titlePart, index) => ({
        kind: 'bullets' as const,
        layout: 'CONTENT' as const,
        title: titlePart,
        lead: `${baseTitle}${suffix}${overflowPages.length > 1 ? ` (${index + 1}/${overflowPages.length})` : ''}`,
        bullets: [],
        footer,
    }));
}

export function measureBulletBandHeight(bullets: string[], zone: PptxTextZone = 'chartBullets'): number {
    if (bullets.length === 0) return 0;
    const padding = PPTX_ZONE_GEOMETRY.bulletBandPadding;
    const height = bullets.reduce((sum, bullet) => sum + measureTextHeightForString(bullet, zone), 0);
    return padding + height;
}
