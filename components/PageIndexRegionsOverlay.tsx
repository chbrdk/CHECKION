'use client';

import React from 'react';
import { Box } from '@mui/material';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { PageIndexRegion } from '@/lib/types';

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
                                border: isHighlighted
                                    ? `3px solid ${MSQDX_BRAND_PRIMARY.green}`
                                    : '1px solid rgba(0,0,0,0.15)',
                                backgroundColor: isHighlighted ? 'rgba(0,180,120,0.12)' : 'transparent',
                                transition: 'border-color 0.15s, background-color 0.15s',
                                boxShadow: isHighlighted ? `0 0 0 2px ${MSQDX_BRAND_PRIMARY.green}` : 'none',
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
                                        bgcolor: MSQDX_BRAND_PRIMARY.green,
                                        color: '#fff',
                                        borderRadius: 0.5,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '200%',
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
