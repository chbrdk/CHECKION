'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_THEME } from '@msqdx/tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { GEO_TABLE_PAGE_SIZE } from '@/lib/constants';
import type { GeoEeatPageResult } from '@/lib/types';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

type SortKey =
  | 'url'
  | 'trust'
  | 'experience'
  | 'expertise'
  | 'authoritativeness'
  | 'geoFitness'
  | 'impressum'
  | 'privacy';
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

function getTrust(p: GeoEeatPageResult): number {
  return p.eeatScores?.trust?.score ?? 0;
}
function getExperience(p: GeoEeatPageResult): number {
  return p.eeatScores?.experience?.score ?? 0;
}
function getExpertise(p: GeoEeatPageResult): number {
  return p.eeatScores?.expertise?.score ?? 0;
}
function getAuthoritativeness(p: GeoEeatPageResult): number {
  return p.eeatScores?.authoritativeness?.score ?? 0;
}
function getGeoFitness(p: GeoEeatPageResult): number {
  return p.geoFitnessScore ?? 0;
}
function getImpressum(p: GeoEeatPageResult): boolean {
  return p.technical?.hasImpressum === true || p.technical?.eeatSignals?.hasImpressum === true;
}
function getPrivacy(p: GeoEeatPageResult): boolean {
  return p.technical?.hasPrivacy === true;
}

export function GeoAnalysisPagesTable({ pages }: { pages: GeoEeatPageResult[] }) {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('geoFitness');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = [...pages];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'url':
          cmp = a.url.localeCompare(b.url);
          break;
        case 'trust':
          cmp = getTrust(a) - getTrust(b);
          break;
        case 'experience':
          cmp = getExperience(a) - getExperience(b);
          break;
        case 'expertise':
          cmp = getExpertise(a) - getExpertise(b);
          break;
        case 'authoritativeness':
          cmp = getAuthoritativeness(a) - getAuthoritativeness(b);
          break;
        case 'geoFitness':
          cmp = getGeoFitness(a) - getGeoFitness(b);
          break;
        case 'impressum':
          cmp = (getImpressum(a) ? 1 : 0) - (getImpressum(b) ? 1 : 0);
          break;
        case 'privacy':
          cmp = (getPrivacy(a) ? 1 : 0) - (getPrivacy(b) ? 1 : 0);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [pages, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / GEO_TABLE_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * GEO_TABLE_PAGE_SIZE;
  const pageRows = useMemo(
    () => sorted.slice(start, start + GEO_TABLE_PAGE_SIZE),
    [sorted, start]
  );

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortDir(key === 'url' ? 'asc' : 'desc');
        setCurrentPage(1);
      }
      return key;
    });
  }, []);

  const tableYes = t('projects.seo.tableYes');
  const tableNo = t('projects.seo.tableNo');

  if (pages.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('projects.geoAnalysis.tableEmpty')}
        </MsqdxTypography>
      </Box>
    );
  }

  const gridCols = 'minmax(120px, 1.5fr) 56px 56px 56px 56px 72px 64px 64px';

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
        <Box
          component="div"
          role="table"
          aria-label={t('projects.geoAnalysis.pagesTableTitle')}
          sx={{ minHeight: 32 + pageRows.length * 36 }}
        >
          <Box
            component="div"
            role="row"
            sx={{
              display: 'grid',
              gridTemplateColumns: gridCols,
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
            <SortHeader
              id="url"
              label={t('projects.geoAnalysis.tableUrl')}
              active={sortKey === 'url'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="trust"
              label={t('projects.geoAnalysis.tableTrust')}
              active={sortKey === 'trust'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="experience"
              label={t('projects.geoAnalysis.tableExperience')}
              active={sortKey === 'experience'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="expertise"
              label={t('projects.geoAnalysis.tableExpertise')}
              active={sortKey === 'expertise'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="authoritativeness"
              label={t('projects.geoAnalysis.tableAuthoritativeness')}
              active={sortKey === 'authoritativeness'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="geoFitness"
              label={t('projects.geoAnalysis.tableGeoFitness')}
              active={sortKey === 'geoFitness'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="impressum"
              label={t('projects.geoAnalysis.tableImpressum')}
              active={sortKey === 'impressum'}
              sortDir={sortDir}
              onSort={handleSort}
            />
            <SortHeader
              id="privacy"
              label={t('projects.geoAnalysis.tablePrivacy')}
              active={sortKey === 'privacy'}
              sortDir={sortDir}
              onSort={handleSort}
            />
          </Box>
          {pageRows.map((row) => (
            <Box
              key={row.url}
              component="div"
              role="row"
              sx={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: 0,
                borderBottom: tableBorder,
                alignItems: 'center',
                minHeight: 36,
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
              }}
            >
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.url}
              </Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getTrust(row)}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getExperience(row)}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getExpertise(row)}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getAuthoritativeness(row)}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getGeoFitness(row)}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getImpressum(row) ? tableYes : tableNo}</Box>
              <Box sx={{ px: 1, py: 0.5, fontSize: '0.75rem' }}>{getPrivacy(row) ? tableYes : tableNo}</Box>
            </Box>
          ))}
        </Box>
      </Box>
      {pages.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, gap: 1, flexWrap: 'wrap' }}>
          <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
            {start + 1}–{Math.min(start + GEO_TABLE_PAGE_SIZE, sorted.length)} / {sorted.length}
          </MsqdxTypography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MsqdxButton
              variant="outlined"
              size="small"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              sx={{ minWidth: 28, p: 0.5, minHeight: 28 }}
            >
              <ChevronLeft size={14} />
            </MsqdxButton>
            <MsqdxTypography variant="body2" sx={{ fontWeight: 500 }}>
              {safePage} / {totalPages}
            </MsqdxTypography>
            <MsqdxButton
              variant="outlined"
              size="small"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              sx={{ minWidth: 28, p: 0.5, minHeight: 28 }}
            >
              <ChevronRight size={14} />
            </MsqdxButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}
