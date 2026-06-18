/**
 * Map Plexon UiBlock → ReportSlide[] for MSQDX PPTX pipeline.
 */
import type { PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';
import type {
    ReportSlide,
    ReportSlideChartSeries,
    ReportSlideContent,
    ReportSlideMetricTone,
} from '@/lib/project-report/pptx/types';
import { PPTX_MAX_TABLE_ROWS } from '@/lib/project-report/pptx/types';
import type { PlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';

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

function mapTone(tone: unknown): ReportSlideMetricTone {
    if (tone === 'success' || tone === 'good') return 'good';
    if (tone === 'warning' || tone === 'warn') return 'warn';
    if (tone === 'error' || tone === 'bad') return 'bad';
    return 'neutral';
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
            if (block.id.includes('report-fazit')) {
                return [{
                    kind: 'closing',
                    layout: 'CLOSING',
                    title: alertTitle,
                    bullets: splitParagraphToBullets(message),
                    footer,
                }];
            }
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: alertTitle,
                lead: message || undefined,
                bullets: [],
                footer,
            }];
        }
        case 'metric_grid': {
            const items =
                (p.items as Array<{ label: string; value: string | number; unit?: string; tone?: string }>) ?? [];
            return [{
                kind: 'metrics',
                layout: 'METRICS',
                title: title ?? ' ',
                items: items.map((item) => ({
                    label: item.label,
                    value: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
                    tone: mapTone(item.tone),
                })),
                footer,
            }];
        }
        case 'data_table': {
            const cols = (p.columns as string[]) ?? [];
            const rows = ((p.rows as Array<Array<string | number | null>>) ?? []).slice(0, PPTX_MAX_TABLE_ROWS);
            return [{
                kind: 'table',
                layout: 'CONTENT',
                title: title ?? ' ',
                headers: cols,
                rows: rows.map((row) => row.map((cell) => String(cell ?? '—'))),
                footer,
            }];
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
                (p.personas as Array<{ name: string; segment: string; headline: string; confidence?: number }>) ?? [];
            const bullets = personas.flatMap((persona) => {
                const meta = [
                    persona.segment,
                    persona.confidence != null ? `${Math.round(persona.confidence * 100)}%` : null,
                ].filter(Boolean).join(' · ');
                return [`${persona.name} — ${meta}`, persona.headline];
            });
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? 'Personas',
                bullets,
                footer,
            }];
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
            const bullets = groups.flatMap((group) => {
                const lines = [`${group.name} (${group.segment})`];
                if (group.description) lines.push(group.description);
                lines.push(
                    `Personas: ${group.personaCount ?? 0} · Wissenseinträge: ${group.knowledgeEntryCount ?? 0}`
                );
                return lines;
            });
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? 'Zielgruppen',
                bullets,
                footer,
            }];
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
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: title ?? String(p.tabLabel ?? 'Abschnitt'),
                lead: String(p.tabLabel ?? '').trim() || undefined,
                bullets: splitParagraphToBullets(String(p.markdown ?? '')),
                footer,
            }];
        case 'collapsible':
            return [{
                kind: 'bullets',
                layout: 'CONTENT',
                title: String(p.title ?? 'Abschnitt'),
                bullets: splitParagraphToBullets(String(p.markdown ?? '')),
                footer,
            }];
        case 'chart': {
            const series = chartSeriesFromBlock(p);
            const hasChartData = series.length > 0 && series.some((s) => s.values.some((v) => Number.isFinite(v)));
            if (!hasChartData) {
                return [chartTableFallback(block, footer, labels)];
            }
            const chartType = p.chartType === 'line' ? 'line' : 'bar';
            const meta = [p.xAxisLabel, p.yAxisLabel].filter(Boolean).map(String);
            return [{
                kind: 'chart',
                layout: 'CONTENT',
                title: title ?? labels.chartFallback,
                subtitle: meta.length ? meta.join(' · ') : undefined,
                chartType,
                series,
                valAxisTitle: typeof p.yAxisLabel === 'string' ? p.yAxisLabel : undefined,
                catAxisTitle: typeof p.xAxisLabel === 'string' ? p.xAxisLabel : undefined,
                footer,
            }];
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
