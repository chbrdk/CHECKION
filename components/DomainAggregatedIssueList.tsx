'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AggregatedIssue } from '@/lib/domain-aggregation';
import { AggregatedIssueTableRow } from '@/components/AggregatedIssueTableRow';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
  DOMAIN_ISSUES_TABLE_PAGE_SIZE,
  DOMAIN_TAB_VIRTUAL_OVERSCAN,
} from '@/lib/constants';
import { estimateDomainAggregatedRowHeights } from '@/lib/pretext-issue-row-heights';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

/** Severity narrow; Pages wider; Fix = icon only. */
const GRID_COLUMNS = '70px minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 92px 48px';

type SortKey = 'severity' | 'message' | 'level' | 'runner' | 'code' | 'pageCount';
type SortDir = 'asc' | 'desc';

const severityOrder = { error: 0, warning: 1, notice: 2 };

function DomainAggregatedIssueListInner({
  issues,
  onPageClick,
  pageSize = DOMAIN_ISSUES_TABLE_PAGE_SIZE,
}: {
  issues: AggregatedIssue[];
  onPageClick?: (url: string) => void;
  pageSize?: number;
}) {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('pageCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const tableBodyScrollRef = useRef<HTMLDivElement>(null);
  const [tableBodyWidth, setTableBodyWidth] = useState(0);

  const sortedIssues = useMemo(() => {
    const arr = [...issues];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'severity':
          cmp = (severityOrder[a.type as keyof typeof severityOrder] ?? 2) - (severityOrder[b.type as keyof typeof severityOrder] ?? 2);
          break;
        case 'message':
          cmp = (a.message ?? '').localeCompare(b.message ?? '');
          break;
        case 'level': {
          const order = { A: 0, AA: 1, AAA: 2, APCA: 3, Unknown: 4 };
          cmp = (order[a.wcagLevel] ?? 4) - (order[b.wcagLevel] ?? 4);
          break;
        }
        case 'runner':
          cmp = (a.runner ?? '').localeCompare(b.runner ?? '');
          break;
        case 'code':
          cmp = (a.code ?? '').localeCompare(b.code ?? '');
          break;
        case 'pageCount':
          cmp = (a.pageCount ?? 0) - (b.pageCount ?? 0);
          break;
        default:
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [issues, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * pageSize;
  const paginatedRows = useMemo(
    () => sortedIssues.slice(start, start + pageSize),
    [sortedIssues, start, pageSize]
  );

  useLayoutEffect(() => {
    if (issues.length === 0) {
      setTableBodyWidth(0);
      return;
    }
    const el = tableBodyScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setTableBodyWidth(w);
    });
    ro.observe(el);
    setTableBodyWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [issues.length]);

  const rowHeightEstimates = useMemo(
    () => estimateDomainAggregatedRowHeights(paginatedRows, tableBodyWidth),
    [paginatedRows, tableBodyWidth]
  );

  const rowVirtualizer = useVirtualizer({
    count: paginatedRows.length,
    getScrollElement: () => tableBodyScrollRef.current,
    estimateSize: (index) => rowHeightEstimates[index] ?? DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
    overscan: DOMAIN_TAB_VIRTUAL_OVERSCAN,
    getItemKey: (index) => {
      const issue = paginatedRows[index];
      return issue ? `${issue.code}|${issue.type}|${issue.message}` : index;
    },
  });

  useEffect(() => {
    tableBodyScrollRef.current?.scrollTo({ top: 0 });
  }, [safePage, sortKey, sortDir, start]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'pageCount' ? 'desc' : 'asc');
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

  if (issues.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('domainResult.noIssues')}
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
          overflow: 'hidden',
          maxHeight: '65vh',
          backgroundColor: MSQDX_THEME.light.surface.primary,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Box component="div" role="table" aria-label={t('info.issuesList')} sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
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
              flexShrink: 0,
            }}
          >
            <SortHeader id="severity" label={t('domainResult.issuesTableSeverity')} active={sortKey === 'severity'} />
            <SortHeader id="message" label={t('domainResult.issuesTableMessage')} active={sortKey === 'message'} />
            <SortHeader id="level" label={t('domainResult.issuesTableLevel')} active={sortKey === 'level'} />
            <SortHeader id="runner" label={t('domainResult.issuesTableRunner')} active={sortKey === 'runner'} />
            <SortHeader id="code" label={t('domainResult.issuesTableCode')} active={sortKey === 'code'} />
            <SortHeader id="pageCount" label={t('domainResult.issuesTablePages')} active={sortKey === 'pageCount'} />
            <Box component="div" role="columnheader" sx={{ px: 0.75, py: 0.5 }} />
          </Box>
          <Box ref={tableBodyScrollRef} sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Box sx={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const issue = paginatedRows[vi.index];
                if (!issue) return null;
                return (
                  <div
                    key={vi.key}
                    data-index={vi.index}
                    ref={rowVirtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vi.start}px)`,
                    }}
                  >
                    <AggregatedIssueTableRow issue={issue} onPageClick={onPageClick} />
                  </div>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>
      {issues.length > 0 && (
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
              count: String(issues.length),
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

/** Memoized so parent re-renders (e.g. hover) don’t re-render the list; only re-renders when issues, onPageClick, or pageSize change. */
export const DomainAggregatedIssueList = React.memo(DomainAggregatedIssueListInner);
