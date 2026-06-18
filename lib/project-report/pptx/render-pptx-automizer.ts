/**
 * Render ProjectReportPptxPlan using the real MSQDX .pptx master (pptx-automizer).
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Automizer from 'pptx-automizer';
import type { ISlide } from 'pptx-automizer';
import { getReportPptxMasterAbsolutePath } from '@/lib/paths/report-export-templates';
import {
    chartOptionsOnBlack,
    layoutHasBlackBackground,
    MSQDX_TEXT_ON_BLACK,
    setShapeBullets,
    setShapeText,
} from '@/lib/project-report/pptx/pptx-automizer-text-style';
import { computeChartLayout } from '@/lib/project-report/pptx/pptx-content-budget';
import { PPTX_TYPOGRAPHY } from '@/lib/project-report/pptx/pptx-typography';
import {
    MSQDX_SLIDE_SIZE,
    MSQDX_TEMPLATE_ALIAS,
    MSQDX_TEMPLATE_SHAPES,
    templateSlideForLayout,
} from '@/lib/project-report/pptx/pptx-master-template';
import type {
    ProjectReportPptxPlan,
    ReportSlide,
    ReportSlideChartSeries,
    ReportSlideContent,
} from '@/lib/project-report/pptx/types';

type TextOptions = { onBlack: boolean; footer?: boolean; role?: keyof typeof PPTX_TYPOGRAPHY };

function textOpts(onBlack: boolean, footer = false, role?: keyof typeof PPTX_TYPOGRAPHY): TextOptions {
    return { onBlack, footer, role };
}

function setText(
    slide: ISlide,
    shapeName: string,
    text: string,
    onBlack: boolean,
    footer = false,
    role?: keyof typeof PPTX_TYPOGRAPHY
): void {
    setShapeText(slide, shapeName, text, textOpts(onBlack, footer, role));
}

function clearText(slide: ISlide, shapeName: string, onBlack: boolean): void {
    setText(slide, shapeName, '', onBlack);
}

function clearTexts(slide: ISlide, shapeNames: string[], onBlack: boolean): void {
    for (const shapeName of shapeNames) {
        clearText(slide, shapeName, onBlack);
    }
}

function setBullets(slide: ISlide, shapeName: string, bullets: string[], onBlack: boolean): void {
    setShapeBullets(slide, shapeName, bullets, { onBlack });
}

function applyContentBlock(
    slide: ISlide,
    shapeName: string,
    content: ReportSlideContent,
    onBlack: boolean
): void {
    if (content.kind === 'text') {
        setText(slide, shapeName, content.text, onBlack);
        return;
    }
    setBullets(slide, shapeName, content.bullets, onBlack);
}

function toAutomizerChartData(series: ReportSlideChartSeries[]) {
    return series.map((entry) => ({
        name: entry.name,
        labels: entry.labels,
        values: entry.values,
    }));
}

function applyChartSlide(
    slide: ISlide,
    slidePlan: Extract<ReportSlide, { kind: 'chart' }>,
    onBlack: boolean
): void {
    const shapes = MSQDX_TEMPLATE_SHAPES.CONTENT;
    const layout = computeChartLayout({
        subtitle: slidePlan.subtitle,
        bullets: slidePlan.bullets,
        chartType: slidePlan.chartType,
    });

    setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
    clearText(slide, shapes.body, onBlack);
    if (layout.fittedSubtitle) {
        setText(slide, shapes.eyebrow, layout.fittedSubtitle, onBlack, false, 'eyebrow');
    } else {
        clearText(slide, shapes.eyebrow, onBlack);
    }
    setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');

    const chartData = toAutomizerChartData(slidePlan.series);
    const colors = slidePlan.colors;

    slide.generate((pSlide, pptx) => {
        let opts: Record<string, unknown> = {
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h,
            showTitle: false,
            showLegend: slidePlan.showLegend ?? slidePlan.series.length > 1,
            showValue: slidePlan.showValue ?? false,
            valGridLine: { style: 'none' },
            catGridLine: { style: 'none' },
        };
        if (onBlack) opts = chartOptionsOnBlack(opts);
        if (colors?.length) opts.chartColors = colors;
        if (slidePlan.valAxisTitle) opts.valAxisTitle = slidePlan.valAxisTitle;
        if (slidePlan.catAxisTitle) opts.catAxisTitle = slidePlan.catAxisTitle;

        switch (slidePlan.chartType) {
            case 'bar':
                opts.barDir = 'col';
                if (slidePlan.series.length > 1) opts.barGrouping = 'clustered';
                pSlide.addChart(pptx.ChartType.bar, chartData, opts);
                break;
            case 'barHorizontal':
                opts.barDir = 'bar';
                pSlide.addChart(pptx.ChartType.bar, chartData, opts);
                break;
            case 'line':
                opts.lineSize = 2.25;
                pSlide.addChart(pptx.ChartType.line, chartData, opts);
                break;
            case 'radar':
                pSlide.addChart(pptx.ChartType.radar, chartData, opts);
                break;
            default:
                break;
        }

        if (layout.onSlideBullets.length > 0) {
            const typo = PPTX_TYPOGRAPHY.chartBullet;
            pSlide.addText(
                layout.onSlideBullets.map((bullet) => ({
                    text: bullet,
                    options: { bullet: true, breakLine: true, fontFace: typo.fontFace },
                })),
                {
                    x: layout.x,
                    y: layout.bulletTop,
                    w: layout.w,
                    h: layout.bulletHeight,
                    fontSize: typo.fontPt,
                    fontFace: typo.fontFace,
                    color: onBlack ? MSQDX_TEXT_ON_BLACK : undefined,
                    valign: 'top',
                    wrap: true,
                }
            );
        }
    }, 'report-chart');
}

function applySlidePlan(slide: ISlide, slidePlan: ReportSlide): void {
    const onBlack = layoutHasBlackBackground(slidePlan.layout);

    switch (slidePlan.kind) {
        case 'cover': {
            const shapes = MSQDX_TEMPLATE_SHAPES.TITLE;
            setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
            setText(
                slide,
                shapes.body,
                `${slidePlan.subtitle}\n${slidePlan.date} · ${slidePlan.variant}`,
                onBlack,
                false,
                'eyebrow'
            );
            break;
        }
        case 'section': {
            const shapes = MSQDX_TEMPLATE_SHAPES.SECTION;
            const title = slidePlan.chapterNumber
                ? `${slidePlan.chapterNumber}  ${slidePlan.title}`
                : slidePlan.title;
            setText(slide, shapes.title, title, onBlack, false, 'title');
            clearText(slide, shapes.body, onBlack);
            setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');
            break;
        }
        case 'bullets': {
            const shapes = MSQDX_TEMPLATE_SHAPES.CONTENT;
            setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
            if (slidePlan.lead) {
                setText(slide, shapes.eyebrow, slidePlan.lead, onBlack, false, 'eyebrow');
                setBullets(slide, shapes.body, slidePlan.bullets, onBlack);
            } else {
                clearText(slide, shapes.eyebrow, onBlack);
                setBullets(slide, shapes.body, slidePlan.bullets, onBlack);
            }
            setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');
            break;
        }
        case 'metrics': {
            const shapes = MSQDX_TEMPLATE_SHAPES.METRICS;
            setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
            const tileItems = slidePlan.items.slice(0, shapes.values.length);
            tileItems.forEach((item, index) => {
                setText(slide, shapes.values[index]!, item.value, onBlack, false, 'metricsValue');
                setText(slide, shapes.labels[index]!, item.label, onBlack, false, 'metricsLabel');
            });
            for (let index = tileItems.length; index < shapes.values.length; index += 1) {
                clearText(slide, shapes.values[index]!, onBlack);
                clearText(slide, shapes.labels[index]!, onBlack);
            }
            if (slidePlan.bullets?.length) {
                setText(slide, shapes.eyebrow, slidePlan.bullets.join(' · '), onBlack, false, 'eyebrow');
            } else {
                clearText(slide, shapes.eyebrow, onBlack);
            }
            setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');
            break;
        }
        case 'table': {
            const shapes = MSQDX_TEMPLATE_SHAPES.CONTENT;
            setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
            clearTexts(slide, [shapes.body, shapes.eyebrow], onBlack);
            setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');
            const rows = [slidePlan.headers, ...slidePlan.rows];
            const tableTypo = PPTX_TYPOGRAPHY.table;
            slide.generate((pSlide) => {
                pSlide.addTable(
                    rows.map((row) => row.map((cell) => ({ text: cell }))),
                    {
                        x: 0.65,
                        y: 1.45,
                        w: MSQDX_SLIDE_SIZE.width - 1.3,
                        h: 4.8,
                        fontSize: tableTypo.fontPt,
                        fontFace: tableTypo.fontFace,
                        color: onBlack ? MSQDX_TEXT_ON_BLACK : undefined,
                        border: { type: 'solid', color: 'EAE8E8', pt: 1 },
                    }
                );
            }, 'report-table');
            break;
        }
        case 'two_column': {
            const shapes = MSQDX_TEMPLATE_SHAPES.TWO_COLUMN;
            setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
            clearText(slide, shapes.eyebrow, onBlack);
            applyContentBlock(slide, shapes.left, slidePlan.left, onBlack);
            applyContentBlock(slide, shapes.right, slidePlan.right, onBlack);
            setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');
            break;
        }
        case 'chart':
            applyChartSlide(slide, slidePlan, onBlack);
            break;
        case 'closing': {
            const shapes = MSQDX_TEMPLATE_SHAPES.CLOSING;
            setText(slide, shapes.title, slidePlan.title, onBlack, false, 'title');
            setText(slide, shapes.footer, slidePlan.footer, onBlack, true, 'footer');
            const closingTypo = PPTX_TYPOGRAPHY.closing;
            slide.generate((pSlide) => {
                pSlide.addText(
                    slidePlan.bullets.map((bullet) => ({
                        text: bullet,
                        options: { bullet: true, breakLine: true, fontFace: closingTypo.fontFace },
                    })),
                    {
                        x: 0.9,
                        y: 2.4,
                        w: MSQDX_SLIDE_SIZE.width - 1.8,
                        h: 3.6,
                        fontSize: closingTypo.fontPt,
                        fontFace: closingTypo.fontFace,
                        color: MSQDX_TEXT_ON_BLACK,
                        valign: 'top',
                        wrap: true,
                    }
                );
            }, 'report-closing-bullets');
            break;
        }
        default:
            break;
    }
}

export async function renderProjectReportPptxWithMaster(
    plan: ProjectReportPptxPlan,
    masterAbsolutePath: string
): Promise<Buffer> {
    const templateDir = path.dirname(masterAbsolutePath);
    const masterFileName = path.basename(masterAbsolutePath);
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checkion-pptx-'));
    const outputName = 'report.pptx';

    try {
        const automizer = new Automizer({
            templateDir,
            outputDir,
            removeExistingSlides: true,
            cleanupPlaceholders: true,
            verbosity: 0,
        });

        const pres = automizer.loadRoot(masterFileName).load(masterFileName, MSQDX_TEMPLATE_ALIAS);

        for (const slidePlan of plan.slides) {
            const templateSlide = templateSlideForLayout(slidePlan.layout);
            pres.addSlide(MSQDX_TEMPLATE_ALIAS, templateSlide, (slide) => {
                applySlidePlan(slide, slidePlan);
            });
        }

        await pres.write(outputName);
        return await fs.readFile(path.join(outputDir, outputName));
    } finally {
        await fs.rm(outputDir, { recursive: true, force: true });
    }
}

export async function renderProjectReportPptxWithMasterFromCwd(
    plan: ProjectReportPptxPlan,
    cwd = process.cwd()
): Promise<Buffer> {
    const masterPath = getReportPptxMasterAbsolutePath(cwd);
    return renderProjectReportPptxWithMaster(plan, masterPath);
}
