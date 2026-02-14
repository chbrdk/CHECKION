import React, { memo } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import {
    MSQDX_SPACING,
    MSQDX_THEME,
    MSQDX_BRAND_PRIMARY,
    MSQDX_STATUS,
    MSQDX_NEUTRAL,
} from '@msqdx/tokens';
import type { Issue } from '@/lib/types';

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    error: { label: 'Error', color: MSQDX_STATUS.error.base },
    warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
    notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

const tableBorder = `1px solid ${MSQDX_NEUTRAL[700]}`;

interface ScanIssueRowProps {
    issue: Issue;
    index: number;
    isHighlighted: boolean;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

export const ScanIssueRow = memo(({ issue, index, isHighlighted, registerRef }: ScanIssueRowProps) => {
    const config = SEVERITY_CONFIG[issue.type] ?? SEVERITY_CONFIG.notice;
    const handleRef = React.useCallback((el: HTMLDivElement | null) => registerRef(index, el), [index, registerRef]);

    const levelLabel = issue.wcagLevel === 'Unknown' ? '–' : issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`;
    const codeShort = issue.code.length > 48 ? issue.code.slice(0, 48) + '…' : issue.code;
    const hasDetails = Boolean(issue.selector || issue.context);

    return (
        <Box
            ref={handleRef}
            id={`issue-${index}-wrapper`}
            component="div"
            sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 40px',
                gridTemplateRows: 'auto auto',
                gap: 0,
                borderBottom: tableBorder,
                alignItems: 'stretch',
                transition: 'background-color 0.12s',
                backgroundColor: isHighlighted ? `${config.color}18` : 'transparent',
                '&:last-of-type': { borderBottom: 'none' },
                '&:hover': {
                    backgroundColor: `${config.color}12`,
                },
            }}
        >
            {/* Row 1: data cells */}
            <Box component="div" role="cell" sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderRight: tableBorder }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: config.color, flexShrink: 0 }} />
                <MsqdxChip
                    label={config.label}
                    size="small"
                    sx={{
                        backgroundColor: alpha(config.color, 0.12),
                        color: config.color,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: 22,
                    }}
                />
            </Box>
            <Box component="div" role="cell" sx={{ px: 1.5, py: 1, minWidth: 0, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.4 }}>
                    {issue.message}
                </MsqdxTypography>
            </Box>
            <Box component="div" role="cell" sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                {issue.wcagLevel !== 'Unknown' && (
                    <MsqdxChip
                        label={levelLabel}
                        size="small"
                        sx={{
                            backgroundColor: issue.wcagLevel === 'APCA' ? alpha(MSQDX_BRAND_PRIMARY.purple, 0.12) : alpha(MSQDX_STATUS.info.base, 0.12),
                            color: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_STATUS.info.base,
                            fontSize: '0.7rem',
                            height: 22,
                        }}
                    />
                )}
                {issue.wcagLevel === 'Unknown' && (
                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary }}>–</MsqdxTypography>
                )}
            </Box>
            <Box component="div" role="cell" sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxChip
                    label={issue.runner}
                    size="small"
                    sx={{
                        backgroundColor: alpha(MSQDX_NEUTRAL[400], 0.1),
                        color: MSQDX_THEME.dark.text.tertiary,
                        fontSize: '0.7rem',
                        height: 22,
                    }}
                />
            </Box>
            <Box component="div" role="cell" sx={{ px: 1.5, py: 1, minWidth: 0, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" component="span" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', color: MSQDX_BRAND_PRIMARY.purple, wordBreak: 'break-all' }}>
                    {codeShort}
                </MsqdxTypography>
            </Box>

            {/* Last cell: native <details> with display:contents so summary and content become grid children */}
            {hasDetails ? (
                <Box component="details" sx={{ margin: 0, display: 'contents' }} onClick={(e) => e.stopPropagation()}>
                    <Box
                        component="summary"
                        title="Selector & Kontext ein- oder ausklappen"
                        sx={{
                            listStyle: 'none',
                            cursor: 'pointer',
                            px: 1,
                            py: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.7rem',
                            color: MSQDX_THEME.dark.text.tertiary,
                            userSelect: 'none',
                            '&::-webkit-details-marker': { display: 'none' },
                        }}
                    >
                        <span aria-hidden>▼</span>
                    </Box>
                    <Box
                        component="div"
                        sx={{
                            gridColumn: '1 / -1',
                            p: 1.5,
                            backgroundColor: MSQDX_NEUTRAL[800],
                            borderTop: tableBorder,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 2,
                        }}
                    >
                        {issue.selector && (
                            <Box>
                                <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                                    CSS Selector
                                </MsqdxTypography>
                                <Box component="code" sx={{ display: 'block', mt: 0.5, p: 1, borderRadius: 1, backgroundColor: MSQDX_NEUTRAL[900], color: MSQDX_BRAND_PRIMARY.yellow, fontSize: '0.7rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {issue.selector}
                                </Box>
                            </Box>
                        )}
                        {issue.context && (
                            <Box>
                                <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                                    HTML Context
                                </MsqdxTypography>
                                <Box component="pre" sx={{ mt: 0.5, p: 1, borderRadius: 1, backgroundColor: MSQDX_NEUTRAL[900], color: MSQDX_BRAND_PRIMARY.orange, fontSize: '0.7rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 180, overflowY: 'auto' }}>
                                    {issue.context}
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>
            ) : (
                <Box component="div" role="cell" sx={{ px: 1, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span aria-hidden>–</span>
                </Box>
            )}
        </Box>
    );
});

ScanIssueRow.displayName = 'ScanIssueRow';
