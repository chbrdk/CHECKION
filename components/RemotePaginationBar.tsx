'use client';

import { Box } from '@mui/material';
import { MsqdxButton, MsqdxTypography } from '@msqdx/react';

export type RemotePaginationBarProps = {
    /** Zero-based page index */
    page: number;
    pageSize: number;
    total: number;
    loading?: boolean;
    onPageChange: (nextPage: number) => void;
    /** When set, prev uses this instead of offset math (keyset / cursor pagination). */
    onPrevCursor?: () => void;
    /** Disable prev (e.g. at start of cursor chain). Ignored when onPrevCursor is unset. */
    disablePrevCursor?: boolean;
    labels: {
        prev: string;
        next: string;
    };
};

export function RemotePaginationBar({
    page,
    pageSize,
    total,
    loading,
    onPageChange,
    onPrevCursor,
    disablePrevCursor,
    labels,
}: RemotePaginationBarProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    const displayPage = safePage + 1;
    const useCursorPrev = Boolean(onPrevCursor);
    const prevDisabled = useCursorPrev
        ? loading || Boolean(disablePrevCursor)
        : loading || safePage <= 0;
    const handlePrev = () => {
        if (useCursorPrev && onPrevCursor) onPrevCursor();
        else onPageChange(safePage - 1);
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1, mb: 0.5 }}>
            <MsqdxButton size="small" variant="outlined" disabled={prevDisabled} onClick={handlePrev}>
                {labels.prev}
            </MsqdxButton>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {displayPage} / {totalPages} · {total.toLocaleString()}
            </MsqdxTypography>
            <MsqdxButton
                size="small"
                variant="outlined"
                disabled={loading || safePage >= totalPages - 1}
                onClick={() => onPageChange(safePage + 1)}
            >
                {labels.next}
            </MsqdxButton>
        </Box>
    );
}
