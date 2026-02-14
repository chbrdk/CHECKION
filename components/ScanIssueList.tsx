import React, { memo, useMemo } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxAccordion } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_NEUTRAL, MSQDX_THEME, MSQDX_STATUS } from '@msqdx/tokens';
import { ScanIssueItem } from './ScanIssueItem';
import type { Issue } from '@/lib/types';

interface ScanIssueListProps {
    issues: Issue[];
    highlightedIndex: number | null;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

const highlightBg = alpha(MSQDX_STATUS.info.base, 0.15);

export const ScanIssueList = memo(({ issues, highlightedIndex, registerRef }: ScanIssueListProps) => {
    const containerSx = useMemo(() => ({
        overflow: 'auto',
        maxHeight: '65vh',
        contain: 'layout',
        ...(highlightedIndex !== null && {
            [`& [data-row-index="${highlightedIndex}"]`]: {
                backgroundColor: highlightBg,
            },
        }),
    }), [highlightedIndex]);

    const accordionSx = useMemo(() => ({
        display: 'flex',
        flexDirection: 'column' as const,
        gap: `${MSQDX_SPACING.scale.sm}px`,
        background: 'transparent',
        border: 'none',
    }), []);

    return (
        <Box
            component="div"
            data-highlighted-index={highlightedIndex ?? ''}
            sx={containerSx}
        >
            <MsqdxAccordion
                allowMultiple
                size="small"
                borderRadius="md"
                sx={accordionSx}
            >
                {issues.map((issue, idx) => (
                    <ScanIssueItem
                        key={`issue-${idx}`}
                        issue={issue}
                        index={idx}
                        registerRef={registerRef}
                    />
                ))}
            </MsqdxAccordion>
        </Box>
    );
});

ScanIssueList.displayName = 'ScanIssueList';
