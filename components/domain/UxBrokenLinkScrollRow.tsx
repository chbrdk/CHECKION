'use client';

import React, { memo } from 'react';
import { MsqdxTypography } from '@msqdx/react';
import type { AggregatedUx } from '@/lib/domain-aggregation';

export type UxBrokenLinkScrollRowProps = {
    link: AggregatedUx['brokenLinks'][number];
};

/** Memoized row for VirtualScrollList (UX audit broken links preview). */
export const UxBrokenLinkScrollRow = memo(function UxBrokenLinkScrollRow({ link: l }: UxBrokenLinkScrollRowProps) {
    return (
        <MsqdxTypography variant="caption" sx={{ display: 'block', py: 0.25 }}>
            {l.href} → {l.pageUrl} (HTTP {l.status})
        </MsqdxTypography>
    );
});
