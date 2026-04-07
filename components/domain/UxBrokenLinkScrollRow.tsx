'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import type { AggregatedUx } from '@/lib/domain-aggregation';
import { formatUrlForList } from '@/lib/format-url-display';
import { THEME_ACCENT_CSS } from '@/lib/theme-accent';

export type UxBrokenLinkScrollRowProps = {
    link: AggregatedUx['brokenLinks'][number];
};

/** Memoized row for VirtualScrollList (UX audit broken links preview). */
export const UxBrokenLinkScrollRow = memo(function UxBrokenLinkScrollRow({ link: l }: UxBrokenLinkScrollRowProps) {
    const pageDisp = formatUrlForList(l.pageUrl, 48);
    return (
        <Box sx={{ py: 0.5, borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)', '&:last-child': { borderBottom: 'none' } }}>
            <MsqdxTypography variant="caption" sx={{ display: 'block', wordBreak: 'break-word', lineHeight: 1.4 }}>
                <Box component="span" sx={{ color: THEME_ACCENT_CSS, fontWeight: 600 }}>
                    {l.href}
                </Box>
                <Box component="span" sx={{ color: 'var(--color-text-muted-on-light)' }}> · </Box>
                <Box component="span" sx={{ color: 'var(--color-text-on-light)' }}>{pageDisp}</Box>
                <Box component="span" sx={{ color: 'var(--color-text-muted-on-light)' }}> · HTTP {l.status}</Box>
            </MsqdxTypography>
        </Box>
    );
});
