import React, { memo, useMemo } from 'react';
import { Box, alpha } from '@mui/material';
import { MSQDX_SPACING, MSQDX_NEUTRAL, MSQDX_THEME, MSQDX_STATUS } from '@msqdx/tokens';
import { MsqdxTypography } from '@msqdx/react';
import { ScanIssueRow } from './ScanIssueRow';
import type { Issue } from '@/lib/types';

interface ScanIssueListProps {
    issues: Issue[];
    highlightedIndex: number | null;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;
const highlightBg = alpha(MSQDX_STATUS.info.base, 0.2);

export const ScanIssueList = memo(({ issues, highlightedIndex, registerRef }: ScanIssueListProps) => {
    const containerSx = useMemo(() => ({
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
    }), [highlightedIndex]);

    return (
        <Box component="div" data-highlighted-index={highlightedIndex ?? ''} sx={containerSx}>
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
                }}
            >
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Schwere
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Meldung
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Level
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Runner
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Code
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1, py: 1 }} aria-hidden />
            </Box>
            {issues.map((issue, idx) => (
                <ScanIssueRow
                    key={`issue-${idx}`}
                    issue={issue}
                    index={idx}
                    registerRef={registerRef}
                />
            ))}
        </Box>
    );
});

ScanIssueList.displayName = 'ScanIssueList';
