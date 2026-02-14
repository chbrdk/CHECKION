import React from 'react';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';

interface FocusItem {
    index: number;
    text: string;
    role: string;
    rect: { x: number; y: number; width: number; height: number };
}

interface FocusOrderOverlayProps {
    items: FocusItem[];
    scale?: number; // If screenshot is scaled
    visible: boolean;
}

export const FocusOrderOverlay = ({ items, scale = 1, visible }: FocusOrderOverlayProps) => {
    if (!visible) return null;

    return (
        <svg
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 20
            }}
        >
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={MSQDX_BRAND_PRIMARY.purple} />
                </marker>
            </defs>

            {items.map((item, i) => {
                const nextItem = items[i + 1];
                const cx = (item.rect.x + item.rect.width / 2) * scale;
                const cy = (item.rect.y + item.rect.height / 2) * scale;

                return (
                    <g key={item.index}>
                        {/* Connection Line */}
                        {nextItem && (
                            <line
                                x1={cx}
                                y1={cy}
                                x2={(nextItem.rect.x + nextItem.rect.width / 2) * scale}
                                y2={(nextItem.rect.y + nextItem.rect.height / 2) * scale}
                                stroke={MSQDX_BRAND_PRIMARY.purple}
                                strokeWidth="2"
                                strokeDasharray="4"
                                markerEnd="url(#arrowhead)"
                                opacity={0.6}
                            />
                        )}

                        {/* Badge Circle */}
                        <circle
                            cx={item.rect.x * scale}
                            cy={item.rect.y * scale}
                            r="12"
                            fill={MSQDX_BRAND_PRIMARY.purple}
                            stroke="white"
                            strokeWidth="2"
                        />
                        {/* Number */}
                        <text
                            x={item.rect.x * scale}
                            y={item.rect.y * scale}
                            dy="4"
                            textAnchor="middle"
                            fill="white"
                            fontSize="12"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                        >
                            {item.index}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};
