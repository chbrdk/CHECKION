'use client';

import React, { memo, useCallback, useMemo } from 'react';
import { MsqdxButton } from '@msqdx/react';
import type { AggregatedGenerative } from '@/lib/domain-aggregation';

export type GenerativePageScrollRowProps = {
    page: AggregatedGenerative['pages'][number];
    onOpenPageUrl: (url: string) => void;
};

/** Memoized row for VirtualScrollList (GEO per-page list). */
export const GenerativePageScrollRow = memo(function GenerativePageScrollRow({ page, onOpenPageUrl }: GenerativePageScrollRowProps) {
    const badges = useMemo(
        () => [`Score ${page.score}`, page.hasLlmsTxt && 'llms.txt', page.hasRecommendedSchema && 'Schema'].filter(Boolean).join(' · '),
        [page.score, page.hasLlmsTxt, page.hasRecommendedSchema]
    );
    const open = useCallback(() => onOpenPageUrl(page.url), [onOpenPageUrl, page.url]);

    return (
        <MsqdxButton
            size="small"
            variant="text"
            onClick={open}
            sx={{ textTransform: 'none', fontSize: '0.8rem', display: 'block', width: '100%', justifyContent: 'flex-start', py: 0.25 }}
        >
            {page.url} — {badges || '—'}
        </MsqdxButton>
    );
});
