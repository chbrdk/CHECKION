'use client';

import React, { memo, useCallback } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL, MSQDX_STATUS, MSQDX_THEME } from '@msqdx/tokens';
import { ExternalLink } from 'lucide-react';
import type { AggregatedIssue } from '@/lib/domain-aggregation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { THEME_ACCENT_CSS } from '@/lib/theme-accent';

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
    error: { label: 'Error', color: MSQDX_STATUS.error.base },
    warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
    notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;
const GRID_COLUMNS = '70px minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 92px 48px';

export type AggregatedIssueTableRowProps = {
    issue: AggregatedIssue;
    onPageClick?: (url: string) => void;
};

export const AggregatedIssueTableRow = memo(function AggregatedIssueTableRow({ issue, onPageClick }: AggregatedIssueTableRowProps) {
    const { t } = useI18n();
    const config = SEVERITY_CONFIG[issue.type] ?? SEVERITY_CONFIG.notice;
    const levelLabel = issue.wcagLevel === 'Unknown' ? '–' : issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`;
    const codeShort = issue.code.length > 48 ? issue.code.slice(0, 48) + '…' : issue.code;
    const firstUrl = issue.pageUrls?.[0];
    const openFirst = useCallback(() => {
        if (firstUrl) onPageClick?.(firstUrl);
    }, [firstUrl, onPageClick]);

    return (
        <Box
            component="div"
            role="row"
            sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLUMNS,
                gap: 0,
                borderBottom: tableBorder,
                alignItems: 'stretch',
                '&:hover': { backgroundColor: alpha(config.color, 0.08) },
            }}
        >
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, borderRight: tableBorder }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.color, flexShrink: 0 }} />
                <MsqdxChip
                    label={config.label}
                    size="small"
                    sx={{
                        backgroundColor: alpha(config.color, 0.12),
                        color: config.color,
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 18,
                        minHeight: 18,
                    }}
                />
            </Box>
            <Box sx={{ px: 1, py: 0.5, minWidth: 0, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontWeight: 500, lineHeight: 1.3, fontSize: '0.75rem' }}>
                    {issue.message}
                </MsqdxTypography>
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                {issue.wcagLevel !== 'Unknown' && (
                    <MsqdxChip
                        label={levelLabel}
                        size="small"
                        sx={{
                            backgroundColor:
                                issue.wcagLevel === 'APCA' ? alpha(MSQDX_BRAND_PRIMARY.purple, 0.12) : alpha(MSQDX_STATUS.info.base, 0.12),
                            color: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_STATUS.info.base,
                            fontSize: '0.65rem',
                            height: 18,
                            minHeight: 18,
                        }}
                    />
                )}
                {issue.wcagLevel === 'Unknown' && (
                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.light.text.tertiary, fontSize: '0.75rem' }}>
                        –
                    </MsqdxTypography>
                )}
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxChip label={issue.runner} size="small" sx={{ fontSize: '0.65rem', height: 18, minHeight: 18 }} />
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}>
                    {codeShort}
                </MsqdxTypography>
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxChip
                    label={`${issue.pageCount} ${t('domainResult.issuesTablePages')}`}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 18, minHeight: 18 }}
                />
                {firstUrl && onPageClick && (
                    <MsqdxTypography
                        component="button"
                        variant="caption"
                        aria-label={t('domainResult.openPageAria', { url: firstUrl })}
                        sx={{
                            ml: 0.5,
                            cursor: 'pointer',
                            color: THEME_ACCENT_CSS,
                            textDecoration: 'underline',
                            border: 'none',
                            background: 'none',
                            fontSize: '0.7rem',
                        }}
                        onClick={openFirst}
                    >
                        {t('domainResult.openPage')}
                    </MsqdxTypography>
                )}
            </Box>
            <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {issue.helpUrl && (
                    <a
                        href={issue.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('results.fixDocsAria')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: THEME_ACCENT_CSS,
                            padding: 4,
                            borderRadius: 4,
                        }}
                        className="fix-docs-link"
                    >
                        <ExternalLink size={16} strokeWidth={2} />
                    </a>
                )}
            </Box>
        </Box>
    );
});
