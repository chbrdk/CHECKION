'use client';

import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';

export type PaginationBarProps = {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Optional: borderTop like dashboard lists */
  variant?: 'default' | 'minimal';
};

export function PaginationBar({ page, totalPages, onPrev, onNext, t, variant = 'default' }: PaginationBarProps) {
  const pageOf = t('dashboard.pageOf', { page: String(page), total: String(totalPages) });
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--msqdx-spacing-sm)',
        ...(variant === 'default' && {
          mt: 'var(--msqdx-spacing-md)',
          pt: 'var(--msqdx-spacing-sm)',
          borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
        }),
      }}
    >
      <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
        {pageOf}
      </MsqdxTypography>
      <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-xs)' }}>
        <MsqdxButton variant="outlined" size="small" onClick={onPrev} disabled={page <= 1}>
          {t('dashboard.prev')}
        </MsqdxButton>
        <MsqdxButton variant="outlined" size="small" onClick={onNext} disabled={page >= totalPages}>
          {t('dashboard.next')}
        </MsqdxButton>
      </Box>
    </Box>
  );
}

export type LoadMoreBarProps = {
  shown: number;
  total: number;
  pageSize: number;
  onLoadMore: () => void;
  label?: string;
  loadMoreLabel?: string;
};

export function LoadMoreBar({ shown, total, pageSize, onLoadMore, label, loadMoreLabel }: LoadMoreBarProps) {
  const hasMore = shown < total;
  const nextCount = Math.min(pageSize, total - shown);
  if (!hasMore || total <= pageSize) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        mt: 'var(--msqdx-spacing-sm)',
        pt: 'var(--msqdx-spacing-sm)',
        borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
      }}
    >
      <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
        {label ?? `${shown} von ${total} angezeigt`}
      </MsqdxTypography>
      <MsqdxButton variant="outlined" size="small" onClick={onLoadMore}>
        {loadMoreLabel ?? `${nextCount} weitere laden`}
      </MsqdxButton>
    </Box>
  );
}
