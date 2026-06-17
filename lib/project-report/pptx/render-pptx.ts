/**
 * Render ProjectReportPptxPlan to PPTX buffer (server-side).
 */
import PptxGenJS from 'pptxgenjs';
import { PPTX_LAYOUT } from '@/lib/paths/report-export-templates';
import type { ProjectReportPptxPlan, ReportSlide, ReportSlideContent } from '@/lib/project-report/pptx/types';
import { loadPptxRenderAssets } from '@/lib/project-report/pptx/load-brand-tokens';
import { registerPptxMasters } from '@/lib/project-report/pptx/pptx-masters';

function toTableRows(headers: string[], rows: string[][]): PptxGenJS.TableRow[] {
    return [
        headers.map((text) => ({ text })),
        ...rows.map((row) => row.map((text) => ({ text }))),
    ];
}

function layoutName(layout: ReportSlide['layout']): string {
    return PPTX_LAYOUT[layout];
}

function metricColor(tone: string | undefined, tokens: ReturnType<typeof loadPptxRenderAssets>['tokens']): string {
    if (tone === 'good') return tokens.secondary;
    if (tone === 'warn') return tokens.accent;
    if (tone === 'bad') return tokens.primary;
    return tokens.text;
}

function renderContentBlock(
    slide: PptxGenJS.Slide,
    content: ReportSlideContent,
    x: number,
    y: number,
    w: number,
    h: number,
    tokens: ReturnType<typeof loadPptxRenderAssets>['tokens']
): void {
    if (content.kind === 'text') {
        slide.addText(content.text, {
            x,
            y,
            w,
            h,
            fontSize: 14,
            color: tokens.text,
            fontFace: tokens.fontBody,
            valign: 'top',
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
            fontSize: 13,
            color: tokens.text,
            fontFace: tokens.fontBody,
            valign: 'top',
        }
    );
}

function addFooter(slide: PptxGenJS.Slide, footer: string, tokens: ReturnType<typeof loadPptxRenderAssets>['tokens']): void {
    slide.addText(footer, {
        x: 2.0,
        y: 5.18,
        w: 10.5,
        h: 0.3,
        fontSize: 8,
        color: tokens.muted,
        fontFace: tokens.fontBody,
        align: 'right',
    });
}

function renderSlide(
    pptx: PptxGenJS,
    slidePlan: ReportSlide,
    tokens: ReturnType<typeof loadPptxRenderAssets>['tokens']
): void {
    const slide = pptx.addSlide({ masterName: layoutName(slidePlan.layout) });

    switch (slidePlan.kind) {
        case 'cover':
            slide.addText(slidePlan.subtitle, {
                x: 0.6,
                y: 1.6,
                w: 8,
                h: 0.4,
                fontSize: 14,
                color: tokens.primary,
                fontFace: tokens.fontBody,
            });
            slide.addText(slidePlan.title, {
                x: 0.6,
                y: 2.0,
                w: 11,
                h: 1.2,
                fontSize: 36,
                bold: true,
                color: tokens.textOnDark,
                fontFace: tokens.fontHeading,
            });
            slide.addText(`${slidePlan.date} · ${slidePlan.variant}`, {
                x: 0.6,
                y: 3.4,
                w: 10,
                h: 0.5,
                fontSize: 12,
                color: tokens.surface,
                fontFace: tokens.fontBody,
            });
            break;

        case 'section':
            slide.addText(
                slidePlan.chapterNumber
                    ? `${slidePlan.chapterNumber}  ${slidePlan.title}`
                    : slidePlan.title,
                {
                    x: 0.6,
                    y: 2.2,
                    w: 11.5,
                    h: 1.0,
                    fontSize: 34,
                    bold: true,
                    color: tokens.textOnDark,
                    fontFace: tokens.fontHeading,
                }
            );
            addFooter(slide, slidePlan.footer, tokens);
            break;

        case 'bullets':
            slide.addText(slidePlan.title, {
                x: 0.6,
                y: 0.55,
                w: 11.5,
                h: 0.7,
                fontSize: 24,
                bold: true,
                color: tokens.text,
                fontFace: tokens.fontHeading,
            });
            if (slidePlan.lead) {
                slide.addText(slidePlan.lead, {
                    x: 0.6,
                    y: 1.2,
                    w: 11.5,
                    h: 0.5,
                    fontSize: 13,
                    color: tokens.muted,
                    fontFace: tokens.fontBody,
                });
            }
            slide.addText(
                slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                {
                    x: 0.6,
                    y: slidePlan.lead ? 1.75 : 1.35,
                    w: 11.5,
                    h: 3.2,
                    fontSize: 14,
                    color: tokens.text,
                    fontFace: tokens.fontBody,
                    valign: 'top',
                }
            );
            addFooter(slide, slidePlan.footer, tokens);
            break;

        case 'metrics': {
            slide.addText(slidePlan.title, {
                x: 0.6,
                y: 0.55,
                w: 11.5,
                h: 0.7,
                fontSize: 24,
                bold: true,
                color: tokens.text,
                fontFace: tokens.fontHeading,
            });
            const tileW = 11.5 / Math.max(slidePlan.items.length, 1);
            slidePlan.items.forEach((item, index) => {
                const x = 0.6 + index * tileW;
                slide.addShape(pptx.ShapeType.rect, {
                    x,
                    y: 1.35,
                    w: tileW - 0.15,
                    h: 1.35,
                    fill: { color: tokens.textOnDark },
                    line: { color: tokens.surface, width: 1 },
                });
                slide.addText(item.value, {
                    x,
                    y: 1.55,
                    w: tileW - 0.15,
                    h: 0.7,
                    fontSize: 28,
                    bold: true,
                    align: 'center',
                    color: metricColor(item.tone, tokens),
                    fontFace: tokens.fontHeading,
                });
                slide.addText(item.label, {
                    x,
                    y: 2.2,
                    w: tileW - 0.15,
                    h: 0.4,
                    fontSize: 11,
                    align: 'center',
                    color: tokens.muted,
                    fontFace: tokens.fontBody,
                });
            });
            if (slidePlan.bullets?.length) {
                slide.addText(
                    slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                    {
                        x: 0.6,
                        y: 2.95,
                        w: 11.5,
                        h: 1.8,
                        fontSize: 13,
                        color: tokens.text,
                        fontFace: tokens.fontBody,
                    }
                );
            }
            addFooter(slide, slidePlan.footer, tokens);
            break;
        }

        case 'table':
            slide.addText(slidePlan.title, {
                x: 0.6,
                y: 0.55,
                w: 11.5,
                h: 0.7,
                fontSize: 24,
                bold: true,
                color: tokens.text,
                fontFace: tokens.fontHeading,
            });
            slide.addTable(toTableRows(slidePlan.headers, slidePlan.rows), {
                x: 0.6,
                y: 1.35,
                w: 11.5,
                fontSize: 11,
                color: tokens.text,
                fontFace: tokens.fontBody,
                border: { type: 'solid', color: tokens.surface, pt: 1 },
                valign: 'middle',
            });
            addFooter(slide, slidePlan.footer, tokens);
            break;

        case 'two_column':
            slide.addText(slidePlan.title, {
                x: 0.6,
                y: 0.55,
                w: 11.5,
                h: 0.7,
                fontSize: 24,
                bold: true,
                color: tokens.text,
                fontFace: tokens.fontHeading,
            });
            renderContentBlock(slide, slidePlan.left, 0.6, 1.35, 5.5, 3.5, tokens);
            renderContentBlock(slide, slidePlan.right, 6.4, 1.35, 5.5, 3.5, tokens);
            addFooter(slide, slidePlan.footer, tokens);
            break;

        case 'closing':
            slide.addText(slidePlan.title, {
                x: 0.6,
                y: 1.5,
                w: 11.5,
                h: 0.8,
                fontSize: 28,
                bold: true,
                color: tokens.primary,
                fontFace: tokens.fontHeading,
            });
            slide.addText(
                slidePlan.bullets.map((bullet) => ({ text: bullet, options: { bullet: true, breakLine: true } })),
                {
                    x: 0.6,
                    y: 2.4,
                    w: 11.5,
                    h: 2.5,
                    fontSize: 16,
                    color: tokens.textOnDark,
                    fontFace: tokens.fontBody,
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
