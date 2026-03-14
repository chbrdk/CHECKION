'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { DOMAIN_ISSUES_TABLE_PAGE_SIZE } from '@/lib/constants';
import type { PageSeoSummary } from '@/lib/domain-aggregation';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

/** URL | Words | Keywords | Skinny | Meta | H1 | Structure */
const GRID_COLUMNS = 'minmax(140px, 1.5fr) 72px 72px 56px 48px 48px 100px';

export type StructureStatus = 'good' | 'multipleH1' | 'skippedLevels';

export interface SeoOnPageRow extends PageSeoSummary {
  structure: StructureStatus;
}

type SortKey = 'url' | 'wordCount' | 'topKeywordCount' | 'isSkinny' | 'hasMeta' | 'hasH1' | 'structure';
type SortDir = 'asc' | 'desc';

const structureOrder: Record<StructureStatus, number> = { good: 0, skippedLevels: 1, multipleH1: 2 };

function SeoOnPageTableInner({
  rows,
  onRowClick,
  pageSize = DOMAIN_ISSUES_TABLE_PAGE_SIZE,
}: {
  rows: SeoOnPageRow[];
  onRowClick?: (url: string) => void;
  pageSize?: number;
}) {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('wordCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'url':
          cmp = a.url.localeCompare(b.url);
          break;
        case 'wordCount':
          cmp = a.wordCount - b.wordCount;
          break;
        case 'topKeywordCount':
          cmp = a.topKeywordCount - b.topKeywordCount;
          break;
        case 'isSkinny':
          cmp = (a.isSkinny ? 1 : 0) - (b.isSkinny ? 1 : 0);
          break;
        case 'hasMeta':
          cmp = (a.hasMeta ? 1 : 0) - (b.hasMeta ? 1 : 0);
          break;
        case 'hasH1':
          cmp = (a.hasH1 ? 1 : 0) - (b.hasH1 ? 1 : 0);
          break;
        case 'structure':
          cmp = structureOrder[a.structure] - structureOrder[b.structure];
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedRows = useMemo(
    () => sortedRows.slice(start, start + pageSize),
    [sortedRows, start, pageSize]
  );

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'SeoOnPageTable.tsx',message:'table rows',data:{rowsLength:rows.length,paginatedLength:paginatedRows.length,totalPages},timestamp:Date.now(),hypothesisId:'D',runId:'table-rows'})}).catch(()=>{});
  }, [rows.length, paginatedRows.length, totalPages]);
  // #endregion

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'url' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  const SortHeader = ({ id, label, active }: { id: SortKey; label: string; active: boolean }) => (
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

  const structureLabel = (s: StructureStatus) => {
    if (s === 'good') return t('projects.seo.structureGood');
    if (s === 'multipleH1') return t('projects.seo.structureMultipleH1');
    return t('projects.seo.structureSkippedLevels');
  };

  if (rows.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('projects.seo.tableEmpty')}
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
        <Box component="div" role="table" aria-label={t('projects.seo.tableAria')}>
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
              zIndex: 1,
            }}
          >
            <SortHeader id="url" label={t('projects.seo.tableUrl')} active={sortKey === 'url'} />
            <SortHeader id="wordCount" label={t('projects.seo.tableWords')} active={sortKey === 'wordCount'} />
            <SortHeader id="topKeywordCount" label={t('projects.seo.tableKeywords')} active={sortKey === 'topKeywordCount'} />
            <SortHeader id="isSkinny" label={t('projects.seo.tableSkinny')} active={sortKey === 'isSkinny'} />
            <SortHeader id="hasMeta" label={t('projects.seo.tableMeta')} active={sortKey === 'hasMeta'} />
            <SortHeader id="hasH1" label={t('projects.seo.tableH1')} active={sortKey === 'hasH1'} />
            <SortHeader id="structure" label={t('projects.seo.tableStructure')} active={sortKey === 'structure'} />
          </Box>
          {paginatedRows.map((row) => (
            <Box
              key={row.url}
              component="div"
              role="row"
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLUMNS,
                gap: 0,
                borderBottom: tableBorder,
                alignItems: 'stretch',
                '&:last-of-type': { borderBottom: 'none' },
                '&:hover': { backgroundColor: alpha(MSQDX_NEUTRAL[500], 0.06) },
              }}
            >
              <Box sx={{ px: 1, py: 0.5, minWidth: 0, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                {onRowClick ? (
                  <MsqdxButton
                    size="small"
                    variant="text"
                    onClick={() => onRowClick(row.url)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '0.75rem',
                      justifyContent: 'flex-start',
                      minWidth: 0,
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {row.url}
                  </MsqdxButton>
                ) : (
                  <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                    {row.url}
                  </MsqdxTypography>
                )}
              </Box>
              <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.75rem' }}>
                  {row.wordCount.toLocaleString('de-DE')}
                </MsqdxTypography>
              </Box>
              <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.75rem' }}>{row.topKeywordCount}</MsqdxTypography>
              </Box>
              <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                {row.isSkinny ? (
                  <MsqdxChip label={t('projects.seo.skinny')} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha(MSQDX_STATUS.warning.base, 0.15), color: MSQDX_STATUS.warning.base }} />
                ) : (
                  <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.light.text.tertiary, fontSize: '0.7rem' }}>–</MsqdxTypography>
                )}
              </Box>
              <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>{row.hasMeta ? t('projects.seo.tableYes') : t('projects.seo.tableNo')}</MsqdxTypography>
              </Box>
              <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>{row.hasH1 ? t('projects.seo.tableYes') : t('projects.seo.tableNo')}</MsqdxTypography>
              </Box>
              <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center' }}>
                {row.structure === 'good' ? (
                  <MsqdxChip label={structureLabel(row.structure)} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.15), color: MSQDX_BRAND_PRIMARY.green }} />
                ) : row.structure === 'multipleH1' ? (
                  <MsqdxChip label={structureLabel(row.structure)} size="small" brandColor="pink" sx={{ height: 18, fontSize: '0.65rem' }} />
                ) : (
                  <MsqdxChip label={structureLabel(row.structure)} size="small" brandColor="yellow" sx={{ height: 18, fontSize: '0.65rem' }} />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      {rows.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 0.5,
            mt: 1,
            px: 0.5,
            py: 0.25,
          }}
        >
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem' }}>
            {t('share.pageOfTotal', {
              current: String(safePage),
              total: String(totalPages),
              count: String(rows.length),
            })}
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

export const SeoOnPageTable = React.memo(SeoOnPageTableInner);
