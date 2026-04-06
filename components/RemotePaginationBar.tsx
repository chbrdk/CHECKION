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
    labels: {
        prev: string;
        next: string;
    };
};

export function RemotePaginationBar({ page, pageSize, total, loading, onPageChange, labels }: RemotePaginationBarProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    const displayPage = safePage + 1;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 1, mb: 0.5 }}>
            <MsqdxButton size="small" variant="outlined" disabled={loading || safePage <= 0} onClick={() => onPageChange(safePage - 1)}>
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
