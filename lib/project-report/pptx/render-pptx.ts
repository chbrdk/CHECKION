/**
 * Render ProjectReportPptxPlan to PPTX buffer (server-side).
 */
import PptxGenJS from 'pptxgenjs';
import { PPTX_LAYOUT } from '@/lib/paths/report-export-templates';
import type {
    ProjectReportPptxPlan,
    ReportSlide,
    ReportSlideChartSeries,
    ReportSlideContent,
} from '@/lib/project-report/pptx/types';
import { loadPptxRenderAssets } from '@/lib/project-report/pptx/load-brand-tokens';
import { registerPptxMasters } from '@/lib/project-report/pptx/pptx-masters';
import {
    PPTX_SLIDE,
    pptxColumnWidth,
    pptxContentHeight,
    pptxContentTop,
} from '@/lib/project-report/pptx/pptx-slide-layout';

function toTableRows(headers: string[], rows: string[][]): PptxGenJS.TableRow[] {
    return [
        headers.map((text) => ({ text })),
        ...rows.map((row) => row.map((text) => ({ text }))),
    ];
}

function layoutName(layout: ReportSlide['layout']): string {
    return PPTX_LAYOUT[layout];
}

type Tokens = ReturnType<typeof loadPptxRenderAssets>['tokens'];

function baseText(tokens: Tokens): Pick<PptxGenJS.TextPropsOptions, 'shrinkText' | 'wrap' | 'fontFace'> {
    return {
        shrinkText: false,
        wrap: true,
        fontFace: tokens.fontBody,
    };
}

function monoText(tokens: Tokens): Pick<PptxGenJS.TextPropsOptions, 'shrinkText' | 'wrap' | 'fontFace'> {
    return {
        shrinkText: false,
        wrap: true,
        fontFace: tokens.fontMono,
    };
}

function metricColor(tone: string | undefined, tokens: Tokens): string {
    if (tone === 'good') return tokens.secondary;
    if (tone === 'warn') return tokens.accent;
    if (tone === 'bad') return tokens.primary;
    return tokens.text;
}

