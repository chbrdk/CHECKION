'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { AggregatedIssue } from '@/lib/domain-aggregation';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
  DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
  DOMAIN_ISSUES_TABLE_PAGE_SIZE,
  DOMAIN_TAB_VIRTUAL_OVERSCAN,
} from '@/lib/constants';

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  error: { label: 'Error', color: MSQDX_STATUS.error.base },
  warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
  notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

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

  const rowVirtualizer = useVirtualizer({
    count: paginatedRows.length,
    getScrollElement: () => tableBodyScrollRef.current,
    estimateSize: () => DOMAIN_AGGREGATED_ISSUES_ROW_ESTIMATE_PX,
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
                const config = SEVERITY_CONFIG[issue.type] ?? SEVERITY_CONFIG.notice;
                const levelLabel = issue.wcagLevel === 'Unknown' ? '–' : issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`;
                const codeShort = issue.code.length > 48 ? issue.code.slice(0, 48) + '…' : issue.code;
                const firstUrl = issue.pageUrls?.[0];
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
                    <Box
                      component="div"
                      role="row"
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLUMNS,
                        gap: 0,
                        borderBottom: tableBorder,
                        alignItems: 'stretch',
                        '&:hover': { backgroundColor: alpha(config.color, 0.08) },
                      }}
                    >
                      <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, borderRight: tableBorder }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: config.color, flexShrink: 0 }} />
                        <MsqdxChip label={config.label} size="small" sx={{ backgroundColor: alpha(config.color, 0.12), color: config.color, fontWeight: 600, fontSize: '0.65rem', height: 18, minHeight: 18 }} />
                      </Box>
                      <Box sx={{ px: 1, py: 0.5, minWidth: 0, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 500, lineHeight: 1.3, fontSize: '0.75rem' }}>{issue.message}</MsqdxTypography>
                      </Box>
                      <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                        {issue.wcagLevel !== 'Unknown' && (
                          <MsqdxChip
                            label={levelLabel}
                            size="small"
                            sx={{
                              backgroundColor: issue.wcagLevel === 'APCA' ? alpha(MSQDX_BRAND_PRIMARY.purple, 0.12) : alpha(MSQDX_STATUS.info.base, 0.12),
                              color: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_STATUS.info.base,
                              fontSize: '0.65rem',
                              height: 18,
                              minHeight: 18,
                            }}
                          />
                        )}
                        {issue.wcagLevel === 'Unknown' && <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.light.text.tertiary, fontSize: '0.75rem' }}>–</MsqdxTypography>}
                      </Box>
                      <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                        <MsqdxChip label={issue.runner} size="small" sx={{ fontSize: '0.65rem', height: 18, minHeight: 18 }} />
                      </Box>
                      <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                        <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', wordBreak: 'break-all' }}>{codeShort}</MsqdxTypography>
                      </Box>
                      <Box sx={{ px: 1, py: 0.5, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                        <MsqdxChip label={`${issue.pageCount} ${t('domainResult.issuesTablePages')}`} size="small" sx={{ fontSize: '0.65rem', height: 18, minHeight: 18 }} />
                        {firstUrl && onPageClick && (
                          <MsqdxTypography
                            component="button"
                            variant="caption"
                            aria-label={t('domainResult.openPageAria', { url: firstUrl })}
                            sx={{ ml: 0.5, cursor: 'pointer', color: MSQDX_BRAND_PRIMARY.green, textDecoration: 'underline', border: 'none', background: 'none', fontSize: '0.7rem' }}
                            onClick={() => onPageClick(firstUrl)}
                          >
                            {t('domainResult.openPage')}
                          </MsqdxTypography>
                        )}
                      </Box>
                      <Box sx={{ px: 0.5, py: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {issue.helpUrl && (
                          <a
                            href={issue.helpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={t('results.fixDocsAria')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: MSQDX_BRAND_PRIMARY.green,
                              padding: 4,
                              borderRadius: 4,
                            }}
                            className="fix-docs-link"
                          >
                            <ExternalLink size={16} strokeWidth={2} />
                          </a>
                        )}
                      </Box>
                    </Box>
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
