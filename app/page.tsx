'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import {
  MsqdxTypography,
  MsqdxButton,
  MsqdxCard,
  MsqdxMoleculeCard,
  MsqdxFormField,
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { ScanResult, SearchMatch } from '@/lib/types';
import { HistoryList, SingleScanRow, DomainScanRow, type DomainScanSummary } from '@/components/HistoryList';
import { SearchResultsList } from '@/components/SearchResultsList';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { DASHBOARD_SCANS_PAGE_SIZE } from '@/lib/constants';

const LIMIT = DASHBOARD_SCANS_PAGE_SIZE;

type Pagination = { total: number; page: number; limit: number; totalPages: number };

let dashboardRenderCount = 0;
export default function DashboardPage() {
  dashboardRenderCount += 1;
  // #region agent log
  if (typeof fetch !== 'undefined') fetch('http://localhost:7690/ingest/c9cbac84-1718-43da-bac2-daa2249304ab', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e0b1bb' }, body: JSON.stringify({ sessionId: 'e0b1bb', hypothesisId: 'D', location: 'app/page.tsx:DashboardPage', message: 'DashboardPage render', data: { renderCount: dashboardRenderCount }, timestamp: Date.now() }) }).catch(() => {});
  // #endregion
  const router = useRouter();
  const { t } = useI18n();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [domainScans, setDomainScans] = useState<DomainScanSummary[]>([]);
  const [scanPagination, setScanPagination] = useState<Pagination | null>(null);
  const [domainPagination, setDomainPagination] = useState<Pagination | null>(null);
  const [scanPage, setScanPage] = useState(1);
  const [domainPage, setDomainPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [savedJourneys, setSavedJourneys] = useState<Array<{ id: string; domainScanId: string; domain?: string; name: string | null; goal: string; createdAt: string }>>([]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchMatches([]);
      setLastSearchedQuery('');
      return;
    }
    setLastSearchedQuery(trimmed);
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=50`);
      const data = await res.json();
      setSearchMatches(Array.isArray(data?.matches) ? data.matches : []);
    } catch {
      setSearchMatches([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchSubmit = useCallback(() => {
    runSearch(searchQuery);
  }, [searchQuery, runSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setLastSearchedQuery('');
    setSearchMatches([]);
  }, []);

  const handleSelectMatch = useCallback(
    (match: SearchMatch) => {
      if (match.type === 'single') {
        router.push(`/results/${match.id}`);
      } else {
        router.push(`/domain/${match.id}`);
      }
    },
    [router]
  );

  const loadScans = useCallback(async () => {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // #region agent log
    fetch('http://localhost:7690/ingest/c9cbac84-1718-43da-bac2-daa2249304ab', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e0b1bb' }, body: JSON.stringify({ sessionId: 'e0b1bb', runId, hypothesisId: 'B', location: 'app/page.tsx:loadScans', message: 'loadScans invoked', data: { scanPage, domainPage }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    setLoading(true);
    // #region agent log
    fetch('http://localhost:7690/ingest/c9cbac84-1718-43da-bac2-daa2249304ab', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e0b1bb' }, body: JSON.stringify({ sessionId: 'e0b1bb', runId, hypothesisId: 'B', location: 'app/page.tsx:setLoading(true)', message: 'setLoading(true)', data: {}, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    try {
      const [scanRes, domainRes, journeysRes] = await Promise.all([
        fetch(`/api/scan?limit=${LIMIT}&page=${scanPage}`).then((r) => r.json()),
        fetch(`/api/scans/domain?limit=${LIMIT}&page=${domainPage}`).then((r) => r.json()),
        fetch('/api/journeys?limit=20', { credentials: 'same-origin' }).then((r) => r.json()),
      ]);
      setScans(Array.isArray(scanRes?.data) ? scanRes.data : []);
      setScanPagination(scanRes?.pagination ?? null);
      setDomainScans(Array.isArray(domainRes?.data) ? domainRes.data : []);
      setDomainPagination(domainRes?.pagination ?? null);
      setSavedJourneys(Array.isArray(journeysRes?.data) ? journeysRes.data : []);
    } catch {
      setScans([]);
      setDomainScans([]);
      setScanPagination(null);
      setDomainPagination(null);
      setSavedJourneys([]);
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://localhost:7690/ingest/c9cbac84-1718-43da-bac2-daa2249304ab', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e0b1bb' }, body: JSON.stringify({ sessionId: 'e0b1bb', runId, hypothesisId: 'B', location: 'app/page.tsx:setLoading(false)', message: 'setLoading(false)', data: {}, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
    }
  }, [scanPage, domainPage]);

  useEffect(() => {
    // #region agent log
    fetch('http://localhost:7690/ingest/c9cbac84-1718-43da-bac2-daa2249304ab', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e0b1bb' }, body: JSON.stringify({ sessionId: 'e0b1bb', hypothesisId: 'C', location: 'app/page.tsx:useEffect', message: 'useEffect loadScans deps ran', data: { scanPage, domainPage }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    loadScans();
  }, [loadScans]);

  const totalScans = (scanPagination?.total ?? 0) + (domainPagination?.total ?? 0);
  const totalErrors = scans.reduce((sum, s) => sum + s.stats.errors, 0);
  const totalWarnings = scans.reduce((sum, s) => sum + s.stats.warnings, 0);
  const totalNotices = scans.reduce((sum, s) => sum + s.stats.notices, 0);

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 'var(--msqdx-spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
            <MsqdxTypography
              variant="h4"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              {t('dashboard.title')}
            </MsqdxTypography>
            <InfoTooltip title={t('info.dashboard')} ariaLabel={t('common.info')} />
          </Box>
          <MsqdxTypography
            variant="body2"
            sx={{ color: 'var(--color-text-muted-on-light)' }}
          >
            {t('dashboard.subtitle')}
          </MsqdxTypography>
        </Box>
        <MsqdxButton
          variant="contained"
          brandColor="green"
          size="medium"
          startIcon="add"
          onClick={() => router.push('/scan')}
        >
          {t('dashboard.newScan')}
        </MsqdxButton>
      </Box>

      {/* Search bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--msqdx-spacing-sm)',
          mb: 'var(--msqdx-spacing-md)',
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 200, maxWidth: 420 }}>
          <MsqdxFormField
            label={t('dashboard.searchLabel')}
            placeholder={t('dashboard.searchPlaceholder')}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearchSubmit()}
            fullWidth
          />
        </Box>
        <MsqdxButton variant="contained" brandColor="green" size="medium" onClick={handleSearchSubmit}>
          {t('dashboard.searchButton')}
        </MsqdxButton>
        {lastSearchedQuery && (
          <MsqdxButton variant="outlined" size="medium" onClick={clearSearch}>
            {t('dashboard.clearSearch')}
          </MsqdxButton>
        )}
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
        <InfoTooltip title={t('info.dashboardStats')} ariaLabel={t('common.info')} />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--msqdx-spacing-sm)',
          mb: 'var(--msqdx-spacing-md)',
        }}
      >
        <StatCard label={t('dashboard.stats.scans')} value={totalScans} color="green" />
        <StatCard label={t('dashboard.stats.errors')} value={totalErrors} color="pink" />
        <StatCard label={t('dashboard.stats.warnings')} value={totalWarnings} color="yellow" />
        <StatCard label={t('dashboard.stats.notices')} value={totalNotices} color="purple" />
      </Box>

      {/* Search results block (after user has submitted a search) */}
      {lastSearchedQuery && (
        <MsqdxMoleculeCard
          title={t('dashboard.searchResultsTitle')}
          variant="flat"
          borderRadius="lg"
          footerDivider={false}
          sx={{ bgcolor: 'var(--color-card-bg)', mb: 'var(--msqdx-spacing-md)' }}
        >
          <SearchResultsList
            matches={searchMatches}
            loading={searchLoading}
            query={lastSearchedQuery}
            onSelectMatch={handleSelectMatch}
          />
        </MsqdxMoleculeCard>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 'var(--msqdx-spacing-md)' }}>
        {/* Scan History using MsqdxCard */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <MsqdxMoleculeCard
            title={t('dashboard.historyTitle')}
            headerActions={<InfoTooltip title={t('info.scanHistory')} ariaLabel={t('common.info')} />}
            variant="flat"
            borderRadius="lg"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
          >
            <HistoryList
              loading={loading}
              itemCount={scans.length}
              emptyMessage={t('dashboard.emptyMessage')}
              emptyActionLabel={t('dashboard.emptyCta')}
              onEmptyAction={() => router.push('/scan')}
            >
              {scans.map((scan) => (
                <SingleScanRow
                  key={scan.id}
                  scan={scan}
                  onClick={() => router.push(`/results/${scan.id}`)}
                />
              ))}
            </HistoryList>
            {scanPagination && scanPagination.totalPages > 1 && (
              <PaginationBar
                page={scanPagination.page}
                totalPages={scanPagination.totalPages}
                onPrev={() => setScanPage((p) => Math.max(1, p - 1))}
                onNext={() => setScanPage((p) => Math.min(scanPagination.totalPages, p + 1))}
                t={t}
              />
            )}
          </MsqdxMoleculeCard>

          <MsqdxMoleculeCard
            title={t('dashboard.domainHistoryTitle')}
            headerActions={<InfoTooltip title={t('info.domainHistory')} ariaLabel={t('common.info')} />}
            variant="flat"
            borderRadius="lg"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)', mt: 'var(--msqdx-spacing-md)' }}
          >
            <HistoryList
              loading={loading}
              itemCount={domainScans.length}
              emptyMessage={t('dashboard.domainEmptyMessage')}
              emptyActionLabel={t('dashboard.domainEmptyCta')}
              onEmptyAction={() => router.push('/scan')}
            >
              {domainScans.map((ds) => (
                <DomainScanRow
                  key={ds.id}
                  item={ds}
                  onClick={() => router.push(`/domain/${ds.id}`)}
                />
              ))}
            </HistoryList>
            {domainPagination && domainPagination.totalPages > 1 && (
              <PaginationBar
                page={domainPagination.page}
                totalPages={domainPagination.totalPages}
                onPrev={() => setDomainPage((p) => Math.max(1, p - 1))}
                onNext={() => setDomainPage((p) => Math.min(domainPagination.totalPages, p + 1))}
                t={t}
              />
            )}
          </MsqdxMoleculeCard>

          <MsqdxMoleculeCard
            title={t('dashboard.journeyHistoryTitle')}
            variant="flat"
            borderRadius="lg"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)', mt: 'var(--msqdx-spacing-md)' }}
          >
            {savedJourneys.length === 0 ? (
              <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('dashboard.journeyHistoryEmpty')}
              </MsqdxTypography>
            ) : (
              <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {savedJourneys.map((j) => (
                  <Box
                    key={j.id}
                    component="li"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      py: 0.75,
                      px: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'var(--color-secondary-dx-grey-light-tint)' },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {j.name || j.goal}
                      </MsqdxTypography>
                      <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {j.domain ?? j.domainScanId} · {new Date(j.createdAt).toLocaleDateString()}
                      </MsqdxTypography>
                    </Box>
                    <MsqdxButton
                      size="small"
                      variant="outlined"
                      onClick={() => router.push(`/domain/${j.domainScanId}?restoreJourney=${j.id}`)}
                    >
                      {t('dashboard.journeyHistoryOpen')}
                    </MsqdxButton>
                  </Box>
                ))}
              </Box>
            )}
          </MsqdxMoleculeCard>
        </Box>
      </Box>
    </Box>
  );
}

function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  t,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const pageOf = t('dashboard.pageOf', { page: String(page), total: String(totalPages) });
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--msqdx-spacing-sm)',
        mt: 'var(--msqdx-spacing-md)',
        pt: 'var(--msqdx-spacing-sm)',
        borderTop: '1px solid var(--color-secondary-dx-grey-light-tint)',
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

// Wrapper for StatCard using MsqdxCard
function StatCard({ label, value, color }: { label: string; value: number; color: "green" | "pink" | "yellow" | "purple" }) {
  // Map color to tokens purely for the value text color if needed, but MsqdxCard handles the border branding
  let valueColor = MSQDX_BRAND_PRIMARY[color] || MSQDX_BRAND_PRIMARY.green;
  if (color === 'purple') valueColor = MSQDX_BRAND_PRIMARY.purple || '#9c27b0'; // Fallback if token structure differs

  // Actually looking at tokens.ts, MSQDX_BRAND_PRIMARY usually has main colors.
  // Let's use specific colors for value text.

  const colors: Record<string, string> = {
    green: MSQDX_BRAND_PRIMARY.green,
    pink: MSQDX_BRAND_PRIMARY.pink,
    yellow: MSQDX_BRAND_PRIMARY.yellow,
    purple: MSQDX_BRAND_PRIMARY.purple,
  };

  return (
    <MsqdxCard
      brandColor={color}
      clickable
      hoverable
      sx={{ bgcolor: 'var(--color-card-bg)' }}
    >
      <MsqdxTypography
        variant="caption"
        sx={{
          color: 'var(--color-text-muted-on-light)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontSize: '0.65rem',
          fontWeight: 600,
          display: 'block',
          mb: 1
        }}
      >
        {label}
      </MsqdxTypography>
      <MsqdxTypography
        variant="h3"
        sx={{
          fontWeight: 700,
          color: colors[color],
          letterSpacing: '-0.03em',
        }}
      >
        {value}
      </MsqdxTypography>
    </MsqdxCard>
  );
}
