/**
 * PDF chart captions — never abbreviate under diagrams; full labels belong in legend/text.
 */

/** @deprecated inline bar captions removed — use legend rows instead */
export const PDF_CHART_BAR_LABEL_MAX_INLINE = 12;

export function pdfChartFullLabel(label: string): string {
    return label.trim();
}

export function pdfChartLegendEntries<T extends { label: string; color: string; value?: number }>(
    items: T[]
): Array<{ label: string; color: string; value?: number }> {
    return items.map((item) => ({
        label: pdfChartFullLabel(item.label),
        color: item.color,
        value: item.value,
    }));
}
