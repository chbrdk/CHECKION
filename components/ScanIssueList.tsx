import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MSQDX_SPACING, MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import { MsqdxTypography } from '@msqdx/react';
import { ScanIssueRow } from './ScanIssueRow';
import type { Issue } from '@/lib/types';

interface ScanIssueListProps {
    issues: Issue[];
    highlightedIndex: number | null;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

const tableBorder = `1px solid ${MSQDX_NEUTRAL[700]}`;

export const ScanIssueList = memo(({ issues, highlightedIndex, registerRef }: ScanIssueListProps) => {
    return (
        <Box
            component="div"
            sx={{
                border: tableBorder,
                borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                overflow: 'hidden',
                backgroundColor: MSQDX_THEME.dark.surface.primary,
            }}
        >
            {/* Table header */}
            <Box
                component="div"
                role="row"
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 40px',
                    gap: 0,
                    borderBottom: tableBorder,
                    backgroundColor: MSQDX_NEUTRAL[800],
                    alignItems: 'center',
                    minHeight: 40,
                }}
            >
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Schwere
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Meldung
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Level
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Runner
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Code
                    </MsqdxTypography>
                </Box>
                <Box component="div" role="columnheader" sx={{ px: 1, py: 1 }} aria-hidden />
            </Box>

            {/* Rows */}
            {issues.map((issue, idx) => (
                <ScanIssueRow
                    key={`issue-${idx}`}
                    issue={issue}
                    index={idx}
                    isHighlighted={highlightedIndex === idx}
                    registerRef={registerRef}
                />
            ))}
        </Box>
    );
});

ScanIssueList.displayName = 'ScanIssueList';
