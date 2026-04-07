'use client';

import React, { memo, useCallback } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import type { AggregatedGenerative } from '@/lib/domain-aggregation';
import { formatUrlForList } from '@/lib/format-url-display';
import { THEME_ACCENT_CSS, THEME_ACCENT_TINT_CSS } from '@/lib/theme-accent';

export type GenerativePageScrollRowProps = {
    page: AggregatedGenerative['pages'][number];
    onOpenPageUrl: (url: string) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
};

const CHIP_SX = {
    flexShrink: 0,
    fontSize: '0.7rem',
    height: 24,
    bgcolor: 'var(--color-card-bg) !important',
    border: '1px solid var(--color-secondary-dx-grey-light-tint) !important',
    color: 'var(--color-text-on-light) !important',
} as const;

/** Row for VirtualScrollList (GEO per page) — matches UX/Structure URL row pattern. */
export const GenerativePageScrollRow = memo(function GenerativePageScrollRow({
    page,
    onOpenPageUrl,
    t,
}: GenerativePageScrollRowProps) {
    const display = formatUrlForList(page.url);
    const open = useCallback(() => onOpenPageUrl(page.url), [onOpenPageUrl, page.url]);
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
            }
        },
        [open]
    );

    return (
        <Box
            role="button"
            tabIndex={0}
            aria-label={t('domainResult.generativeRowOpenAria', { url: page.url })}
            onClick={open}
            onKeyDown={handleKeyDown}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                py: 1,
                px: 1.25,
                borderRadius: 'var(--msqdx-radius-md)',
                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background-color 120ms ease, border-color 120ms ease',
                '&:hover': {
                    bgcolor: THEME_ACCENT_TINT_CSS,
                    borderColor: THEME_ACCENT_CSS,
                },
                '&:focus-visible': {
                    boxShadow: `0 0 0 2px ${THEME_ACCENT_TINT_CSS}`,
                    borderColor: THEME_ACCENT_CSS,
                },
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <MsqdxTypography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        lineHeight: 1.35,
                        color: THEME_ACCENT_CSS,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={page.url}
                >
                    {display}
                </MsqdxTypography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end', flexShrink: 0 }}>
                <MsqdxChip label={t('domainResult.generativeRowScoreChip', { score: page.score })} size="small" sx={CHIP_SX} />
                {page.hasLlmsTxt ? (
                    <MsqdxChip label={t('domainResult.generativeRowLlmsChip')} size="small" sx={CHIP_SX} />
                ) : null}
                {page.hasRecommendedSchema ? (
                    <MsqdxChip label={t('domainResult.generativeRowSchemaChip')} size="small" sx={CHIP_SX} />
                ) : null}
            </Box>
        </Box>
    );
});
