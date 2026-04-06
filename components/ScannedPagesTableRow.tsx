'use client';

import React, { memo, useCallback } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { SlimPage } from '@/lib/types';
import { MSQDX_BUTTON_THEME_ACCENT_SX } from '@/lib/theme-accent';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

export type ScannedPagesTableRowProps = {
    page: SlimPage;
    issuesCount: number;
    rowHeightPx: number;
    onPageClick?: (page: SlimPage) => void;
};

/**
 * Memoized row body — scroll-only parent updates skip re-rendering cell content when the SlimPage reference is unchanged.
 */
export const ScannedPagesTableRow = memo(function ScannedPagesTableRow({
    page,
    issuesCount,
    rowHeightPx,
    onPageClick,
}: ScannedPagesTableRowProps) {
    const { t } = useI18n();
    const handleOpen = useCallback(() => onPageClick?.(page), [onPageClick, page]);

    return (
        <Box
            component="div"
            role="row"
            sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(180px, 2fr) 80px 90px 80px 90px',
                gap: 0,
                borderBottom: tableBorder,
                alignItems: 'stretch',
                minHeight: rowHeightPx,
                '&:hover': { backgroundColor: 'var(--color-theme-accent-tint, rgba(0,0,0,0.04))' },
            }}
        >
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', minWidth: 0, borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" noWrap title={page.url} sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                    {page.url}
                </MsqdxTypography>
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxChip
                    label={String(page.score ?? 0)}
                    size="small"
                    brandColor={page.score > 80 ? 'green' : 'orange'}
                    sx={{ fontSize: '0.7rem', height: 20, minHeight: 20 }}
                />
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {page.ux?.score ?? '–'}
                </MsqdxTypography>
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    {issuesCount}
                </MsqdxTypography>
            </Box>
            <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {onPageClick && (
                    <MsqdxButton
                        size="small"
                        variant="text"
                        onClick={handleOpen}
                        aria-label={t('domainResult.openPageAria', { url: page.url })}
                        sx={{ ...MSQDX_BUTTON_THEME_ACCENT_SX, textTransform: 'none', fontSize: '0.7rem' }}
                    >
                        {t('domainResult.openPage')}
                    </MsqdxButton>
                )}
            </Box>
        </Box>
    );
});
