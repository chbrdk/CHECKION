/**
 * Zone typography and wrapping — reads placeholder geometry from calibration.
 * Never truncates; splits overflow across slides.
 */
import {
    getMsqdxColumnZoneCalibration,
    getMsqdxContentZoneCalibration,
} from '@/lib/project-report/pptx/load-msqdx-ppt-zone-calibration';
import { PPTX_TYPOGRAPHY, type PptxTypographyRole } from '@/lib/project-report/pptx/pptx-typography';

const CONTENT_ZONES = getMsqdxContentZoneCalibration();
const COLUMN_ZONES = getMsqdxColumnZoneCalibration();

export type PptxTextZone = 'title' | 'eyebrow' | 'body' | 'chartBullets' | 'column';

const ZONE_ROLE: Record<PptxTextZone, PptxTypographyRole> = {
    title: 'title',
    eyebrow: 'eyebrow',
    body: 'body',
    chartBullets: 'chartBullet',
    column: 'body',
};

const ZONE_WIDTH: Record<PptxTextZone, number> = {
    title: CONTENT_ZONES.title.w,
    eyebrow: CONTENT_ZONES.eyebrow.w,
    body: CONTENT_ZONES.body.w,
    chartBullets: CONTENT_ZONES.body.w,
    column: COLUMN_ZONES?.w ?? 6.141,
};

const ZONE_HEIGHT: Record<PptxTextZone, number> = {
    title: CONTENT_ZONES.title.h,
    eyebrow: CONTENT_ZONES.eyebrow.h,
    body: CONTENT_ZONES.body.h,
    chartBullets:
        CONTENT_ZONES.footer.y -
        CONTENT_ZONES.chart.y -
        CONTENT_ZONES.chart.minHeightRadar -
        CONTENT_ZONES.chart.gap * 2,
    column: COLUMN_ZONES?.h ?? CONTENT_ZONES.body.h,
};

export type PptxZoneBudget = {
    maxLines: number;
    maxCharsPerLine: number;
};

function estimateCharsPerLine(widthIn: number, fontPt: number): number {
    const avgCharWidthIn = (fontPt * 0.52) / 72;
    return Math.max(1, Math.floor((widthIn / avgCharWidthIn) * 0.9));
}

function estimateMaxLines(heightIn: number, fontPt: number, lineSpacing: number): number {
    return Math.max(1, Math.floor(heightIn / ((fontPt * lineSpacing) / 72)));
}

export function getZoneTypography(zone: PptxTextZone): {
    fontPt: number;
    lineSpacing: number;
    charsPerLine: number;
    maxLines: number;
} {
    const role = ZONE_ROLE[zone];
    const typo = PPTX_TYPOGRAPHY[role];
    return {
        fontPt: typo.fontPt,
        lineSpacing: typo.lineSpacing,
        charsPerLine: estimateCharsPerLine(ZONE_WIDTH[zone], typo.fontPt),
        maxLines: estimateMaxLines(ZONE_HEIGHT[zone], typo.fontPt, typo.lineSpacing),
    };
}

export const PPTX_ZONE_BUDGETS: Record<PptxTextZone, PptxZoneBudget> = {
    title: ((z: PptxTextZone) => {
        const t = getZoneTypography(z);
        return { maxLines: t.maxLines, maxCharsPerLine: t.charsPerLine };
    })('title'),
    eyebrow: ((z: PptxTextZone) => {
        const t = getZoneTypography(z);
        return { maxLines: t.maxLines, maxCharsPerLine: t.charsPerLine };
    })('eyebrow'),
    body: ((z: PptxTextZone) => {
        const t = getZoneTypography(z);
        return { maxLines: t.maxLines, maxCharsPerLine: t.charsPerLine };
    })('body'),
    chartBullets: ((z: PptxTextZone) => {
        const t = getZoneTypography(z);
        return { maxLines: Math.max(3, t.maxLines), maxCharsPerLine: t.charsPerLine };
    })('chartBullets'),
    column: ((z: PptxTextZone) => {
        const t = getZoneTypography(z);
        return { maxLines: t.maxLines, maxCharsPerLine: t.charsPerLine };
    })('column'),
};

export function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

