'use client';

import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import type { ScanResult } from '@/lib/types';

export type DomainScanSummary = { id: string; domain: string; timestamp: string; status: string; score: number; totalPages: number };

const listItemSx = {
  cursor: 'pointer',
  '&:hover': { bgcolor: 'var(--color-theme-accent-tint)' },
  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
  borderRadius: 'var(--msqdx-radius-sm)',
  mb: 'var(--msqdx-spacing-xs)',
  p: 'var(--msqdx-spacing-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--msqdx-spacing-sm)',
} as const;

/** Single-URL scan row (same list style as domain "Scanned Pages" / results). */
export function SingleScanRow({
  scan,
  onClick,
}: {
  scan: ScanResult;
  onClick: () => void;
}) {
  return (
    <Box component="li" sx={listItemSx} onClick={onClick}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <MsqdxTypography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
          {scan.url}
        </MsqdxTypography>
        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {new Date(scan.timestamp).toLocaleString('de-DE')} · {scan.stats.errors} Errors
        </MsqdxTypography>
      </Box>
      <MsqdxChip
        label={scan.stats.errors > 0 ? String(scan.stats.errors) : '0'}
        size="small"
        sx={{
          backgroundColor: scan.stats.errors > 0 ? 'var(--color-secondary-dx-pink-tint)' : 'var(--color-secondary-dx-green-tint)',
          color: scan.stats.errors > 0 ? MSQDX_STATUS.error.base : MSQDX_BRAND_PRIMARY.green,
          fontWeight: 700,
        }}
      />
    </Box>
  );
}

/** Domain scan summary row (same list style as results). */
export function DomainScanRow({
  item,
  onClick,
}: {
  item: DomainScanSummary;
  onClick: () => void;
}) {
  return (
    <Box component="li" sx={listItemSx} onClick={onClick}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <MsqdxTypography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
          {item.domain}
        </MsqdxTypography>
        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {new Date(item.timestamp).toLocaleString('de-DE')} · {item.totalPages} Seiten
        </MsqdxTypography>
      </Box>
      <MsqdxChip
        label={item.status === 'complete' ? String(item.score) : item.status}
        size="small"
        brandColor={item.status === 'complete' ? (item.score > 80 ? 'green' : 'orange') : undefined}
      />
    </Box>
  );
}

interface HistoryListProps {
  loading: boolean;
  itemCount: number;
  emptyMessage: string;
  emptyActionLabel: string;
  onEmptyAction: () => void;
  children: React.ReactNode;
}

/**
 * Wrapper for scan history: same ul/li structure as domain "Scanned Pages" and results.
 * Keeps layout stable (no spinner → grid swap) to avoid flicker.
 */
export function HistoryList({
  loading,
  itemCount,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  children,
}: HistoryListProps) {
  const showEmpty = !loading && itemCount === 0;
  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {loading && (
        <Box
          component="li"
          sx={{
            ...listItemSx,
            cursor: 'default',
            justifyContent: 'center',
            gap: 'var(--msqdx-spacing-sm)',
          }}
        >
          <CircularProgress size={20} sx={{ color: 'var(--color-theme-accent)' }} />
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
            Laden…
          </MsqdxTypography>
        </Box>
      )}
      {showEmpty && (
        <Box
          component="li"
          sx={{
            ...listItemSx,
            cursor: 'default',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            py: 'var(--msqdx-spacing-lg)',
          }}
        >
          <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-sm)' }}>
            {emptyMessage}
          </MsqdxTypography>
          <MsqdxButton variant="outlined" brandColor="green" size="small" onClick={onEmptyAction}>
            {emptyActionLabel}
          </MsqdxButton>
        </Box>
      )}
      {!loading && itemCount > 0 && children}
    </Box>
  );
}
