'use client';

import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { AlertCircle } from 'lucide-react';
import type { DomainScanResult } from '@/lib/types';

export type SystemicIssueScrollRowProps = {
    issue: DomainScanResult['systemicIssues'][number];
    t: (key: string, values?: Record<string, string | number>) => string;
};

/** Memoized row for VirtualScrollList (domain overview systemic issues). */
export const SystemicIssueScrollRow = memo(function SystemicIssueScrollRow({ issue, t }: SystemicIssueScrollRowProps) {
    const fixText = useMemo(
        () => t('domainResult.fixingRuleAffects', { issueId: issue.issueId, count: issue.count }),
        [t, issue.issueId, issue.count]
    );

    return (
        <Box
            sx={{
                p: 'var(--msqdx-spacing-md)',
                mb: 'var(--msqdx-spacing-md)',
                border: '1px solid var(--color-secondary-dx-pink-tint)',
                borderRadius: 'var(--msqdx-radius-xs)',
                backgroundColor: 'var(--color-secondary-dx-pink-tint)',
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                <AlertCircle color="var(--color-secondary-dx-pink)" size={20} />
                <MsqdxTypography variant="subtitle1" sx={{ color: 'var(--color-secondary-dx-pink)' }}>
                    {issue.title}
                </MsqdxTypography>
                <MsqdxChip label={t('domainResult.issuePagesCount', { count: issue.count })} size="small" brandColor="pink" />
            </Box>
            <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                {fixText}
            </MsqdxTypography>
        </Box>
    );
});
