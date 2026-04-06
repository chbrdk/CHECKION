'use client';

import React, { memo, useCallback } from 'react';
import { MsqdxButton } from '@msqdx/react';

export type VisualUxUrlCountScrollRowProps = {
    url: string;
    count: number;
    /** `focus`: "(count)"; `tap`: "(count Probleme)" */
    variant: 'focus' | 'tap';
    onOpenPageUrl: (url: string) => void;
};

/** Memoized row for VirtualScrollList (visual analysis focus / tap target lists). */
export const VisualUxUrlCountScrollRow = memo(function VisualUxUrlCountScrollRow({
    url,
    count,
    variant,
    onOpenPageUrl,
}: VisualUxUrlCountScrollRowProps) {
    const open = useCallback(() => onOpenPageUrl(url), [onOpenPageUrl, url]);
    const label =
        variant === 'tap' ? `${url} (${count} Probleme)` : `${url} (${count})`;

    return (
        <MsqdxButton
            size="small"
            variant="outlined"
            onClick={open}
            sx={{ textTransform: 'none', display: 'block', width: '100%', justifyContent: 'flex-start', mb: 0.5 }}
        >
            {label}
        </MsqdxButton>
    );
});
