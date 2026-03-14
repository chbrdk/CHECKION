'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { SEO_TABLE_PAGE_SIZE } from '@/lib/constants';
import type { CrossPageKeyword } from '@/lib/domain-aggregation';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;
const GRID_COLUMNS = 'minmax(100px, 2fr) 90px 80px 90px';

type SortKey = 'keyword' | 'totalCount' | 'pageCount' | 'avgDensityPercent';
type SortDir = 'asc' | 'desc';

function SortHeader({
  id,
  label,
  active,
  sortDir,
  onSort,
}: {
  id: SortKey;
  label: string;
  active: boolean;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      role="columnheader"
      onClick={() => onSort(id)}
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
        textAlign: 'left',
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
}

export function SeoKeywordsTable({ keywords }: { keywords: CrossPageKeyword[] }) {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('totalCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = [...keywords];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'keyword':
          cmp = a.keyword.localeCompare(b.keyword);
          break;
        case 'totalCount':
          cmp = a.totalCount - b.totalCount;
          break;
        case 'pageCount':
          cmp = a.pageCount - b.pageCount;
          break;
        case 'avgDensityPercent':
          cmp = a.avgDensityPercent - b.avgDensityPercent;
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [keywords, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / SEO_TABLE_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * SEO_TABLE_PAGE_SIZE;
  const pageRows = useMemo(
    () => sorted.slice(start, start + SEO_TABLE_PAGE_SIZE),
    [sorted, start]
  );

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortDir(key === 'keyword' ? 'asc' : 'desc');
        setCurrentPage(1);
      }
      return key;
    });
  }, []);

  if (keywords.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('projects.seo.tableEmpty')}
        </MsqdxTypography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, isolation: 'isolate' }}>
      <Box
        sx={{
          border: tableBorder,
          borderRadius: 1,
          overflow: 'auto',
          maxHeight: 480,
          backgroundColor: MSQDX_THEME.light.surface.primary,
          contain: 'layout',
        }}
      >
        <Box component="div" role="table" aria-label={t('projects.seo.keywordsTableTitle')} sx={{ minHeight: 32 + pageRows.length * 36 }}>
          <Box
            component="div"
            role="row"
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLUMNS,
              gap: 0,
              borderBottom: tableBorder,
              backgroundColor: MSQDX_NEUTRAL[100],
              alignItems: 'center',
              minHeight: 32,
              position: 'sticky',
              top: 0,
              zIndex: 2,
              isolation: 'isolate',
            }}
          >
            <SortHeader id="keyword" label={t('projects.seo.keywordsColKeyword')} active={sortKey === 'keyword'} sortDir={sortDir} onSort={handleSort} />
            <SortHeader id="totalCount" label={t('projects.seo.keywordsColCount')} active={sortKey === 'totalCount'} sortDir={sortDir} onSort={handleSort} />
            <SortHeader id="pageCount" label={t('projects.seo.keywordsColPages')} active={sortKey === 'pageCount'} sortDir={sortDir} onSort={handleSort} />
            <SortHeader id="avgDensityPercent" label={t('projects.seo.keywordsColAvgDensity')} active={sortKey === 'avgDensityPercent'} sortDir={sortDir} onSort={handleSort} />
          </Box>
          {pageRows.map((row) => (
            <Box
              key={row.keyword}
              component="div"
              role="row"
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLUMNS,
                gap: 0,
                borderBottom: tableBorder,
                alignItems: 'center',
                minHeight: 36,
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
              }}
            >
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem', fontWeight: 500 }}>{row.keyword}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{row.totalCount.toLocaleString('de-DE')}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{row.pageCount}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{row.avgDensityPercent}%</Box>
            </Box>
          ))}
        </Box>
      </Box>
      {keywords.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, mt: 1, px: 0.5, py: 0.25 }}>
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem' }}>
            {t('share.pageOfTotal', { current: String(safePage), total: String(totalPages), count: String(keywords.length) })}
          </MsqdxTypography>
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <MsqdxButton
                size="small"
                variant="outlined"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label={t('domainResult.pagesTablePrev')}
                sx={{ minWidth: 28, p: 0.5, minHeight: 28 }}
              >
                <ChevronLeft size={14} />
              </MsqdxButton>
              <MsqdxButton
                size="small"
                variant="outlined"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label={t('domainResult.pagesTableNext')}
                sx={{ minWidth: 28, p: 0.5, minHeight: 28 }}
              >
                <ChevronRight size={14} />
              </MsqdxButton>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
