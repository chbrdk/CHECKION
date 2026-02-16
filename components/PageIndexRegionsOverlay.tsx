'use client';

import React from 'react';
import { Box } from '@mui/material';
import type { PageIndexRegion } from '@/lib/types';

/** Always use these hex values so regions are clearly visible regardless of theme. */
const COLOR_ORANGE = '#ff6a3b';
const COLOR_ORANGE_FILL = 'rgba(255, 106, 59, 0.35)';
const COLOR_ORANGE_BORDER = `4px solid ${COLOR_ORANGE}`;
const COLOR_ORANGE_SHADOW = `0 0 0 2px #fff, 0 0 0 6px ${COLOR_ORANGE}`;
/** Subtle border for non-hovered regions so all regions are visibly highlighted. */
const COLOR_REGION_DEFAULT_BORDER = '2px solid rgba(255, 106, 59, 0.6)';
const COLOR_REGION_DEFAULT_FILL = 'rgba(255, 106, 59, 0.12)';

export interface PageIndexRegionsOverlayProps {
    regions: PageIndexRegion[];
    screenshotWidth: number;
    screenshotHeight: number;
    highlightedRegionId: string | null;
    visible: boolean;
}

export function PageIndexRegionsOverlay({
    regions,
    screenshotWidth,
    screenshotHeight,
    highlightedRegionId,
    visible,
}: PageIndexRegionsOverlayProps) {
    if (!visible || screenshotWidth <= 0 || screenshotHeight <= 0) return null;

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 35,
            }}
        >
            {regions
                .filter((r) => r.rect)
                .map((r) => {
                    const rect = r.rect!;
                    const isHighlighted = r.id === highlightedRegionId;
                    const leftPct = (rect.x / screenshotWidth) * 100;
                    const topPct = (rect.y / screenshotHeight) * 100;
                    const widthPct = (rect.width / screenshotWidth) * 100;
                    const heightPct = (rect.height / screenshotHeight) * 100;

                    return (
                        <Box
                            key={r.id}
                            sx={{
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
                                border: isHighlighted ? COLOR_ORANGE_BORDER : COLOR_REGION_DEFAULT_BORDER,
                                backgroundColor: isHighlighted ? COLOR_ORANGE_FILL : COLOR_REGION_DEFAULT_FILL,
                                transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
                                boxShadow: isHighlighted ? COLOR_ORANGE_SHADOW : 'none',
                            }}
                        >
                            {isHighlighted && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: 0,
                                        mb: 0.25,
                                        px: 0.5,
                                        py: 0.25,
                                        bgcolor: COLOR_ORANGE,
                                        color: '#fff',
                                        borderRadius: 0.5,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '200%',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                    }}
                                >
                                    {r.tag} — {(r.headingText || '').slice(0, 40)}
                                    {(r.headingText || '').length > 40 ? '…' : ''}
                                </Box>
                            )}
                        </Box>
                    );
                })}
        </Box>
    );
}
