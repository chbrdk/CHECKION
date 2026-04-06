'use client';

import React, { memo, useCallback, useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@mui/material';
import { MsqdxTypography } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { SlimPage } from '@/lib/types';
import { ScannedPagesTableRow } from '@/components/ScannedPagesTableRow';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

/** Fixed row height for virtualization (avoids measureElement thrash). */
export const SCANNED_PAGES_ROW_ESTIMATE_PX = 44;
const SCANNED_PAGES_VIRTUAL_OVERSCAN = 10;

export type ScannedPagesSortKey = 'url' | 'score' | 'uxScore' | 'issues';
type SortDir = 'asc' | 'desc';

function getIssuesCount(page: SlimPage): number {
  return (page.stats?.errors ?? 0) + (page.stats?.warnings ?? 0) + (page.stats?.notices ?? 0);
}

function ScannedPagesTableInner({
  pages,
  onPageClick,
  serverSort = false,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  paginationFooter,
}: {
  pages: SlimPage[];
  onPageClick?: (page: SlimPage) => void;
  serverSort?: boolean;
  sortKey?: ScannedPagesSortKey;
  sortDir?: SortDir;
  onSortChange?: (key: ScannedPagesSortKey) => void;
  paginationFooter?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [localSortKey, setLocalSortKey] = useState<ScannedPagesSortKey>('url');
  const [localSortDir, setLocalSortDir] = useState<SortDir>('asc');
  const sortKey = serverSort && controlledSortKey != null ? controlledSortKey : localSortKey;
  const sortDir = serverSort && controlledSortDir != null ? controlledSortDir : localSortDir;
  const parentRef = useRef<HTMLDivElement>(null);

  const sortedPages = useMemo(() => {
    if (serverSort) return pages;
    const arr = [...pages];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'url':
          cmp = (a.url ?? '').localeCompare(b.url ?? '');
          break;
        case 'score':
          cmp = (a.score ?? 0) - (b.score ?? 0);
          break;
        case 'uxScore':
          cmp = (a.ux?.score ?? 0) - (b.ux?.score ?? 0);
          break;
        case 'issues':
          cmp = getIssuesCount(a) - getIssuesCount(b);
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [pages, sortKey, sortDir, serverSort]);

  const virtualizer = useVirtualizer({
    count: sortedPages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SCANNED_PAGES_ROW_ESTIMATE_PX,
    overscan: SCANNED_PAGES_VIRTUAL_OVERSCAN,
    getItemKey: (index) => sortedPages[index]?.id ?? index,
  });

  const handleSort = useCallback(
    (key: ScannedPagesSortKey) => {
      if (serverSort) {
        onSortChange?.(key);
        return;
      }
      if (sortKey === key) {
        setLocalSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setLocalSortKey(key);
        setLocalSortDir('asc');
      }
    },
    [serverSort, onSortChange, sortKey]
  );

  const SortHeader = ({
    id,
    label,
    active,
  }: {
    id: ScannedPagesSortKey;
    label: string;
    active: boolean;
  }) => (
    <Box
      component="button"
      role="columnheader"
      onClick={() => handleSort(id)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        font: 'inherit',
        fontSize: '0.7rem',
        color: MSQDX_THEME.light.text.tertiary,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        '&:hover': { color: MSQDX_THEME.light.text.secondary },
      }}
    >
      {label}
      {active && (
        <MsqdxTypography variant="caption" sx={{ opacity: 0.8 }}>
          {sortDir === 'asc' ? '↑' : '↓'}
        </MsqdxTypography>
      )}
    </Box>
  );

  if (pages.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('domainResult.noPages')}
        </MsqdxTypography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: '1 1 auto' }}>
      <Box
        sx={{
          border: tableBorder,
          borderRadius: 1,
          overflow: 'hidden',
          maxHeight: '65vh',
          backgroundColor: MSQDX_THEME.light.surface.primary,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          flex: '1 1 auto',
        }}
      >
        <Box
          component="div"
          role="row"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 2fr) 80px 90px 80px 90px',
            gap: 0,
            borderBottom: tableBorder,
            backgroundColor: MSQDX_NEUTRAL[100],
            alignItems: 'center',
            minHeight: 32,
            flexShrink: 0,
          }}
        >
          <SortHeader id="url" label={t('domainResult.pagesTableUrl')} active={sortKey === 'url'} />
          <SortHeader id="score" label={t('domainResult.pagesTableScore')} active={sortKey === 'score'} />
          <SortHeader id="uxScore" label={t('domainResult.pagesTableUxScore')} active={sortKey === 'uxScore'} />
          <SortHeader id="issues" label={t('domainResult.pagesTableIssues')} active={sortKey === 'issues'} />
          <Box component="div" role="columnheader" sx={{ px: 1, py: 0.5 }} />
        </Box>
        <Box
          ref={parentRef}
          component="div"
          aria-label={t('domainResult.scannedPages')}
          sx={{
            overflow: 'auto',
            flex: '1 1 auto',
            minHeight: 0,
            maxHeight: 'calc(65vh - 32px)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <Box
            sx={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              width: '100%',
            }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const page = sortedPages[vi.index];
              if (!page) return null;
              const issuesCount = getIssuesCount(page);
              return (
                <Box
                  key={vi.key}
                  data-index={vi.index}
                  component="div"
                  role="presentation"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: vi.size,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <ScannedPagesTableRow
                    page={page}
                    issuesCount={issuesCount}
                    rowHeightPx={vi.size}
                    onPageClick={onPageClick}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      {paginationFooter ?? (
        <Box sx={{ mt: 1, px: 0.5 }}>
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem' }}>
            {sortedPages.length.toLocaleString()} {t('domainResult.pagesScanned')}
          </MsqdxTypography>
        </Box>
      )}
    </Box>
  );
}

/** Memoized: avoids re-rendering the full table when parent passes stable props (e.g. same pages reference). */
export const ScannedPagesTable = memo(ScannedPagesTableInner);
