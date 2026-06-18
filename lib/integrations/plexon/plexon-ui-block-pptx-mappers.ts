/**
 * Rich Plexon UiBlock → ReportSlide mappers (Phase B).
 */
import type { PlexonUiBlock } from '@/lib/integrations/plexon/assistant-report-types';
import type { PlexonAssistantPptxLabels } from '@/lib/integrations/plexon/plexon-assistant-pptx-labels';
import type {
    ReportSlide,
    ReportSlideChartSeries,
    ReportSlideMetricTone,
} from '@/lib/project-report/pptx/types';
import { PPTX_MAX_TABLE_ROWS } from '@/lib/project-report/pptx/types';

export const PLEXON_PPTX_MAX_METRIC_TILES = 3;
export const PLEXON_PPTX_TABLE_ROWS_PER_SLIDE = PPTX_MAX_TABLE_ROWS;
export const PLEXON_PPTX_WIDE_TABLE_COLUMNS = 5;

type MetricItem = {
    label: string;
    value: string | number;
    unit?: string;
    tone?: string;
    hint?: string;
};

type PersonaItem = {
    name: string;
    segment: string;
    headline: string;
    confidence?: number;
};

type TargetGroupItem = {
    name: string;
    segment: string;
    description?: string;
    personaCount?: number;
    knowledgeEntryCount?: number;
};

function mapTone(tone: unknown): ReportSlideMetricTone {
    if (tone === 'success' || tone === 'good') return 'good';
    if (tone === 'warning' || tone === 'warn') return 'warn';
    if (tone === 'error' || tone === 'bad') return 'bad';
    return 'neutral';
}

