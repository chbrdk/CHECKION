'use client';

import React from 'react';
import { Box } from '@mui/material';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { MSQDX_STATUS } from '@msqdx/tokens';

export function issueTypeColor(type: string): string {
    if (type === 'error') return MSQDX_STATUS.error.base;
    if (type === 'warning') return MSQDX_STATUS.warning.base;
    return MSQDX_STATUS.info.base;
}

/** 4px left accent; pairs with rounded row container. */
export function IssueSeverityRail({ color }: { color: string }) {
    return (
        <Box
            aria-hidden
            sx={{
                width: 4,
                flexShrink: 0,
                borderRadius: '6px 0 0 6px',
                bgcolor: color,
            }}
        />
    );
}

export function IssueTypeIcon({ type, size = 18 }: { type: string; size?: number }) {
    const color = issueTypeColor(type);
    if (type === 'error') return <AlertCircle size={size} color={color} strokeWidth={2} aria-hidden />;
    if (type === 'warning') return <AlertTriangle size={size} color={color} strokeWidth={2} aria-hidden />;
    return <Info size={size} color={color} strokeWidth={2} aria-hidden />;
}

/** Shared focus ring for list row buttons (a11y). */
export const issueRowFocusSx = {
    '&:focus-visible': {
        outline: '2px solid var(--color-theme-accent, #0d9488)',
        outlineOffset: 2,
    },
} as const;
