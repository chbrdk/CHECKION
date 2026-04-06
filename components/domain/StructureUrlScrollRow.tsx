'use client';

import React, { memo, useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { ExternalLink } from 'lucide-react';

export type StructureUrlScrollRowProps = {
    url: string;
    t: (key: string, values?: Record<string, string>) => string;
    onOpenPageUrl: (url: string) => void;
};

/** Memoized URL row for VirtualScrollList (structure tab). */
export const StructureUrlScrollRow = memo(function StructureUrlScrollRow({ url, t, onOpenPageUrl }: StructureUrlScrollRowProps) {
    const open = useCallback(() => onOpenPageUrl(url), [onOpenPageUrl, url]);

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', py: 0.25, pr: 0.5 }}>
            <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={url}>
                {url}
            </MsqdxTypography>
            <Tooltip title={t('domainResult.openPage')}>
                <IconButton size="small" aria-label={t('domainResult.openPageAria', { url })} onClick={open} sx={{ flexShrink: 0 }}>
                    <ExternalLink size={16} strokeWidth={2} aria-hidden />
                </IconButton>
            </Tooltip>
        </Box>
    );
});
