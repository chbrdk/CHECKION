/**
 * Render ProjectReportPptxPlan using the real MSQDX .pptx master (pptx-automizer).
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Automizer, { modify } from 'pptx-automizer';
import type { ISlide } from 'pptx-automizer';
import { getReportPptxMasterAbsolutePath } from '@/lib/paths/report-export-templates';
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

function setText(slide: ISlide, shapeName: string, text: string): void {
    slide.modifyElement(shapeName, [modify.setText(text)]);
}

function setBullets(slide: ISlide, shapeName: string, bullets: string[]): void {
    if (bullets.length === 0) {
        setText(slide, shapeName, '');
        return;
    }
    slide.modifyElement(shapeName, [modify.setBulletList(bullets)]);
}

function applyContentBlock(slide: ISlide, shapeName: string, content: ReportSlideContent): void {
    if (content.kind === 'text') {
        setText(slide, shapeName, content.text);
        return;
    }
    setBullets(slide, shapeName, content.bullets);
}

function toAutomizerChartData(series: ReportSlideChartSeries[]) {
    return series.map((entry) => ({
        name: entry.name,
        labels: entry.labels,
        values: entry.values,
    }));
}

function chartArea(hasSubtitle: boolean, hasBullets: boolean) {
    const top = hasSubtitle ? 1.75 : 1.45;
    const bottom = hasBullets ? 1.1 : 0.45;
    return {
        x: 0.65,
        y: top,
        w: MSQDX_SLIDE_SIZE.width - 1.3,
        h: MSQDX_SLIDE_SIZE.height - top - bottom,
    };
}

function applyChartSlide(slide: ISlide, slidePlan: Extract<ReportSlide, { kind: 'chart' }>): void {
    const shapes = MSQDX_TEMPLATE_SHAPES.CONTENT;
    setText(slide, shapes.title, slidePlan.title);
    if (slidePlan.subtitle) {
        setText(slide, shapes.body, slidePlan.subtitle);
    } else {
        setText(slide, shapes.body, '');
    }
    setText(slide, shapes.footer, slidePlan.footer);

    const area = chartArea(Boolean(slidePlan.subtitle), Boolean(slidePlan.bullets?.length));
    const chartData = toAutomizerChartData(slidePlan.series);
    const colors = slidePlan.colors;

    slide.generate((pSlide, pptx) => {
        const opts: Record<string, unknown> = {
            ...area,
            showTitle: false,
            showLegend: slidePlan.showLegend ?? slidePlan.series.length > 1,
            showValue: slidePlan.showValue ?? false,
            valGridLine: { style: 'none' },
            catGridLine: { style: 'none' },
        };
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

        if (slidePlan.bullets?.length) {
            pSlide.addText(
                slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                {
                    x: area.x,
                    y: area.y + area.h + 0.08,
                    w: area.w,
                    h: 0.95,
                    fontSize: 13,
                    valign: 'top',
                }
            );
        }
    }, 'report-chart');
}

function applySlidePlan(slide: ISlide, slidePlan: ReportSlide): void {
    switch (slidePlan.kind) {
        case 'cover': {
            const shapes = MSQDX_TEMPLATE_SHAPES.TITLE;
            setText(slide, shapes.title, slidePlan.title);
            setText(
                slide,
                shapes.body,
                `${slidePlan.subtitle}\n${slidePlan.date} · ${slidePlan.variant}`
            );
            break;
        }
        case 'section': {
            const shapes = MSQDX_TEMPLATE_SHAPES.SECTION;
            const title = slidePlan.chapterNumber
                ? `${slidePlan.chapterNumber}  ${slidePlan.title}`
                : slidePlan.title;
            setText(slide, shapes.title, title);
            setText(slide, shapes.footer, slidePlan.footer);
            break;
        }
        case 'bullets': {
            const shapes = MSQDX_TEMPLATE_SHAPES.CONTENT;
            setText(slide, shapes.title, slidePlan.title);
            if (slidePlan.lead) {
                setText(slide, shapes.body, slidePlan.lead);
                slide.generate((pSlide) => {
                    pSlide.addText(
                        slidePlan.bullets.map((bullet) => ({
                            text: bullet,
                            options: { bullet: true, breakLine: true },
                        })),
                        {
                            x: 0.65,
                            y: 2.05,
                            w: MSQDX_SLIDE_SIZE.width - 1.3,
                            h: 4.2,
                            fontSize: 15,
                            valign: 'top',
                        }
                    );
                }, 'report-bullets');
            } else {
                setBullets(slide, shapes.body, slidePlan.bullets);
            }
            setText(slide, shapes.footer, slidePlan.footer);
            break;
        }
        case 'metrics': {
            const shapes = MSQDX_TEMPLATE_SHAPES.METRICS;
            setText(slide, shapes.title, slidePlan.title);
            const tileItems = slidePlan.items.slice(0, shapes.values.length);
            tileItems.forEach((item, index) => {
                setText(slide, shapes.values[index]!, item.value);
                setText(slide, shapes.labels[index]!, item.label);
            });
            for (let index = tileItems.length; index < shapes.values.length; index += 1) {
                setText(slide, shapes.values[index]!, '');
                setText(slide, shapes.labels[index]!, '');
            }
            if (slidePlan.bullets?.length) {
                setText(slide, shapes.eyebrow, slidePlan.bullets.join(' · '));
            } else {
                setText(slide, shapes.eyebrow, '');
            }
            setText(slide, shapes.footer, slidePlan.footer);
            break;
        }
        case 'table': {
            const shapes = MSQDX_TEMPLATE_SHAPES.CONTENT;
            setText(slide, shapes.title, slidePlan.title);
            setText(slide, shapes.footer, slidePlan.footer);
            const rows = [slidePlan.headers, ...slidePlan.rows];
            slide.generate((pSlide) => {
                pSlide.addTable(
                    rows.map((row) => row.map((cell) => ({ text: cell }))),
                    {
                        x: 0.65,
                        y: 1.45,
                        w: MSQDX_SLIDE_SIZE.width - 1.3,
                        h: 4.8,
                        fontSize: 12,
                        border: { type: 'solid', color: 'EAE8E8', pt: 1 },
                    }
                );
            }, 'report-table');
            setText(slide, shapes.body, '');
            break;
        }
        case 'two_column': {
            const shapes = MSQDX_TEMPLATE_SHAPES.TWO_COLUMN;
            setText(slide, shapes.title, slidePlan.title);
            applyContentBlock(slide, shapes.left, slidePlan.left);
            applyContentBlock(slide, shapes.right, slidePlan.right);
            setText(slide, shapes.footer, slidePlan.footer);
            break;
        }
        case 'chart':
            applyChartSlide(slide, slidePlan);
            break;
        case 'closing': {
            const shapes = MSQDX_TEMPLATE_SHAPES.CLOSING;
            setText(slide, shapes.title, slidePlan.title);
            setText(slide, shapes.footer, slidePlan.footer);
            slide.generate((pSlide) => {
                pSlide.addText(
                    slidePlan.bullets.map((bullet) => ({
                        text: bullet,
                        options: { bullet: true, breakLine: true },
                    })),
                    {
                        x: 0.9,
                        y: 2.4,
                        w: MSQDX_SLIDE_SIZE.width - 1.8,
                        h: 3.6,
                        fontSize: 20,
                        color: 'FFFFFF',
                        valign: 'top',
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
