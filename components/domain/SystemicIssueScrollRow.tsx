'use client';

import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { AlertCircle } from 'lucide-react';
import type { DomainScanResult } from '@/lib/types';
import { splitSystemicIssueTitle } from '@/lib/systemic-issue-title';

export type SystemicIssueScrollRowProps = {
    issue: DomainScanResult['systemicIssues'][number];
    t: (key: string, values?: Record<string, string | number>) => string;
};

/** Memoized row for VirtualScrollList (domain overview systemic issues). */
export const SystemicIssueScrollRow = memo(function SystemicIssueScrollRow({ issue, t }: SystemicIssueScrollRowProps) {
    const { body, docUrl } = useMemo(() => splitSystemicIssueTitle(issue.title), [issue.title]);
    const fixText = useMemo(
        () => t('domainResult.fixingRuleAffects', { issueId: issue.issueId, count: issue.count }),
        [t, issue.issueId, issue.count]
    );

    return (
        <Box
            sx={{
                py: 1.125,
                px: 1.25,
                mb: 1,
                maxWidth: '100%',
                overflow: 'hidden',
                border: '1px solid var(--color-secondary-dx-pink-tint)',
                borderRadius: 'var(--msqdx-radius-md)',
                backgroundColor: 'var(--color-secondary-dx-pink-tint)',
            }}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                    alignItems: 'start',
                    columnGap: 0.75,
                    rowGap: 0.35,
                    mb: 0.5,
                }}
            >
                <AlertCircle color="var(--color-secondary-dx-pink)" size={16} style={{ marginTop: 2 }} />
                <MsqdxTypography
                    variant="subtitle2"
                    sx={{
                        color: 'var(--color-secondary-dx-pink)',
                        fontSize: '0.8125rem',
                        lineHeight: 1.4,
                        minWidth: 0,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                    }}
                >
                    {body}
                </MsqdxTypography>
                <Box sx={{ justifySelf: 'end', alignSelf: 'start' }}>
                    <MsqdxChip label={t('domainResult.issuePagesCount', { count: issue.count })} size="small" brandColor="pink" />
                </Box>
                {docUrl ? (
                    <Box
                        component="a"
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            gridColumn: '2 / -1',
                            fontSize: '0.75rem',
                            lineHeight: 1.35,
                            color: 'var(--color-theme-accent)',
                            textDecoration: 'underline',
                            textUnderlineOffset: 2,
                            minWidth: 0,
                            wordBreak: 'break-all',
                        }}
                    >
                        {t('domainResult.systemicIssueRuleDoc')}
                    </Box>
                ) : null}
            </Box>
            <MsqdxTypography variant="body2" sx={{ fontSize: '0.8125rem', lineHeight: 1.35, color: 'var(--color-text-on-light)' }}>
                {fixText}
            </MsqdxTypography>
        </Box>
    );
});
