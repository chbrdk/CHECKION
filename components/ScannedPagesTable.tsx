'use client';

import React, { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { SlimPage } from '@/lib/types';
import { DOMAIN_PAGES_TABLE_PAGE_SIZE } from '@/lib/constants';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

type SortKey = 'url' | 'score' | 'uxScore' | 'issues';
type SortDir = 'asc' | 'desc';

function getIssuesCount(page: SlimPage): number {
  return (page.stats?.errors ?? 0) + (page.stats?.warnings ?? 0) + (page.stats?.notices ?? 0);
}

export function ScannedPagesTable({
  pages,
  onPageClick,
  pageSize = DOMAIN_PAGES_TABLE_PAGE_SIZE,
}: {
  pages: SlimPage[];
  onPageClick?: (page: SlimPage) => void;
  pageSize?: number;
}) {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('url');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedPages = useMemo(() => {
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
  }, [pages, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedPages.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedRows = useMemo(
    () => sortedPages.slice(start, start + pageSize),
    [sortedPages, start, pageSize]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const SortHeader = ({
    id,
    label,
    active,
  }: {
    id: SortKey;
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
        px: 1.5,
        py: 1,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        font: 'inherit',
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
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <Box
        sx={{
          border: tableBorder,
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: '65vh',
          backgroundColor: MSQDX_THEME.light.surface.primary,
        }}
      >
        <Box component="div" role="table" aria-label={t('domainResult.scannedPages')}>
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
              minHeight: 44,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <SortHeader id="url" label={t('domainResult.pagesTableUrl')} active={sortKey === 'url'} />
            <SortHeader id="score" label={t('domainResult.pagesTableScore')} active={sortKey === 'score'} />
            <SortHeader id="uxScore" label={t('domainResult.pagesTableUxScore')} active={sortKey === 'uxScore'} />
            <SortHeader id="issues" label={t('domainResult.pagesTableIssues')} active={sortKey === 'issues'} />
            <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }} />
          </Box>
          {paginatedRows.map((page) => {
            const issuesCount = getIssuesCount(page);
            return (
              <Box
                key={page.id}
                component="div"
                role="row"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(180px, 2fr) 80px 90px 80px 90px',
                  gap: 0,
                  borderBottom: tableBorder,
                  alignItems: 'stretch',
                  '&:last-of-type': { borderBottom: 'none' },
                  '&:hover': { backgroundColor: 'var(--color-theme-accent-tint, rgba(0,0,0,0.04))' },
                }}
              >
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', minWidth: 0, borderRight: tableBorder }}>
                  <MsqdxTypography variant="body2" noWrap title={page.url} sx={{ fontWeight: 500 }}>
                    {page.url}
                  </MsqdxTypography>
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxChip
                    label={String(page.score ?? 0)}
                    size="small"
                    brandColor={page.score > 80 ? 'green' : 'orange'}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxTypography variant="body2">{page.ux?.score ?? '–'}</MsqdxTypography>
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxTypography variant="body2">{issuesCount}</MsqdxTypography>
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {onPageClick && (
                    <MsqdxButton
                      size="small"
                      variant="text"
                      onClick={() => onPageClick(page)}
                      aria-label={t('domainResult.openPageAria', { url: page.url })}
                      sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                    >
                      {t('domainResult.openPage')}
                    </MsqdxButton>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            mt: 1.5,
            px: 0.5,
          }}
        >
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
            {t('share.pageOfTotal', {
              current: String(safePage),
              total: String(totalPages),
              count: String(pages.length),
            })}
          </MsqdxTypography>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MsqdxButton
                size="small"
                variant="outlined"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label={t('domainResult.pagesTablePrev')}
                sx={{ minWidth: 36, p: 0.75 }}
              >
                <ChevronLeft size={18} />
              </MsqdxButton>
              <MsqdxButton
                size="small"
                variant="outlined"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('domainResult.pagesTableNext')}
                sx={{ minWidth: 36, p: 0.75 }}
              >
                <ChevronRight size={18} />
              </MsqdxButton>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
