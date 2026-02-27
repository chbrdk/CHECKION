'use client';

import React from 'react';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { ScanpathFixation } from '@/lib/types';

export interface ScanpathOverlayProps {
    fixations: ScanpathFixation[];
    screenshotWidth?: number;
    screenshotHeight?: number;
    visible: boolean;
}

/** Renders numbered fixation order (1, 2, 3…) over the screenshot. */
export function ScanpathOverlay({
    fixations,
    screenshotWidth = 1920,
    screenshotHeight = 1080,
    visible,
}: ScanpathOverlayProps) {
    if (!visible || !fixations.length) return null;

    return (
        <svg
            viewBox={`0 0 ${screenshotWidth} ${screenshotHeight}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 25,
            }}
        >
            {fixations.map((f) => (
                <g key={`${f.x}-${f.y}-${f.order}`}>
                    <circle
                        cx={f.x}
                        cy={f.y}
                        r={14}
                        fill={MSQDX_BRAND_PRIMARY.orange ?? '#ff6a3b'}
                        stroke="#fff"
                        strokeWidth={2}
                    />
                    <text
                        x={f.x}
                        y={f.y}
                        dy="4"
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={12}
                        fontWeight="bold"
                        fontFamily="sans-serif"
                    >
                        {f.order}
                    </text>
                </g>
            ))}
        </svg>
    );
}
