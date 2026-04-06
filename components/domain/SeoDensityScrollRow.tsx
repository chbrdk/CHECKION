'use client';

import React, { memo, useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { ExternalLink } from 'lucide-react';
import type { PageSeoSummary } from '@/lib/domain-aggregation';

export type SeoDensityScrollRowProps = {
    row: PageSeoSummary;
    locale: string;
    onOpenPageUrl: (url: string) => void;
    /** Passed from parent so virtualized rows do not each subscribe to i18n context. */
    t: (key: string, values?: Record<string, string | number>) => string;
};

/** Memoized row for VirtualScrollList — scroll position updates skip re-rendering unchanged rows. */
export const SeoDensityScrollRow = memo(function SeoDensityScrollRow({
    row,
    locale,
    onOpenPageUrl,
    t,
}: SeoDensityScrollRowProps) {
    const open = useCallback(() => onOpenPageUrl(row.url), [onOpenPageUrl, row.url]);
    const lc = locale === 'en' ? 'en-US' : 'de-DE';

    return (
        <Box
            sx={{
                width: '100%',
                boxSizing: 'border-box',
                mb: 0.75,
                px: 1,
                py: 0.75,
                border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                borderRadius: 1,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={row.url}>
                    {row.url}
                </MsqdxTypography>
                <Tooltip title={t('domainResult.openPage')}>
                    <IconButton size="small" aria-label={t('domainResult.openPageAria', { url: row.url })} onClick={open} sx={{ flexShrink: 0 }}>
                        <ExternalLink size={16} strokeWidth={2} aria-hidden />
                    </IconButton>
                </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5, rowGap: 0.5 }}>
                <MsqdxTypography variant="caption" component="span" sx={{ fontWeight: 600 }}>
                    {t('domainResult.seoWordCount', { count: row.wordCount.toLocaleString(lc) })}
                </MsqdxTypography>
                {row.topKeywordCount > 0 && (
                    <MsqdxTypography variant="caption" component="span" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('domainResult.seoTopKeywords', { count: row.topKeywordCount })}
                    </MsqdxTypography>
                )}
                {row.isSkinny && (
                    <MsqdxChip
                        label={t('domainResult.seoSkinnyChip')}
                        size="small"
                        sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            bgcolor: 'var(--color-secondary-dx-orange-tint)',
                            color: 'var(--color-secondary-dx-orange)',
                        }}
                    />
                )}
            </Box>
        </Box>
    );
});
