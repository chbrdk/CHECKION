import React, { memo } from 'react';
import { Box, alpha } from '@mui/material';
import {
    MsqdxAccordionItem,
    MsqdxTypography,
    MsqdxChip,
} from '@msqdx/react'; // Assuming correct imports based on usage
import {
    MSQDX_SPACING,
    MSQDX_THEME,
    MSQDX_BRAND_PRIMARY,
    MSQDX_STATUS,
    MSQDX_NEUTRAL,
} from '@msqdx/tokens';
import type { Issue } from '@/lib/types';

// Duplicate or import SEVERITY_CONFIG if possible. 
// For now, redefining it here to keep component self-contained or I will export it from a shared file if I can.
// But since I'm creating a new file, I'll copy the config for now or accept it as a prop? 
// Better to define it here or import it. 
// I'll try to import it from types or constants if it exists there, but it likely exists only in page.tsx.
// I will copy it here to ensure stability.

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    error: { label: 'Error', color: MSQDX_STATUS.error.base },
    warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
    notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

interface ScanIssueItemProps {
    issue: Issue;
    index: number;
    isHighlighted: boolean;
    registerRef: (index: number, el: HTMLDivElement | null) => void;
}

export const ScanIssueItem = memo(({ issue, index, isHighlighted, registerRef }: ScanIssueItemProps) => {
    const config = SEVERITY_CONFIG[issue.type] || SEVERITY_CONFIG['notice']; // Fallback
    const itemId = `issue-${index}`;

    // Create stable ref callback
    const handleRef = React.useCallback((el: HTMLDivElement | null) => {
        registerRef(index, el);
    }, [index, registerRef]);

    return (
        <Box
            id={`${itemId}-wrapper`}
            ref={handleRef}
            sx={{
                transition: 'background-color 0.15s, border-color 0.15s',
                backgroundColor: isHighlighted ? `${config.color}18` : 'transparent',
                borderRadius: '8px',
                border: `1px solid ${isHighlighted ? config.color : 'transparent'}`,
                '&:hover': {
                    backgroundColor: `${config.color}18`,
                    borderColor: config.color,
                },
            }}
        >
            <MsqdxAccordionItem
                id={itemId}
                summary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: `${MSQDX_SPACING.scale.sm}px`, width: '100%' }}>
                        {/* Severity dot */}
                        <Box
                            sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: config.color,
                                flexShrink: 0,
                            }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <MsqdxTypography
                                variant="body2"
                                sx={{
                                    fontWeight: 500,
                                    lineHeight: 1.5,
                                    whiteSpace: 'normal',
                                }}
                            >
                                {issue.message}
                            </MsqdxTypography>
                            <Box sx={{ display: 'flex', gap: `${MSQDX_SPACING.scale.xs}px`, mt: `${MSQDX_SPACING.scale.xs}px`, flexWrap: 'wrap' }}>
                                <MsqdxChip
                                    label={config.label}
                                    size="small"
                                    sx={{
                                        backgroundColor: alpha(config.color, 0.12),
                                        color: config.color,
                                        fontWeight: 600,
                                        fontSize: '0.6rem',
                                        height: 20,
                                    }}
                                />
                                {issue.wcagLevel && issue.wcagLevel !== 'Unknown' && (
                                    <MsqdxChip
                                        label={issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`}
                                        size="small"
                                        sx={{
                                            backgroundColor: issue.wcagLevel === 'APCA' ? alpha(MSQDX_BRAND_PRIMARY.purple, 0.12) : alpha(MSQDX_STATUS.info.base, 0.12),
                                            color: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_STATUS.info.base,
                                            fontWeight: 600,
                                            fontSize: '0.6rem',
                                            height: 20,
                                        }}
                                    />
                                )}
                                <MsqdxChip
                                    label={issue.runner}
                                    size="small"
                                    sx={{
                                        backgroundColor: alpha(MSQDX_NEUTRAL[400], 0.1),
                                        color: MSQDX_THEME.dark.text.tertiary,
                                        fontSize: '0.6rem',
                                        height: 20,
                                    }}
                                />
                                {issue.code && (
                                    <MsqdxChip
                                        label={issue.code.length > 50 ? issue.code.slice(0, 50) + '…' : issue.code}
                                        size="small"
                                        sx={{
                                            backgroundColor: alpha(MSQDX_BRAND_PRIMARY.purple, 0.08),
                                            color: MSQDX_BRAND_PRIMARY.purple,
                                            fontSize: '0.55rem',
                                            height: 20,
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                }
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${MSQDX_SPACING.scale.sm}px` }}>
                    {issue.selector && (
                        <Box>
                            <MsqdxTypography
                                variant="caption"
                                sx={{
                                    color: MSQDX_THEME.dark.text.tertiary,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                }}
                            >
                                CSS Selector
                            </MsqdxTypography>

                            <Box
                                component="code"
                                sx={{
                                    display: 'block',
                                    mt: '4px',
                                    p: `${MSQDX_SPACING.scale.sm}px`,
                                    borderRadius: `${MSQDX_SPACING.borderRadius.sm}px`,
                                    backgroundColor: MSQDX_NEUTRAL[800],
                                    color: MSQDX_BRAND_PRIMARY.yellow,
                                    fontSize: '0.75rem',
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {issue.selector}
                            </Box>
                        </Box>
                    )}
                    {issue.context && (
                        <Box>
                            <MsqdxTypography
                                variant="caption"
                                sx={{
                                    color: MSQDX_THEME.dark.text.tertiary,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                }}
                            >
                                HTML Context
                            </MsqdxTypography>
                            <Box
                                component="pre"
                                sx={{
                                    mt: '4px',
                                    p: `${MSQDX_SPACING.scale.sm}px`,
                                    borderRadius: `${MSQDX_SPACING.borderRadius.sm}px`,
                                    backgroundColor: MSQDX_NEUTRAL[800],
                                    color: MSQDX_BRAND_PRIMARY.orange,
                                    fontSize: '0.75rem',
                                    overflowX: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {issue.context}
                            </Box>
                        </Box>
                    )}
                </Box>
            </MsqdxAccordionItem>
        </Box>
    );
});

ScanIssueItem.displayName = 'ScanIssueItem';
