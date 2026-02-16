'use client';

import React from 'react';
import { Box } from '@mui/material';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { PageIndexRegion } from '@/lib/types';

/** Prominent color for region highlight so it's visible on any screenshot. */
const REGION_HIGHLIGHT_COLOR = MSQDX_BRAND_PRIMARY.orange ?? '#ff6a3b';
const REGION_HIGHLIGHT_FILL = 'rgba(255, 106, 59, 0.28)';
const REGION_HIGHLIGHT_BORDER = `4px solid ${REGION_HIGHLIGHT_COLOR}`;
const REGION_HIGHLIGHT_SHADOW = `0 0 0 2px #fff, 0 0 0 6px ${REGION_HIGHLIGHT_COLOR}`;

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
                                border: isHighlighted ? REGION_HIGHLIGHT_BORDER : '1px solid rgba(0,0,0,0.2)',
                                backgroundColor: isHighlighted ? REGION_HIGHLIGHT_FILL : 'transparent',
                                transition: 'border-color 0.15s, background-color 0.15s, box-shadow 0.15s',
                                boxShadow: isHighlighted ? REGION_HIGHLIGHT_SHADOW : 'none',
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
                                        bgcolor: REGION_HIGHLIGHT_COLOR,
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