export function wrapTextToLines(text: string, charsPerLine: number): string[] {
    const normalized = normalizeWhitespace(text);
    if (!normalized) return [];

    const words = normalized.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= charsPerLine) {
            current = candidate;
            continue;
        }
        if (current) lines.push(current);
        if (word.length <= charsPerLine) {
            current = word;
            continue;
        }
        for (let index = 0; index < word.length; index += charsPerLine) {
            lines.push(word.slice(index, index + charsPerLine));
        }
        current = '';
    }

    if (current) lines.push(current);
    return lines;
}

export function linesToParagraph(lines: string[]): string {
    return lines.join(' ');
}

export function measureLineCount(text: string, zone: PptxTextZone): number {
    const { charsPerLine } = getZoneTypography(zone);
    return wrapTextToLines(text, charsPerLine).length;
}

export function measureTextHeight(lineCount: number, zone: PptxTextZone): number {
    const { fontPt, lineSpacing } = getZoneTypography(zone);
    return (lineCount * fontPt * lineSpacing) / 72;
}

export function measureTextHeightForString(text: string, zone: PptxTextZone): number {
    return measureTextHeight(measureLineCount(text, zone), zone);
}

export function partitionTextToZone(
    text: string,
    zone: PptxTextZone
): { onSlide: string; overflow: string } {
    const { charsPerLine, maxLines } = getZoneTypography(zone);
    const lines = wrapTextToLines(text, charsPerLine);
    if (lines.length <= maxLines) {
        return { onSlide: linesToParagraph(lines), overflow: '' };
    }
    return {
        onSlide: linesToParagraph(lines.slice(0, maxLines)),
        overflow: linesToParagraph(lines.slice(maxLines)),
    };
}

export function splitTextToPages(text: string, zone: PptxTextZone): string[] {
    const { charsPerLine, maxLines } = getZoneTypography(zone);
    const lines = wrapTextToLines(text, charsPerLine);
    if (lines.length === 0) return [];
    const pages: string[] = [];
    for (let index = 0; index < lines.length; index += maxLines) {
        pages.push(linesToParagraph(lines.slice(index, index + maxLines)));
    }
    return pages;
}

export function chunkBulletsForSlides(bullets: string[], zone: PptxTextZone): string[][] {
    const { maxLines, charsPerLine } = getZoneTypography(zone);
    const chunks: string[][] = [];
    let current: string[] = [];
    let usedLines = 0;

    const flush = () => {
        if (current.length > 0) {
            chunks.push(current);
            current = [];
            usedLines = 0;
        }
    };

    for (const bullet of bullets) {
        const lines = wrapTextToLines(bullet, charsPerLine);
        if (lines.length > maxLines) {
            flush();
            for (let index = 0; index < lines.length; index += maxLines) {
                chunks.push([linesToParagraph(lines.slice(index, index + maxLines))]);
            }
            continue;
        }

        const bulletLines = lines.length;
        if (usedLines + bulletLines > maxLines && current.length > 0) {
            flush();
        }

        current.push(bullet);
        usedLines += bulletLines;
        if (usedLines >= maxLines) {
            flush();
        }
    }

    flush();
    return chunks;
}

export function packBulletsByLineBudget(
    bullets: string[],
    zone: PptxTextZone,
    _maxLines?: number
): { packed: string[]; overflow: string[] } {
    const chunks = chunkBulletsForSlides(bullets, zone);
    return {
        packed: chunks[0] ?? [],
        overflow: chunks.slice(1).flat(),
    };
}

export function packBulletsByHeight(
    bullets: string[],
    zone: PptxTextZone,
    maxHeightIn: number,
    paddingIn = 0.14
): { packed: string[]; overflow: string[]; bandHeight: number } {
    const packed: string[] = [];
    const overflow: string[] = [];
    let bandHeight = paddingIn;

    for (const bullet of bullets) {
        const bulletHeight = measureTextHeightForString(bullet, zone);
        if (packed.length > 0 && bandHeight + bulletHeight > maxHeightIn) {
            overflow.push(bullet);
            continue;
        }
        packed.push(bullet);
        bandHeight += bulletHeight;
    }

    return { packed, overflow, bandHeight };
}
