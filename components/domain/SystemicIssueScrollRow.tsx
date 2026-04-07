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
                py: 1,
                px: 1.25,
                mb: 1,
                border: '1px solid var(--color-secondary-dx-pink-tint)',
                borderRadius: 'var(--msqdx-radius-md)',
                backgroundColor: 'var(--color-secondary-dx-pink-tint)',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 0.75,
                    mb: 0.5,
                    flexWrap: 'wrap',
                }}
            >
                <AlertCircle color="var(--color-secondary-dx-pink)" size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                <MsqdxTypography
                    variant="subtitle2"
                    sx={{
                        color: 'var(--color-secondary-dx-pink)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.35,
                        flex: '1 1 120px',
                        minWidth: 0,
                    }}
                >
                    {issue.title}
                </MsqdxTypography>
                <MsqdxChip label={t('domainResult.issuePagesCount', { count: issue.count })} size="small" brandColor="pink" />
            </Box>
            <MsqdxTypography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.35, color: 'var(--color-text-on-light)' }}>
                {fixText}
            </MsqdxTypography>
        </Box>
    );
});
