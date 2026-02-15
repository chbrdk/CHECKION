import React from 'react';

export interface SaliencyHeatmapOverlayProps {
    heatmapDataUrl: string;
    screenshotWidth?: number;
    screenshotHeight?: number;
    visible: boolean;
    /** Opacity of the heatmap over the screenshot (0–1). Default 0.6 */
    opacity?: number;
}

export const SaliencyHeatmapOverlay = ({
    heatmapDataUrl,
    visible,
    opacity = 0.6,
}: SaliencyHeatmapOverlayProps) => {
    if (!visible) return null;

    return (
        <img
            src={heatmapDataUrl}
            alt="Attention heatmap"
            aria-hidden
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
                opacity,
                zIndex: 15,
            }}
        />
    );
};
