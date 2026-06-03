'use client';

export interface GeoPositionLineTooltipPayloadItem {
    name?: string | number;
    dataKey?: string | number;
    value?: unknown;
    color?: string;
    stroke?: string;
}

export interface GeoPositionLineTooltipProps {
    active?: boolean;
    payload?: readonly GeoPositionLineTooltipPayloadItem[];
    label?: string | number;
    formatPositionValue: (value: unknown) => string;
}

/** Tooltip for a single hovered line (`Tooltip shared={false}`): date, series name, position. */
export function GeoPositionLineTooltip({
    active,
    payload,
    label,
    formatPositionValue,
}: GeoPositionLineTooltipProps) {
    if (!active || !payload?.length) return null;

    const item = payload[0];
    const seriesName = String(item.name ?? item.dataKey ?? '');
    const color = item.color ?? item.stroke ?? 'currentColor';
    const positionLabel = formatPositionValue(item.value);

    return (
        <div
            role="tooltip"
            style={{
                backgroundColor: 'var(--color-card-bg, #fff)',
                border: '1px solid var(--color-border-subtle, #eee)',
                borderRadius: 8,
                padding: '8px 10px',
                fontSize: 11,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                maxWidth: 280,
            }}
        >
            {label != null && String(label) !== '' && (
                <div
                    style={{
                        color: 'var(--color-text-muted-on-light)',
                        marginBottom: 4,
                        fontSize: 10,
                    }}
                >
                    {label}
                </div>
            )}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--color-text-on-light)',
                }}
            >
                <span
                    aria-hidden
                    style={{
                        width: 12,
                        height: 3,
                        borderRadius: 1,
                        backgroundColor: color,
                        flexShrink: 0,
                    }}
                />
                <span
                    style={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    {seriesName}
                </span>
                <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{positionLabel}</span>
            </div>
        </div>
    );
}