function formatMetricValue(item: MetricItem): string {
    return `${item.value}${item.unit ? ` ${item.unit}` : ''}`;
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

function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

export function mapMetricGridToSlides(
    items: MetricItem[],
    title: string,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide[] {
    const slides: ReportSlide[] = [];
    const onSlide = items.slice(0, PLEXON_PPTX_MAX_METRIC_TILES);
    const overflow = items.slice(PLEXON_PPTX_MAX_METRIC_TILES);

    slides.push({
        kind: 'metrics',
        layout: 'METRICS',
        title,
        items: onSlide.map((item) => ({
            label: item.label,
            value: formatMetricValue(item),
            tone: mapTone(item.tone),
        })),
        bullets: (() => {
            const hints = onSlide
                .filter((item) => item.hint?.trim())
                .map((item) => `${item.label}: ${item.hint}`);
            return hints.length > 0 ? hints : undefined;
        })(),
        footer,
    });

    if (overflow.length > 0) {
        slides.push({
            kind: 'table',
            layout: 'CONTENT',
            title: `${title} — ${labels.moreMetrics}`,
            headers: [labels.metricColumn, labels.valueColumn, labels.hintColumn],
            rows: overflow.map((item) => [
                item.label,
                formatMetricValue(item),
                item.hint?.trim() ?? '—',
            ]),
            footer,
        });
    }

    return slides;
}

export function mapPersonaCardToSlides(
    personas: PersonaItem[],
    title: string,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide[] {
    const slides: ReportSlide[] = [];
    const withConfidence = personas.filter((persona) => persona.confidence != null);

    if (withConfidence.length >= 2) {
        slides.push({
            kind: 'chart',
            layout: 'CONTENT',
            title,
            subtitle: labels.personaConfidence,
            chartType: 'barHorizontal',
            series: [
                {
                    name: labels.personaConfidence,
                    labels: withConfidence.map((persona) => persona.name),
                    values: withConfidence.map((persona) => Math.round((persona.confidence ?? 0) * 100)),
                },
            ],
            valAxisTitle: '%',
            showValue: true,
            showLegend: false,
            footer,
        });
    }

    for (const persona of personas) {
        const meta: string[] = [persona.segment];
        if (persona.confidence != null) {
            meta.push(`${labels.personaConfidence}: ${Math.round(persona.confidence * 100)}%`);
        }
        slides.push({
            kind: 'two_column',
            layout: 'TWO_COLUMN',
            title: personas.length === 1 ? title : persona.name,
            left: {
                kind: 'bullets',
                bullets: [persona.name, ...meta],
            },
            right: {
                kind: 'bullets',
                bullets: splitParagraphToBullets(persona.headline),
            },
            footer,
        });
    }

    return slides;
}

export function mapDataTableToSlides(
    columns: string[],
    rows: Array<Array<string | number | null>>,
    title: string,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide[] {
    if (columns.length === 0) return [];

    const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? '—')));
    if (normalizedRows.length === 0) {
        return [{
            kind: 'table',
            layout: 'CONTENT',
            title,
            headers: columns,
            rows: [],
            footer,
        }];
    }

    if (columns.length > PLEXON_PPTX_WIDE_TABLE_COLUMNS) {
        const mid = Math.ceil(columns.length / 2);
        const leftCols = columns.slice(0, mid);
        const rightCols = columns.slice(mid);
        const leftIdx = columns.map((_, i) => i).slice(0, mid);
        const rightIdx = columns.map((_, i) => i).slice(mid);

        return chunkArray(normalizedRows, PLEXON_PPTX_TABLE_ROWS_PER_SLIDE).map((chunk, index) => ({
            kind: 'two_column' as const,
            layout: 'TWO_COLUMN' as const,
            title: index === 0 ? title : `${title} (${labels.continued} ${index + 1})`,
            left: {
                kind: 'bullets' as const,
                bullets: [
                    leftCols.join(' | '),
                    ...chunk.map((row) => leftIdx.map((i) => row[i] ?? '—').join(' | ')),
                ],
            },
            right: {
                kind: 'bullets' as const,
                bullets: [
                    rightCols.join(' | '),
                    ...chunk.map((row) => rightIdx.map((i) => row[i] ?? '—').join(' | ')),
                ],
            },
            footer,
        }));
    }

    return chunkArray(normalizedRows, PLEXON_PPTX_TABLE_ROWS_PER_SLIDE).map((chunk, index) => ({
        kind: 'table' as const,
        layout: 'CONTENT' as const,
        title: index === 0 ? title : `${title} (${labels.continued} ${index + 1})`,
        headers: columns,
        rows: chunk,
        footer,
    }));
}

export function mapTargetGroupCardToSlides(
    groups: TargetGroupItem[],
    title: string,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide[] {
    if (groups.length === 1) {
        const group = groups[0]!;
        const left = [group.name, group.segment];
        const right = [
            ...(group.description ? splitParagraphToBullets(group.description) : []),
            `${labels.personas}: ${group.personaCount ?? 0} · ${labels.knowledgeEntries}: ${group.knowledgeEntryCount ?? 0}`,
        ];
        return [{
            kind: 'two_column',
            layout: 'TWO_COLUMN',
            title,
            left: { kind: 'bullets', bullets: left },
            right: { kind: 'bullets', bullets: right },
            footer,
        }];
    }

    const mid = Math.ceil(groups.length / 2);
    const toBullets = (items: TargetGroupItem[]) =>
        items.flatMap((group) => {
            const lines = [`${group.name} (${group.segment})`];
            if (group.description) lines.push(group.description);
            lines.push(
                `${labels.personas}: ${group.personaCount ?? 0} · ${labels.knowledgeEntries}: ${group.knowledgeEntryCount ?? 0}`
            );
            return lines;
        });

    return [{
        kind: 'two_column',
        layout: 'TWO_COLUMN',
        title,
        left: { kind: 'bullets', bullets: toBullets(groups.slice(0, mid)) },
        right: { kind: 'bullets', bullets: toBullets(groups.slice(mid)) },
        footer,
    }];
}

export function mapChartBlockToSlides(
    props: Record<string, unknown>,
    title: string,
    footer: string,
    labels: PlexonAssistantPptxLabels,
    series: ReportSlideChartSeries[],
    chartTableFallback: () => ReportSlide
): ReportSlide[] {
    const hasChartData = series.length > 0 && series.some((s) => s.values.some((v) => Number.isFinite(v)));
    if (!hasChartData) {
        return [chartTableFallback()];
    }

    const chartType = props.chartType === 'line' ? 'line' : 'bar';
    const meta = [props.xAxisLabel, props.yAxisLabel].filter(Boolean).map(String);
    const chartLabels = (props.labels as string[]) ?? [];
    const datasets = (props.datasets as Array<{ label: string; values: number[] }>) ?? [];

    const contextBullets: string[] = [];
    if (datasets.length === 1 && chartLabels.length > 0) {
        const ds = datasets[0]!;
        const pairs = chartLabels.map((label, i) => ({ label, value: ds.values[i] ?? 0 }));
        const top = [...pairs].sort((a, b) => b.value - a.value)[0];
        if (top) {
            contextBullets.push(`${labels.chartPeak}: ${top.label} (${top.value})`);
        }
    }

    return [{
        kind: 'chart',
        layout: 'CONTENT',
        title,
        subtitle: meta.length ? meta.join(' · ') : undefined,
        chartType,
        series,
        bullets: contextBullets.length ? contextBullets : undefined,
        valAxisTitle: typeof props.yAxisLabel === 'string' ? props.yAxisLabel : undefined,
        catAxisTitle: typeof props.xAxisLabel === 'string' ? props.xAxisLabel : undefined,
        footer,
    }];
}

export function mapCornerTabSectionToSlides(
    props: Record<string, unknown>,
    title: string | null,
    footer: string
): ReportSlide[] {
    const tabLabel = String(props.tabLabel ?? '').trim();
    const sectionTitle = title ?? tabLabel ?? 'Abschnitt';
    const bullets = splitParagraphToBullets(String(props.markdown ?? ''));

    if (bullets.length === 0 && !tabLabel && !title) return [];

    return [{
        kind: 'bullets',
        layout: 'CONTENT',
        title: sectionTitle,
        lead: tabLabel && title ? tabLabel : tabLabel && !title ? undefined : tabLabel || undefined,
        bullets,
        footer,
    }];
}

/** Optional extended persona shape (pillar scores from AUDION tools). */
export function extractPersonaPillarScores(
    persona: Record<string, unknown>
): Array<{ pillar: string; score: number }> | null {
    const raw =
        persona.pillarScores ??
        persona.scores ??
        persona.pillars;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const parsed = raw
        .map((entry) => {
            if (typeof entry !== 'object' || entry == null) return null;
            const row = entry as Record<string, unknown>;
            const pillar = String(row.pillar ?? row.label ?? row.name ?? '').trim();
            const score = Number(row.score ?? row.value);
            if (!pillar || !Number.isFinite(score)) return null;
            return { pillar, score };
        })
        .filter((entry): entry is { pillar: string; score: number } => entry != null);

    return parsed.length > 0 ? parsed : null;
}

export function mapPersonaPillarRadarSlide(
    personaName: string,
    pillars: Array<{ pillar: string; score: number }>,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide | null {
    if (pillars.length === 0) return null;
    return {
        kind: 'chart',
        layout: 'CONTENT',
        title: personaName,
        subtitle: labels.personaPillarFit,
        chartType: 'radar',
        series: [
            {
                name: personaName,
                labels: pillars.slice(0, 6).map((p) => p.pillar),
                values: pillars.slice(0, 6).map((p) => p.score),
            },
        ],
        showLegend: false,
        showValue: true,
        footer,
    };
}

export function mapPersonaCardToSlidesExtended(
    personas: Array<PersonaItem & Record<string, unknown>>,
    title: string,
    footer: string,
    labels: PlexonAssistantPptxLabels
): ReportSlide[] {
    const slides: ReportSlide[] = [];

    for (const persona of personas) {
        const pillars = extractPersonaPillarScores(persona);
        if (pillars) {
            const radar = mapPersonaPillarRadarSlide(persona.name, pillars, footer, labels);
            if (radar) slides.push(radar);
        }
    }

    slides.push(...mapPersonaCardToSlides(personas, title, footer, labels));
    return slides;
}
