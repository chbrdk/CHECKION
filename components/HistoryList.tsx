'use client';

import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { Trash2 } from 'lucide-react';
import type { ScanResult } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';

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
  onDelete,
}: {
  scan: ScanResult;
  onClick: () => void;
  onDelete?: (id: string) => void;
}) {
  const { t } = useI18n();
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(scan.id);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <Box
      component="li"
      role="button"
      tabIndex={0}
      aria-label={t('dashboard.openScanAria', { url: scan.url })}
      sx={listItemSx}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <MsqdxTypography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
          {scan.url}
        </MsqdxTypography>
        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          <span suppressHydrationWarning>{new Date(scan.timestamp).toLocaleString('de-DE')}</span> · {scan.stats.errors} Errors
        </MsqdxTypography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
        <MsqdxChip
          label={scan.stats.errors > 0 ? String(scan.stats.errors) : '0'}
          size="small"
          sx={{
            backgroundColor: scan.stats.errors > 0 ? 'var(--color-secondary-dx-pink-tint)' : 'var(--color-secondary-dx-green-tint)',
            color: scan.stats.errors > 0 ? MSQDX_STATUS.error.base : MSQDX_BRAND_PRIMARY.green,
            fontWeight: 700,
          }}
        />
        {onDelete && (
          <MsqdxButton
            variant="text"
            size="small"
            onClick={handleDelete}
            aria-label={t('dashboard.deleteScanAria')}
            sx={{ minWidth: 32, p: 0.5, color: 'var(--color-text-muted-on-light)' }}
          >
            <Trash2 size={16} />
          </MsqdxButton>
        )}
      </Box>
    </Box>
  );
}

/** Domain scan summary row (same list style as results). */
export function DomainScanRow({
  item,
  onClick,
  onDelete,
}: {
  item: DomainScanSummary;
  onClick: () => void;
  onDelete?: (id: string) => void;
}) {
  const { t } = useI18n();
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(item.id);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  return (
    <Box
      component="li"
      role="button"
      tabIndex={0}
      aria-label={t('dashboard.openDomainScanAria', { domain: item.domain })}
      sx={listItemSx}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <MsqdxTypography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
          {item.domain}
        </MsqdxTypography>
        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          <span suppressHydrationWarning>{new Date(item.timestamp).toLocaleString('de-DE')}</span> · {item.totalPages} Seiten
        </MsqdxTypography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
        <MsqdxChip
          label={item.status === 'complete' ? String(item.score) : item.status}
          size="small"
          brandColor={item.status === 'complete' ? (item.score > 80 ? 'green' : 'orange') : undefined}
        />
        {onDelete && (
          <MsqdxButton
            variant="text"
            size="small"
            onClick={handleDelete}
            aria-label={t('dashboard.deleteDomainScanAria')}
            sx={{ minWidth: 32, p: 0.5, color: 'var(--color-text-muted-on-light)' }}
          >
            <Trash2 size={16} />
          </MsqdxButton>
        )}
      </Box>
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
 * Keeps list items in the DOM during loading (spinner only when no data yet) to avoid flicker on refetch/Strict Mode.
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
  const showSpinnerOnly = loading && itemCount === 0;
  const showChildren = itemCount > 0;

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {showSpinnerOnly && (
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
      {showChildren && (
        <>
          {loading && (
            <Box
              component="li"
              sx={{
                ...listItemSx,
                cursor: 'default',
                justifyContent: 'center',
                gap: 'var(--msqdx-spacing-sm)',
                py: 'var(--msqdx-spacing-xs)',
              }}
            >
              <CircularProgress size={16} sx={{ color: 'var(--color-theme-accent)' }} />
              <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                Aktualisiere…
              </MsqdxTypography>
            </Box>
          )}
          {children}
        </>
      )}
    </Box>
  );
}
