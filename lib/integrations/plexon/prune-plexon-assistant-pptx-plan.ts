/**
 * Pre-process Plexon report blocks and prune empty slides from the PPTX plan.
 */
import type { PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';
import type { ReportSlide, ReportSlideContent } from '@/lib/project-report/pptx/types';

function normalizeTitle(text: string): string {
    return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function splitParagraphToBullets(text: string): string[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    const byLine = normalized
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    if (byLine.length > 1) return byLine;
    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [normalized];
    return sentences.filter(Boolean);
}

function parseMarkdownH1(markdown: string): { h1?: string; body: string } {
    const lines = String(markdown ?? '').split(/\n/);
    let h1: string | undefined;
    const bodyLines: string[] = [];
    for (const line of lines) {
        const match = line.match(/^#\s+(.+)/);
        if (match && !h1) {
            h1 = match[1]!.trim();
            continue;
        }
        bodyLines.push(line);
    }
    return { h1, body: bodyLines.join('\n').trim() };
}

function isReportIntroBlock(block: PlexonUiBlock): boolean {
    return block.id.startsWith('report-intro') && block.type === 'text';
}

function isReportSummaryBlock(block: PlexonUiBlock): boolean {
    return block.id.startsWith('report-summary') && block.type === 'alert';
}

function columnHasContent(content: ReportSlideContent): boolean {
    if (content.kind === 'text') return Boolean(content.text.trim());
    return content.bullets.some((bullet) => bullet.trim());
}

/** Drop duplicate cover title; merge intro text + summary alert into one executive slide. */
export function compactPlexonReportBlocks(blocks: PlexonUiBlock[], reportTitle: string): PlexonUiBlock[] {
    const result: PlexonUiBlock[] = [];
    const coverTitle = normalizeTitle(reportTitle);
    let index = 0;

    while (index < blocks.length) {
        const block = blocks[index]!;

        if (isReportIntroBlock(block) && index + 1 < blocks.length && isReportSummaryBlock(blocks[index + 1]!)) {
            const summary = blocks[index + 1]!;
            const { h1, body } = parseMarkdownH1(String(block.props.markdown ?? ''));
            const introParts = splitParagraphToBullets(body);
            const summaryParts = splitParagraphToBullets(String(summary.props.message ?? ''));
            const merged = [...introParts, ...summaryParts].filter(Boolean);

            if (merged.length > 0) {
                result.push({
                    id: 'report-executive-compact',
                    type: 'alert',
                    props: {
                        title: typeof summary.props.title === 'string' ? summary.props.title : 'Zusammenfassung',
                        message: merged.join('\n\n'),
                        tone: summary.props.tone ?? 'info',
                    },
                });
            } else if (h1 && normalizeTitle(h1) !== coverTitle) {
                result.push(block);
                result.push(summary);
            }

            index += 2;
            continue;
        }

        if (block.type === 'text') {
            const { h1, body } = parseMarkdownH1(String(block.props.markdown ?? ''));
            const duplicateTitle = h1 != null && normalizeTitle(h1) === coverTitle;

            if (duplicateTitle && !body.trim()) {
                index += 1;
                continue;
            }

            if (duplicateTitle && body.trim()) {
                result.push({
                    ...block,
                    props: { ...block.props, markdown: body },
                });
                index += 1;
                continue;
            }
        }

        result.push(block);
        index += 1;
    }

    return result;
}

export function slideHasVisibleContent(slide: ReportSlide): boolean {
    switch (slide.kind) {
        case 'cover':
        case 'section':
            return true;
        case 'bullets':
            return Boolean(
                slide.lead?.trim() ||
                    slide.bullets.some((bullet) => bullet.trim()) ||
                    (slide.title.trim() && slide.title.trim() !== ' ')
            );
        case 'metrics':
            return slide.items.some((item) => item.label.trim() || item.value.trim());
        case 'table':
            return slide.headers.some((h) => h.trim()) || slide.rows.length > 0;
        case 'two_column':
            return columnHasContent(slide.left) || columnHasContent(slide.right);
        case 'chart':
            return slide.series.some(
                (entry) => entry.labels.length > 0 && entry.values.some((value) => Number.isFinite(value))
            );
        case 'closing':
            return slide.bullets.some((bullet) => bullet.trim()) || Boolean(slide.title.trim());
        default:
            return true;
    }
}

export function pruneEmptyPptxSlides(slides: ReportSlide[]): ReportSlide[] {
    return slides.filter(slideHasVisibleContent);
}