function pptxHexColor(color: string): string {
    return color.replace(/^#/, '').toUpperCase();
}

function defaultChartColors(tokens: Tokens): string[] {
    return [tokens.primary, tokens.secondary, tokens.accent, tokens.muted].map(pptxHexColor);
}

function toChartData(series: ReportSlideChartSeries[]): PptxGenJS.OptsChartData[] {
    return series.map((entry) => ({
        name: entry.name,
        labels: entry.labels,
        values: entry.values,
    }));
}

function renderChartSlide(
    pptx: PptxGenJS,
    slide: PptxGenJS.Slide,
    slidePlan: Extract<ReportSlide, { kind: 'chart' }>,
    tokens: Tokens
): void {
    const textBase = baseText(tokens);
    addTitle(slide, slidePlan.title, tokens);

    let chartTop = PPTX_SLIDE.contentTop;
    if (slidePlan.subtitle) {
        slide.addText(slidePlan.subtitle, {
            x: PPTX_SLIDE.marginX,
            y: PPTX_SLIDE.leadY,
            w: PPTX_SLIDE.contentWidth,
            h: PPTX_SLIDE.leadHeight,
            fontSize: 13,
            color: tokens.muted,
            valign: 'top',
            ...textBase,
        });
        chartTop = PPTX_SLIDE.leadY + PPTX_SLIDE.leadHeight + 0.12;
    }

    const bulletBand = slidePlan.bullets?.length ? 1.05 : 0;
    const chartHeight = Math.max(2.4, PPTX_SLIDE.contentBottom - chartTop - bulletBand - 0.12);
    const chartColors =
        slidePlan.colors && slidePlan.colors.length > 0
            ? slidePlan.colors
            : defaultChartColors(tokens);

    const chartOpts: PptxGenJS.IChartOpts = {
        x: PPTX_SLIDE.marginX,
        y: chartTop,
        w: PPTX_SLIDE.contentWidth,
        h: chartHeight,
        chartColors,
        showTitle: false,
        showLegend: slidePlan.showLegend ?? slidePlan.series.length > 1,
        showValue: slidePlan.showValue ?? false,
        dataLabelFontFace: tokens.fontMono,
        dataLabelFontSize: 9,
        valGridLine: { style: 'none' },
        catGridLine: { style: 'none' },
        legendFontFace: tokens.fontBody,
        legendFontSize: 10,
    };

    if (slidePlan.valAxisTitle) chartOpts.valAxisTitle = slidePlan.valAxisTitle;
    if (slidePlan.catAxisTitle) chartOpts.catAxisTitle = slidePlan.catAxisTitle;

    const chartData = toChartData(slidePlan.series);

    switch (slidePlan.chartType) {
        case 'bar':
            chartOpts.barDir = 'col';
            if (slidePlan.series.length > 1) chartOpts.barGrouping = 'clustered';
            slide.addChart(pptx.ChartType.bar, chartData, chartOpts);
            break;
        case 'barHorizontal':
            chartOpts.barDir = 'bar';
            slide.addChart(pptx.ChartType.bar, chartData, chartOpts);
            break;
        case 'line':
            chartOpts.lineSize = 2.25;
            chartOpts.lineDataSymbolSize = 5;
            slide.addChart(pptx.ChartType.line, chartData, chartOpts);
            break;
        case 'radar':
            slide.addChart(pptx.ChartType.radar, chartData, chartOpts);
            break;
        default:
            break;
    }

    if (slidePlan.bullets?.length) {
        slide.addText(
            slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
            {
                x: PPTX_SLIDE.marginX,
                y: chartTop + chartHeight + 0.12,
                w: PPTX_SLIDE.contentWidth,
                h: bulletBand,
                fontSize: 13,
                color: tokens.text,
                valign: 'top',
                paraSpaceAfter: 6,
                lineSpacingMultiple: 1.1,
                ...textBase,
            }
        );
    }

    addFooter(slide, slidePlan.footer, tokens);
}

function renderContentBlock(
    slide: PptxGenJS.Slide,
    content: ReportSlideContent,
    x: number,
    y: number,
    w: number,
    h: number,
    tokens: Tokens
): void {
    const textBase = baseText(tokens);
    if (content.kind === 'text') {
        slide.addText(content.text, {
            x,
            y,
            w,
            h,
            fontSize: 15,
            color: tokens.text,
            valign: 'top',
            ...textBase,
        });
        return;
    }
    slide.addText(
        content.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
        {
            x,
            y,
            w,
            h,
            fontSize: 14,
            color: tokens.text,
            valign: 'top',
            paraSpaceAfter: 8,
            lineSpacingMultiple: 1.15,
            ...textBase,
        }
    );
}

function addFooter(slide: PptxGenJS.Slide, footer: string, tokens: Tokens): void {
    slide.addText(footer, {
        x: PPTX_SLIDE.marginX + 1.4,
        y: PPTX_SLIDE.footerTextY,
        w: PPTX_SLIDE.contentWidth - 1.4,
        h: PPTX_SLIDE.footerTextHeight,
        fontSize: 8,
        color: tokens.muted,
        align: 'right',
        valign: 'middle',
        ...monoText(tokens),
    });
}

function addTitle(slide: PptxGenJS.Slide, title: string, tokens: Tokens, color = tokens.text): void {
    slide.addText(title, {
        x: PPTX_SLIDE.marginX,
        y: PPTX_SLIDE.titleY,
        w: PPTX_SLIDE.contentWidth,
        h: PPTX_SLIDE.titleHeight,
        fontSize: 26,
        bold: true,
        color,
        fontFace: tokens.fontHeading,
        valign: 'bottom',
        shrinkText: false,
        wrap: true,
    });
}

function renderSlide(pptx: PptxGenJS, slidePlan: ReportSlide, tokens: Tokens): void {
    const slide = pptx.addSlide({ masterName: layoutName(slidePlan.layout) });
    const textBase = baseText(tokens);

    switch (slidePlan.kind) {
        case 'cover': {
            const blockTop = 2.15;
            slide.addText(slidePlan.subtitle, {
                x: PPTX_SLIDE.marginX,
                y: blockTop,
                w: PPTX_SLIDE.contentWidth,
                h: 0.45,
                fontSize: 16,
                color: tokens.primary,
                ...monoText(tokens),
            });
            slide.addText(slidePlan.title, {
                x: PPTX_SLIDE.marginX,
                y: blockTop + 0.55,
                w: PPTX_SLIDE.contentWidth,
                h: 1.6,
                fontSize: 40,
                bold: true,
                color: tokens.textOnDark,
                fontFace: tokens.fontHeading,
                valign: 'top',
                shrinkText: false,
                wrap: true,
            });
            slide.addText(`${slidePlan.date} · ${slidePlan.variant}`, {
                x: PPTX_SLIDE.marginX,
                y: blockTop + 2.35,
                w: PPTX_SLIDE.contentWidth,
                h: 0.5,
                fontSize: 13,
                color: tokens.surface,
                ...monoText(tokens),
            });
            break;
        }

        case 'section':
            slide.addText(
                slidePlan.chapterNumber
                    ? `${slidePlan.chapterNumber}  ${slidePlan.title}`
                    : slidePlan.title,
                {
                    x: PPTX_SLIDE.marginX,
                    y: 2.45,
                    w: PPTX_SLIDE.contentWidth,
                    h: 2.0,
                    fontSize: 38,
                    bold: true,
                    color: tokens.textOnDark,
                    fontFace: tokens.fontHeading,
                    valign: 'middle',
                    shrinkText: false,
                    wrap: true,
                }
            );
            addFooter(slide, slidePlan.footer, tokens);
            break;

        case 'bullets': {
            addTitle(slide, slidePlan.title, tokens);
            if (slidePlan.lead) {
                slide.addText(slidePlan.lead, {
                    x: PPTX_SLIDE.marginX,
                    y: PPTX_SLIDE.leadY,
                    w: PPTX_SLIDE.contentWidth,
                    h: PPTX_SLIDE.leadHeight,
                    fontSize: 14,
                    color: tokens.muted,
                    valign: 'top',
                    ...textBase,
                });
            }
            slide.addText(
                slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                {
                    x: PPTX_SLIDE.marginX,
                    y: pptxContentTop(Boolean(slidePlan.lead)),
                    w: PPTX_SLIDE.contentWidth,
                    h: pptxContentHeight(Boolean(slidePlan.lead)),
                    fontSize: 15,
                    color: tokens.text,
                    valign: 'top',
                    paraSpaceAfter: 10,
                    lineSpacingMultiple: 1.2,
                    ...textBase,
                }
            );
            addFooter(slide, slidePlan.footer, tokens);
            break;
        }

        case 'metrics': {
            addTitle(slide, slidePlan.title, tokens);
            const tileCount = Math.max(slidePlan.items.length, 1);
            const tileGap = 0.18;
            const tileW = (PPTX_SLIDE.contentWidth - tileGap * (tileCount - 1)) / tileCount;
            const tileY = PPTX_SLIDE.contentTop;
            const tileH = slidePlan.bullets?.length ? 2.05 : 2.55;

            slidePlan.items.forEach((item, index) => {
                const x = PPTX_SLIDE.marginX + index * (tileW + tileGap);
                slide.addShape(pptx.ShapeType.rect, {
                    x,
                    y: tileY,
                    w: tileW,
                    h: tileH,
                    fill: { color: tokens.textOnDark },
                    line: { color: tokens.surface, width: 1 },
                });
                slide.addText(item.value, {
                    x,
                    y: tileY + 0.28,
                    w: tileW,
                    h: tileH * 0.45,
                    fontSize: 32,
                    bold: true,
                    align: 'center',
                    valign: 'middle',
                    color: metricColor(item.tone, tokens),
                    fontFace: tokens.fontMono,
                    shrinkText: false,
                });
                slide.addText(item.label, {
                    x,
                    y: tileY + tileH * 0.62,
                    w: tileW,
                    h: tileH * 0.3,
                    fontSize: 12,
                    align: 'center',
                    valign: 'top',
                    color: tokens.muted,
                    ...monoText(tokens),
                });
            });

            if (slidePlan.bullets?.length) {
                slide.addText(
                    slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                    {
                        x: PPTX_SLIDE.marginX,
                        y: tileY + tileH + 0.25,
                        w: PPTX_SLIDE.contentWidth,
                        h: PPTX_SLIDE.contentBottom - (tileY + tileH + 0.25),
                        fontSize: 14,
                        color: tokens.text,
                        valign: 'top',
                        paraSpaceAfter: 8,
                        lineSpacingMultiple: 1.15,
                        ...textBase,
                    }
                );
            }
            addFooter(slide, slidePlan.footer, tokens);
            break;
        }

        case 'table':
            addTitle(slide, slidePlan.title, tokens);
            slide.addTable(toTableRows(slidePlan.headers, slidePlan.rows), {
                x: PPTX_SLIDE.marginX,
                y: PPTX_SLIDE.contentTop,
                w: PPTX_SLIDE.contentWidth,
                h: pptxContentHeight(),
                fontSize: 12,
                color: tokens.text,
                fontFace: tokens.fontBody,
                border: { type: 'solid', color: tokens.surface, pt: 1 },
                valign: 'middle',
            });
            addFooter(slide, slidePlan.footer, tokens);
            break;

        case 'two_column': {
            addTitle(slide, slidePlan.title, tokens);
            const colW = pptxColumnWidth(2);
            const colGap = 0.35;
            const contentY = PPTX_SLIDE.contentTop;
            const contentH = pptxContentHeight();
            renderContentBlock(slide, slidePlan.left, PPTX_SLIDE.marginX, contentY, colW, contentH, tokens);
            renderContentBlock(
                slide,
                slidePlan.right,
                PPTX_SLIDE.marginX + colW + colGap,
                contentY,
                colW,
                contentH,
                tokens
            );
            addFooter(slide, slidePlan.footer, tokens);
            break;
        }

        case 'chart':
            renderChartSlide(pptx, slide, slidePlan, tokens);
            break;

        case 'closing':
            slide.addText(slidePlan.title, {
                x: PPTX_SLIDE.marginX,
                y: 2.0,
                w: PPTX_SLIDE.contentWidth,
                h: 1.0,
                fontSize: 32,
                bold: true,
                color: tokens.primary,
                fontFace: tokens.fontHeading,
                valign: 'bottom',
                shrinkText: false,
                wrap: true,
            });
            slide.addText(
                slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                {
                    x: PPTX_SLIDE.marginX,
                    y: 3.15,
                    w: PPTX_SLIDE.contentWidth,
                    h: 3.2,
                    fontSize: 18,
                    color: tokens.textOnDark,
                    valign: 'top',
                    paraSpaceAfter: 12,
                    lineSpacingMultiple: 1.25,
                    ...textBase,
                }
            );
            addFooter(slide, slidePlan.footer, tokens);
            break;

        default:
            break;
    }
}

export async function renderProjectReportPptx(
    plan: ProjectReportPptxPlan,
    cwd = process.cwd()
): Promise<Buffer> {
    const assets = loadPptxRenderAssets(cwd);
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'CHECKION';
    pptx.company = 'MSQDX';
    pptx.subject = plan.projectName;
    pptx.title = plan.projectName;

    registerPptxMasters(pptx, assets);

    for (const slidePlan of plan.slides) {
        renderSlide(pptx, slidePlan, assets.tokens);
    }

    const output = await pptx.write({ outputType: 'nodebuffer' });
    if (Buffer.isBuffer(output)) return output;
    if (output instanceof Uint8Array) return Buffer.from(output);
    return Buffer.from(new Uint8Array(output as ArrayBuffer));
}

export async function renderProjectReportPptxFromBundle(
    bundle: import('@/lib/project-report/types').ProjectReportBundle,
    cwd = process.cwd()
): Promise<Buffer> {
    const { buildProjectReportPptxPlan } = await import('@/lib/project-report/pptx/build-pptx-plan');
    const plan = buildProjectReportPptxPlan(bundle);
    return renderProjectReportPptx(plan, cwd);
}
