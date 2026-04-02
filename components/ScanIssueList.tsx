'use client';

import React, { forwardRef, memo, useImperativeHandle, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, alpha } from '@mui/material';
import { MSQDX_SPACING, MSQDX_NEUTRAL, MSQDX_THEME, MSQDX_STATUS } from '@msqdx/tokens';
import { MsqdxTypography } from '@msqdx/react';
import { ScanIssueRow } from './ScanIssueRow';
import type { Issue } from '@/lib/types';

export type ScanIssueListHandle = {
    /** Scroll the virtual list so the row for this **filtered-global** index is visible (must be on the current page slice). */
    scrollToGlobalIndex: (filteredGlobalIndex: number) => void;
};

interface ScanIssueListProps {
    issues: Issue[];
    /** Add to each row index so refs / highlights match `filteredIssues` indices (e.g. `(page - 1) * pageSize`). */
    issueIndexBase?: number;
    highlightedIndex: number | null;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;
const highlightBg = alpha(MSQDX_STATUS.info.base, 0.2);

const ScanIssueListInner = forwardRef<ScanIssueListHandle, ScanIssueListProps>(function ScanIssueListInner(
    { issues, issueIndexBase = 0, highlightedIndex, registerRef },
    ref
) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: issues.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 72,
        overscan: 10,
        getItemKey: (index) => {
            const issue = issues[index];
            return `${issueIndexBase + index}:${issue?.code ?? ''}:${issue?.selector ?? ''}:${index}`;
        },
    });

    useImperativeHandle(
        ref,
        () => ({
            scrollToGlobalIndex(filteredGlobalIndex: number) {
                const local = filteredGlobalIndex - issueIndexBase;
                if (local < 0 || local >= issues.length) return;
                rowVirtualizer.scrollToIndex(local, { align: 'center', behavior: 'smooth' });
            },
        }),
        [issueIndexBase, issues.length, rowVirtualizer]
    );

    const containerSx = useMemo(
        () => ({
            border: tableBorder,
            borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
            overflow: 'auto',
            maxHeight: '65vh',
            backgroundColor: MSQDX_THEME.light.surface.primary,
            color: MSQDX_THEME.light.text.primary,
            contain: 'layout',
            ...(highlightedIndex !== null && {
                [`& [data-row-index="${highlightedIndex}"]`]: {
                    backgroundColor: highlightBg,
                },
            }),
        }),
        [highlightedIndex]
    );

    return (
        <Box component="div" data-highlighted-index={highlightedIndex ?? ''} ref={scrollRef} sx={containerSx}>
                <Box
                    component="div"
                    role="row"
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 40px',
                        gap: 0,
                        borderBottom: tableBorder,
                        backgroundColor: MSQDX_NEUTRAL[100],
                        alignItems: 'center',
                        minHeight: 40,
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                    }}
                >
                    <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: MSQDX_THEME.light.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Schwere
                        </MsqdxTypography>
                    </Box>
                    <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: MSQDX_THEME.light.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Meldung
                        </MsqdxTypography>
                    </Box>
                    <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: MSQDX_THEME.light.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Level
                        </MsqdxTypography>
                    </Box>
                    <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: MSQDX_THEME.light.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Runner
                        </MsqdxTypography>
                    </Box>
                    <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                fontWeight: 600,
                                color: MSQDX_THEME.light.text.tertiary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Code
                        </MsqdxTypography>
                    </Box>
                    <Box component="div" role="columnheader" sx={{ px: 1, py: 1 }} aria-hidden />
                </Box>
                <Box
                    sx={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((vi) => {
                        const issue = issues[vi.index];
                        if (!issue) return null;
                        const globalRowIndex = issueIndexBase + vi.index;
                        return (
                            <div
                                key={vi.key}
                                data-index={vi.index}
                                ref={rowVirtualizer.measureElement}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${vi.start}px)`,
                                }}
                            >
                                <ScanIssueRow issue={issue} globalRowIndex={globalRowIndex} registerRef={registerRef} />
                            </div>
                        );
                    })}
                </Box>
        </Box>
    );
});

ScanIssueListInner.displayName = 'ScanIssueList';

export const ScanIssueList = memo(ScanIssueListInner);
ScanIssueList.displayName = 'ScanIssueList';
