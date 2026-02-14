
import React from 'react';
import { TouchTargetIssue } from '../lib/types';
import { MSQDX_STATUS } from '@msqdx/tokens';

interface TouchTargetOverlayProps {
    issues: TouchTargetIssue[];
    /** Screenshot dimensions in px (from image naturalWidth/naturalHeight). viewBox matches so SVG scales with image. */
    screenshotWidth?: number;
    screenshotHeight?: number;
    scale?: number;
}

export const TouchTargetOverlay: React.FC<TouchTargetOverlayProps> = ({ issues, screenshotWidth = 1920, screenshotHeight = 1080, scale = 1 }) => {
    if (!issues || issues.length === 0) return null;

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
                zIndex: 20
            }}
        >
            {issues.map((issue, i) => (
                <rect
                    key={i}
                    x={issue.rect.x * scale}
                    y={issue.rect.y * scale}
                    width={issue.rect.width * scale}
                    height={issue.rect.height * scale}
                    fill={`${MSQDX_STATUS.error.base}33`} // 20% opacity approx
                    stroke={MSQDX_STATUS.error.base}
                    strokeWidth="2"
                >
                    <title>{issue.message} ({issue.size.width}x{issue.size.height})</title>
                </rect>
            ))}
        </svg>
    );
};
