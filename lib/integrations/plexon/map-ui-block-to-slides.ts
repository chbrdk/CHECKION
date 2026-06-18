/**
 * Map Plexon UiBlock → ReportSlide[] for MSQDX PPTX pipeline.
 */
import type { PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';
import type {
    ReportSlide,
    ReportSlideChartSeries,
    ReportSlideContent,
} from '@/lib/project-report/pptx/types';
import { PPTX_MAX_TABLE_ROWS } from '@/lib/project-report/pptx/types';
import type { PlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';
import {
    mapChartBlockToSlides,
    mapCornerTabSectionToSlides,
    mapDataTableToSlides,
    mapMetricGridToSlides,
    mapPersonaCardToSlidesExtended,
    mapTargetGroupCardToSlides,
} from '@/lib/integrations/plexon/plexon-ui-block-pptx-mappers';

type StepStatus = 'pending' | 'running' | 'done' | 'error';

function blockTitle(props: Record<string, unknown>): string | null {
    return typeof props.title === 'string' && props.title.trim() ? props.title.trim() : null;
}

function cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

function splitParagraphToBullets(text: string): string[] {
    const normalized = cleanText(text);
    if (!normalized) return [];
    const byLine = normalized
        .split(/\n+/)
        .map((line) => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    if (byLine.length > 1) return byLine;
    const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) ?? [normalized];
    return sentences.filter(Boolean);
}

function markdownToBullets(markdown: string): { title?: string; bullets: string[] } {
    const lines = String(markdown ?? '').split(/\n/);
    let title: string | undefined;
    const bodyLines: string[] = [];
    for (const line of lines) {
        const h1 = line.match(/^#\s+(.+)/);
        if (h1 && !title) {
            title = h1[1]!.trim();
            continue;
        }
        bodyLines.push(line);
    }
    const body = bodyLines.join('\n').trim();
    return { title, bullets: splitParagraphToBullets(body) };
}

function stepStatusSymbol(status: StepStatus): string {
    switch (status) {
        case 'done':
            return '✓';
        case 'error':
            return '✗';
        case 'running':
            return '▶';
        default:
            return '○';
    }
}

function splitKeyValues(
    items: Array<{ label: string; value: string | number }>
): { left: ReportSlideContent; right: ReportSlideContent } {
    const mid = Math.ceil(items.length / 2);
    const leftItems = items.slice(0, mid);
    const rightItems = items.slice(mid);
    const toBullets = (entries: typeof items) =>
        entries.map((item) => `${item.label}: ${String(item.value)}`);
    return {
        left: { kind: 'bullets', bullets: toBullets(leftItems) },
        right: { kind: 'bullets', bullets: toBullets(rightItems) },
    };
}

function chartSeriesFromBlock(props: Record<string, unknown>): ReportSlideChartSeries[] {
    const labels = (props.labels as string[]) ?? [];
    const datasets = (props.datasets as Array<{ label: string; values: number[] }>) ?? [];
    return datasets.map((ds) => ({
        name: ds.label,
        labels,
        values: labels.map((_, i) => Number(ds.values[i] ?? 0)),
    }));
}

function chartTableFallback(
    block: PlexonUiBlock,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide {
    const p = block.props;
    const chartLabels = (p.labels as string[]) ?? [];
    const datasets = (p.datasets as Array<{ label: string; values: number[] }>) ?? [];
    const headers = ['Label', ...datasets.map((ds) => ds.label)];
    const rows = chartLabels.map((label, li) => [
        label,
        ...datasets.map((ds) => String(ds.values[li] ?? '—')),
    ]);
    return {
        kind: 'table',
        layout: 'CONTENT',
        title: blockTitle(p) ?? labels.chartFallback,
        headers,
        rows: rows.slice(0, PPTX_MAX_TABLE_ROWS),
        footer,
    };
}

export function isPinnedAssistantBlock(block: PlexonUiBlock): boolean {
    return block.id.startsWith('report-pin-');
}

export function mapUiBlockToSlides(
    block: PlexonUiBlock,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide[] {
    const p = block.props;
    const title = blockTitle(p);

    switch (block.type) {
        case 'text': {
            const parsed = markdownToBullets(String(p.markdown ?? ''));
            const slideTitle = parsed.title ?? title ?? ' ';
            if (parsed.bullets.length === 0 && !parsed.title) {
                return [];
            }
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: slideTitle,
                bullets: parsed.bullets.length ? parsed.bullets : [String(p.markdown ?? '').trim()],
                footer,
            }];
        }
        case 'alert': {
            const message = String(p.message ?? '').trim();
            const alertTitle = title ?? ' ';
            const bullets = splitParagraphToBullets(message);
            if (block.id.includes('report-fazit')) {
                if (!message && !title) return [];
                return [{
                    kind: 'closing',
                    layout: 'CLOSING',
                    title: alertTitle,
                    bullets: bullets.length ? bullets : [message],
                    footer,
                }];
            }
            if (!message && !title) return [];
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: alertTitle,
                bullets: bullets.length ? bullets : [message],
                footer,
            }];
        }
        case 'metric_grid': {
            const items =
                (p.items as Array<{ label: string; value: string | number; unit?: string; tone?: string; hint?: string }>) ?? [];
            if (items.length === 0) return [];
            return mapMetricGridToSlides(items, title ?? 'KPIs', footer, labels);
        }
        case 'data_table': {
            const cols = (p.columns as string[]) ?? [];
            const rows = (p.rows as Array<Array<string | number | null>>) ?? [];
            if (cols.length === 0 && rows.length === 0) return [];
            return mapDataTableToSlides(cols, rows, title ?? ' ', footer, labels);
        }
        case 'key_value_list': {
            const items = (p.items as Array<{ label: string; value: string | number }>) ?? [];
            const { left, right } = splitKeyValues(items);
            return [{
                kind: 'two_column',
                layout: 'TWO_COLUMN',
                title: title ?? ' ',
                left,
                right,
                footer,
            }];
        }
        case 'finding_list': {
            const items = (p.items as Array<{ title: string; description: string; severity?: string }>) ?? [];
            if (items.length === 0) return [];
            const bullets = items.flatMap((item) => {
                const prefix = item.severity ? `[${item.severity}] ` : '';
                const head = `${prefix}${item.title}`;
                return item.description ? [head, item.description] : [head];
            });
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? labels.findings,
                bullets,
                footer,
            }];
        }
        case 'recommendation_list': {
            const items =
                (p.items as Array<{ title: string; description?: string; priority?: number; category?: string }>) ?? [];
            if (items.length === 0) return [];
            const bullets = items.map((item) => {
                const parts = [
                    item.priority != null ? `[P${item.priority}]` : null,
                    item.title,
                    item.category ? `· ${item.category}` : null,
                ].filter(Boolean);
                const head = parts.join(' ');
                return item.description ? `${head} — ${item.description}` : head;
            });
            if (block.id.includes('report-recommendations')) {
                return [{
                    kind: 'closing',
                    layout: 'CLOSING',
                    title: title ?? labels.recommendations,
                    bullets,
                    footer,
                }];
            }
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? labels.recommendations,
                bullets,
                footer,
            }];
        }
        case 'link_list': {
            const links = (p.links as Array<{ label: string; href: string }>) ?? [];
            if (links.length === 0) return [];
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? 'Links',
                bullets: links.map((link) => `${link.label}: ${link.href}`),
                footer,
            }];
        }
        case 'persona_card': {
            const personas =
                (p.personas as Array<{
                    name: string;
                    segment: string;
                    headline: string;
                    confidence?: number;
                    [key: string]: unknown;
                }>) ?? [];
            if (personas.length === 0) return [];
            return mapPersonaCardToSlidesExtended(personas, title ?? labels.personas, footer, labels);
        }
        case 'target_group_card': {
            const groups =
                (p.targetGroups as Array<{
                    name: string;
                    segment: string;
                    description?: string;
                    personaCount?: number;
                    knowledgeEntryCount?: number;
                }>) ?? [];
            if (groups.length === 0) return [];
            return mapTargetGroupCardToSlides(groups, title ?? 'Zielgruppen', footer, labels);
        }
        case 'summary_card': {
            const links = (p.links as Array<{ label: string; href: string }>) ?? [];
            const items = [
                { label: 'CHECKION Scans', value: String(p.checkionScanCount ?? '—') },
                { label: 'AUDION Personas', value: String(p.audionPersonaCount ?? '—') },
            ];
            const linkBullets = links.map((link) => `${link.label}: ${link.href}`);
            return [{
                kind: 'metrics',
                layout: 'METRICS',
                title: String(p.title ?? 'Zusammenfassung'),
                items,
                bullets: linkBullets.length ? linkBullets : undefined,
                footer,
            }];
        }
        case 'step_list': {
            const steps =
                (p.steps as Array<{ label: string; status: StepStatus; detail?: string; progress?: number }>) ?? [];
            if (steps.length === 0) return [];
            const bullets = steps.map((step) => {
                const detail = [
                    step.detail,
                    step.status === 'running' && step.progress != null ? `${step.progress}%` : null,
                ].filter(Boolean).join(' · ');
                return detail
                    ? `${stepStatusSymbol(step.status)} ${step.label} — ${detail}`
                    : `${stepStatusSymbol(step.status)} ${step.label}`;
            });
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? 'Workflow',
                bullets,
                footer,
            }];
        }
        case 'corner_tab_section':
            return mapCornerTabSectionToSlides(p, title, footer);
        case 'collapsible': {
            const bullets = splitParagraphToBullets(String(p.markdown ?? ''));
            const collapsibleTitle = String(p.title ?? '').trim();
            if (bullets.length === 0 && !collapsibleTitle) return [];
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: collapsibleTitle || 'Abschnitt',
                bullets,
                footer,
            }];
        }
        case 'chart': {
            const series = chartSeriesFromBlock(p);
            return mapChartBlockToSlides(
                p,
                title ?? labels.chartFallback,
                footer,
                labels,
                series,
                () => chartTableFallback(block, footer, labels)
            );
        }
        default:
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: block.type,
                bullets: [labels.unknownBlock],
                footer,
            }];
    }
}
