'use client';

import React, { useMemo, useState } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AggregatedIssue } from '@/lib/domain-aggregation';
import { useI18n } from '@/components/i18n/I18nProvider';
import { DOMAIN_ISSUES_TABLE_PAGE_SIZE } from '@/lib/constants';

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  error: { label: 'Error', color: MSQDX_STATUS.error.base },
  warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
  notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

const GRID_COLUMNS = 'minmax(0, 1fr) minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 72px 90px';

type SortKey = 'severity' | 'message' | 'level' | 'runner' | 'code' | 'pageCount';
type SortDir = 'asc' | 'desc';

const severityOrder = { error: 0, warning: 1, notice: 2 };

export function DomainAggregatedIssueList({
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
          overflow: 'auto',
          maxHeight: '65vh',
          backgroundColor: MSQDX_THEME.light.surface.primary,
        }}
      >
        <Box component="div" role="table" aria-label={t('info.issuesList')}>
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
              minHeight: 44,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <SortHeader id="severity" label={t('domainResult.issuesTableSeverity')} active={sortKey === 'severity'} />
            <SortHeader id="message" label={t('domainResult.issuesTableMessage')} active={sortKey === 'message'} />
            <SortHeader id="level" label={t('domainResult.issuesTableLevel')} active={sortKey === 'level'} />
            <SortHeader id="runner" label={t('domainResult.issuesTableRunner')} active={sortKey === 'runner'} />
            <SortHeader id="code" label={t('domainResult.issuesTableCode')} active={sortKey === 'code'} />
            <SortHeader id="pageCount" label={t('domainResult.issuesTablePages')} active={sortKey === 'pageCount'} />
            <Box component="div" role="columnheader" sx={{ px: 1, py: 1 }} />
          </Box>
          {paginatedRows.map((issue) => {
            const config = SEVERITY_CONFIG[issue.type] ?? SEVERITY_CONFIG.notice;
            const levelLabel = issue.wcagLevel === 'Unknown' ? '–' : issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`;
            const codeShort = issue.code.length > 48 ? issue.code.slice(0, 48) + '…' : issue.code;
            const firstUrl = issue.pageUrls?.[0];
            const rowKey = `${issue.code}|${issue.type}|${issue.message}`;
            return (
              <Box
                key={rowKey}
                component="div"
                role="row"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLUMNS,
                  gap: 0,
                  borderBottom: tableBorder,
                  alignItems: 'stretch',
                  '&:last-of-type': { borderBottom: 'none' },
                  '&:hover': { backgroundColor: alpha(config.color, 0.08) },
                }}
              >
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1, borderRight: tableBorder }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: config.color, flexShrink: 0 }} />
                  <MsqdxChip label={config.label} size="small" sx={{ backgroundColor: alpha(config.color, 0.12), color: config.color, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                </Box>
                <Box sx={{ px: 1.5, py: 1, minWidth: 0, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxTypography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.4 }}>{issue.message}</MsqdxTypography>
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  {issue.wcagLevel !== 'Unknown' && (
                    <MsqdxChip
                      label={levelLabel}
                      size="small"
                      sx={{
                        backgroundColor: issue.wcagLevel === 'APCA' ? alpha(MSQDX_BRAND_PRIMARY.purple, 0.12) : alpha(MSQDX_STATUS.info.base, 0.12),
                        color: issue.wcagLevel === 'APCA' ? MSQDX_BRAND_PRIMARY.purple : MSQDX_STATUS.info.base,
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                  )}
                  {issue.wcagLevel === 'Unknown' && <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.light.text.tertiary }}>–</MsqdxTypography>}
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxChip label={issue.runner} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.7rem', wordBreak: 'break-all' }}>{codeShort}</MsqdxTypography>
                </Box>
                <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center', borderRight: tableBorder }}>
                  <MsqdxChip label={`${issue.pageCount} ${t('domainResult.issuesTablePages')}`} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
                  {firstUrl && onPageClick && (
                    <MsqdxTypography
                      component="button"
                      variant="caption"
                      aria-label={t('domainResult.openPageAria', { url: firstUrl })}
                      sx={{ ml: 0.5, cursor: 'pointer', color: MSQDX_BRAND_PRIMARY.green, textDecoration: 'underline', border: 'none', background: 'none' }}
                      onClick={() => onPageClick(firstUrl)}
                    >
                      {t('domainResult.openPage')}
                    </MsqdxTypography>
                  )}
                </Box>
                <Box sx={{ px: 1, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  {issue.helpUrl && (
                    <a
                      href={issue.helpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('results.fixDocsAria')}
                      style={{ fontSize: '0.7rem', color: MSQDX_BRAND_PRIMARY.green, textDecoration: 'underline' }}
                    >
                      {t('results.fixDocs')} →
                    </a>
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
              count: String(issues.length),
            })}
          </MsqdxTypography>
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
        </Box>
      )}
    </Box>
  );
}
