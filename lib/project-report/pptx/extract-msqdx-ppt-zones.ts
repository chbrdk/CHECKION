/**
 * Extract placeholder geometry and text budgets from MSQDX PPT master (OOXML).
 * Used by tests to keep zone calibration in sync with the template file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
    PPTX_MSQDX_MASTER_LAYOUT,
    PPTX_MSQDX_TEMPLATE_SLIDES,
} from '@/lib/paths/report-export-templates';

const EMU_PER_INCH = 914_400;

export type PptxPlaceholderRect = {
    x: number;
    y: number;
    w: number;
    h: number;
    bottom: number;
    fontPt: number | null;
};

export type PptxTextBudget = {
    maxLines: number;
    maxCharsPerLine: number;
    maxItems?: number;
};

export type PptxLayoutZoneCalibration = {
    title: PptxPlaceholderRect & { budget: PptxTextBudget };
    eyebrow: PptxPlaceholderRect & { budget: PptxTextBudget };
    body: PptxPlaceholderRect & { budget: PptxTextBudget };
    footer: { y: number };
    chart: {
        x: number;
        y: number;
        w: number;
        maxHeight: number;
        minHeightBar: number;
        minHeightLine: number;
        minHeightRadar: number;
        bulletBandHeight: number;
        gap: number;
    };
    column?: PptxPlaceholderRect & { budget: PptxTextBudget };
};

export type MsqdxPptZoneCalibrationFile = {
    source: string;
    extractedAt: string;
    slideSize: { width: number; height: number };
    layouts: Record<keyof typeof PPTX_MSQDX_MASTER_LAYOUT, PptxLayoutZoneCalibration>;
};

function toInches(emu: number): number {
    return +(emu / EMU_PER_INCH).toFixed(3);
}

function parsePlaceholderShapes(xml: string): Array<PptxPlaceholderRect & { phType: string | null; phIdx: string | null; name: string }> {
    const shapes: Array<PptxPlaceholderRect & { phType: string | null; phIdx: string | null; name: string }> = [];
    for (const raw of xml.split('<p:sp>').slice(1)) {
        const block = `<p:sp>${raw.split('</p:sp>')[0]}</p:sp>`;
        const name = block.match(/name="([^"]+)"/)?.[1] ?? '';
        const ph = block.match(/<p:ph([^/]*)\/>/)?.[1] ?? '';
        const phType = ph.match(/type="([^"]+)"/)?.[1] ?? null;
        const phIdx = ph.match(/idx="(\d+)"/)?.[1] ?? null;
        const xfrm = block.match(
            /<a:xfrm>[\s\S]*?<a:off x="(\d+)" y="(\d+)"\/>[\s\S]*?<a:ext cx="(\d+)" cy="(\d+)"\/>/
        );
        if (!xfrm) continue;
        const fontPt = [...block.matchAll(/sz="(\d+)"/g)].map((match) => +match[1]! / 100)[0] ?? null;
        const y = toInches(+xfrm[2]!);
        const h = toInches(+xfrm[4]!);
        shapes.push({
            name,
            phType,
            phIdx,
            x: toInches(+xfrm[1]!),
            y,
            w: toInches(+xfrm[3]!),
            h,
            bottom: +(y + h).toFixed(3),
            fontPt,
        });
    }
    return shapes;
}

function estimateCharsPerLine(widthIn: number, fontPt: number): number {
    const avgCharWidthIn = (fontPt * 0.52) / 72;
    return Math.max(1, Math.floor((widthIn / avgCharWidthIn) * 0.9));
}

function estimateMaxLines(heightIn: number, fontPt: number, lineSpacing = 1.2): number {
    return Math.max(1, Math.floor(heightIn / ((fontPt * lineSpacing) / 72)));
}

function fontForPlaceholder(layoutXml: string, masterXml: string, phIdx: string | null, phType: string | null, fallback: number): number {
    const blocks = [layoutXml, masterXml].flatMap((xml) => xml.split('<p:sp>').slice(1));
    for (const raw of blocks) {
        const block = `<p:sp>${raw.split('</p:sp>')[0]}</p:sp>`;
        const matchesIdx = phIdx != null && block.includes(`idx="${phIdx}"`);
        const matchesType = phType != null && block.includes(`type="${phType}"`);
        if (!matchesIdx && !matchesType) continue;
        const fontPt = [...block.matchAll(/sz="(\d+)"/g)].map((match) => +match[1]! / 100)[0];
        if (fontPt) return fontPt;
    }
    return fallback;
}

function rectBudget(rect: PptxPlaceholderRect, fontPt: number, maxItems?: number): PptxTextBudget {
    return {
        maxLines: estimateMaxLines(rect.h, fontPt),
        maxCharsPerLine: estimateCharsPerLine(rect.w, fontPt),
        maxItems,
    };
}

function layoutFileForSlide(extractDir: string, slideNum: number): string {
    const relPath = path.join(extractDir, 'ppt', 'slides', '_rels', `slide${slideNum}.xml.rels`);
    const rel = fs.readFileSync(relPath, 'utf8');
    const match = rel.match(/slideLayouts\/([^"]+\.xml)/);
    if (!match) throw new Error(`No slide layout for slide ${slideNum}`);
    return match[1]!;
}

function layoutByName(extractDir: string, layoutName: string): string {
    const layoutDir = path.join(extractDir, 'ppt', 'slideLayouts');
    for (const file of fs.readdirSync(layoutDir)) {
        if (!file.endsWith('.xml')) continue;
        const xml = fs.readFileSync(path.join(layoutDir, file), 'utf8');
        if (xml.includes(`name="${layoutName}"`)) return xml;
    }
    throw new Error(`Layout not found: ${layoutName}`);
}

function pickBodyRect(
    layoutShapes: Array<PptxPlaceholderRect & { phType: string | null; phIdx: string | null; name: string }>,
    fallback?: PptxPlaceholderRect
): PptxPlaceholderRect {
    const byIdx = layoutShapes.find((shape) => shape.phIdx === '1');
    if (byIdx) return byIdx;
    const bodyCandidates = layoutShapes.filter(
        (shape) => shape.phType === 'body' || shape.phIdx != null
    );
    if (bodyCandidates.length > 0) {
        return bodyCandidates.sort((a, b) => b.w * b.h - a.w * a.h)[0]!;
    }
    if (fallback) return fallback;
    throw new Error('No body placeholder found in layout');
}

function pickTitleRect(
    layoutShapes: Array<PptxPlaceholderRect & { phType: string | null; phIdx: string | null; name: string }>,
    masterShapes: Array<PptxPlaceholderRect & { phType: string | null; phIdx: string | null; name: string }>
): PptxPlaceholderRect {
    return (
        layoutShapes.find((shape) => shape.phType === 'title') ??
        masterShapes.find((shape) => shape.phType === 'title')!
    );
}

function pickEyebrowRect(
    layoutShapes: Array<PptxPlaceholderRect & { phType: string | null; phIdx: string | null; name: string }>
): PptxPlaceholderRect | null {
    return layoutShapes.find((shape) => shape.phIdx === '12') ?? null;
}

function buildLayoutCalibration(
    layoutXml: string,
    masterXml: string,
    footerY: number,
    options?: { columnRect?: PptxPlaceholderRect; bodyFallback?: PptxPlaceholderRect; chartFallback?: PptxLayoutZoneCalibration['chart'] }
): PptxLayoutZoneCalibration {
    const layoutShapes = parsePlaceholderShapes(layoutXml);
    const masterShapes = parsePlaceholderShapes(masterXml);

    const titleRect = pickTitleRect(layoutShapes, masterShapes);
    const eyebrowRect = pickEyebrowRect(layoutShapes);
    const bodyRect = pickBodyRect(layoutShapes, options?.bodyFallback);

    const titleFont = fontForPlaceholder(layoutXml, masterXml, null, 'title', 32);
    const eyebrowFont = eyebrowRect
        ? fontForPlaceholder(layoutXml, masterXml, '12', 'body', 14)
        : 14;
    const bodyFont = fontForPlaceholder(
        layoutXml,
        masterXml,
        (bodyRect as { phIdx?: string | null }).phIdx ?? null,
        (bodyRect as { phType?: string | null }).phType ?? null,
        14
    );

    const chartBulletFont = 13;
    const chartBulletLines = 2;
    const chartGap = 0.1;
    const bulletBandHeight = +(chartBulletLines * ((chartBulletFont * 1.2) / 72) + 0.14).toFixed(3);
    const maxChartHeight = +(footerY - chartGap - bodyRect.y - bulletBandHeight).toFixed(3);
    const chart =
        options?.chartFallback ??
        ({
            x: bodyRect.x,
            y: bodyRect.y,
            w: bodyRect.w,
            maxHeight: maxChartHeight,
            minHeightBar: 2.3,
            minHeightLine: 2.45,
            minHeightRadar: 2.55,
            bulletBandHeight,
            gap: chartGap,
        } satisfies PptxLayoutZoneCalibration['chart']);

    const columnRect = options?.columnRect;
    const columnFont = columnRect ? fontForPlaceholder(layoutXml, masterXml, '15', null, 14) : bodyFont;

    const fallbackEyebrow: PptxPlaceholderRect = {
        x: titleRect.x,
        y: titleRect.y,
        w: titleRect.w,
        h: 0.24,
        bottom: +(titleRect.y + 0.24).toFixed(3),
        fontPt: eyebrowFont,
    };

    return {
        title: { ...titleRect, budget: rectBudget(titleRect, titleFont) },
        eyebrow: {
            ...(eyebrowRect ?? fallbackEyebrow),
            budget: rectBudget(eyebrowRect ?? fallbackEyebrow, eyebrowFont),
        },
        body: { ...bodyRect, budget: { ...rectBudget(bodyRect, bodyFont), maxItems: 6 } },
        footer: { y: footerY },
        chart,
        ...(columnRect
            ? { column: { ...columnRect, budget: rectBudget(columnRect, columnFont) } }
            : {}),
    };
}

export function extractMsqdxPptZonesFromDir(extractDir: string): MsqdxPptZoneCalibrationFile {
    const presentationXml = fs.readFileSync(path.join(extractDir, 'ppt', 'presentation.xml'), 'utf8');
    const sizeMatch = presentationXml.match(/<p:sldSz cx="(\d+)" cy="(\d+)"/);
    if (!sizeMatch) throw new Error('Slide size missing in presentation.xml');

    const masterXml = fs.readFileSync(path.join(extractDir, 'ppt', 'slideMasters', 'slideMaster1.xml'), 'utf8');
    const masterShapes = parsePlaceholderShapes(masterXml);
    const footerY = masterShapes.find((shape) => shape.phType === 'ftr')!.y;

    const twoColumnXml = layoutByName(extractDir, PPTX_MSQDX_MASTER_LAYOUT.TWO_COLUMN);
    const twoColumnShapes = parsePlaceholderShapes(twoColumnXml);
    const columnRect = twoColumnShapes.find((shape) => shape.phIdx === '1');

    type LayoutKey = keyof typeof PPTX_MSQDX_MASTER_LAYOUT;
    const layoutKeys = Object.keys(PPTX_MSQDX_MASTER_LAYOUT) as LayoutKey[];
    const orderedKeys: LayoutKey[] = ['CONTENT', ...layoutKeys.filter((key) => key !== 'CONTENT')];

    const layouts = {} as MsqdxPptZoneCalibrationFile['layouts'];
    let contentCalibration: PptxLayoutZoneCalibration | null = null;

    for (const key of orderedKeys) {
        const slideNum = PPTX_MSQDX_TEMPLATE_SLIDES[key];
        const layoutFile = layoutFileForSlide(extractDir, slideNum);
        const layoutXml = fs.readFileSync(path.join(extractDir, 'ppt', 'slideLayouts', layoutFile), 'utf8');
        layouts[key] = buildLayoutCalibration(
            layoutXml,
            masterXml,
            footerY,
            {
                ...(key === 'TWO_COLUMN' && columnRect ? { columnRect } : {}),
                ...(contentCalibration
                    ? { bodyFallback: contentCalibration.body, chartFallback: contentCalibration.chart }
                    : {}),
            }
        );
        if (key === 'CONTENT') contentCalibration = layouts.CONTENT;
    }

    return {
        source: 'MSQDX_PPT-Master_27-05-26.pptx',
        extractedAt: new Date().toISOString().slice(0, 10),
        slideSize: {
            width: toInches(+sizeMatch[1]!),
            height: toInches(+sizeMatch[2]!),
        },
        layouts,
    };
}

export function extractMsqdxPptZonesFromPptx(pptxPath: string, workDir = path.join(process.cwd(), '.tmp', 'pptx-zone-extract')): MsqdxPptZoneCalibrationFile {
    fs.mkdirSync(workDir, { recursive: true });
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });

    execSync(`unzip -q "${pptxPath}" -d "${workDir}"`);
    return extractMsqdxPptZonesFromDir(workDir);
}
