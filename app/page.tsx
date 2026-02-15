'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, alpha } from '@mui/material';
import {
  MsqdxTypography,
  MsqdxButton,
  MsqdxChip,
  MsqdxCard,
  MsqdxMoleculeCard, // Import molecule card
} from '@msqdx/react';
import {
  MSQDX_SPACING,
  MSQDX_THEME,
  MSQDX_BRAND_PRIMARY,
  MSQDX_STATUS,
  MSQDX_NEUTRAL,
} from '@msqdx/tokens';
import type { ScanResult } from '@/lib/types';

type DomainScanSummary = { id: string; domain: string; timestamp: string; status: string; score: number; totalPages: number };

export default function DashboardPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [domainScans, setDomainScans] = useState<DomainScanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/scan').then((res) => res.json()).then((data) => Array.isArray(data) ? data : []),
      fetch('/api/scans/domain').then((res) => res.json()).then((data) => (data?.data ?? []) as DomainScanSummary[]),
    ])
      .then(([single, domain]) => {
        setScans(single);
        setDomainScans(domain);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalScans = scans.length + domainScans.length;
  const totalErrors = scans.reduce((sum, s) => sum + s.stats.errors, 0);
  const totalWarnings = scans.reduce((sum, s) => sum + s.stats.warnings, 0);
  const totalNotices = scans.reduce((sum, s) => sum + s.stats.notices, 0);

  return (
    <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 'var(--msqdx-spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <Box>
          <MsqdxTypography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 'var(--msqdx-spacing-xs)',
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard
          </MsqdxTypography>
          <MsqdxTypography
            variant="body2"
            sx={{ color: 'var(--color-text-muted-on-light)' }}
          >
            Übersicht aller durchgeführten WCAG Accessibility Checks
          </MsqdxTypography>
        </Box>
        <MsqdxButton
          variant="contained"
          brandColor="green"
          size="medium"
          startIcon="add"
          onClick={() => router.push('/scan')}
        >
          Neuer Scan
        </MsqdxButton>
      </Box>

      {/* Stats Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--msqdx-spacing-sm)',
          mb: 'var(--msqdx-spacing-md)',
        }}
      >
        <StatCard label="Scans" value={totalScans} color="green" />
        <StatCard label="Errors" value={totalErrors} color="pink" />
        <StatCard label="Warnings" value={totalWarnings} color="yellow" />
        <StatCard label="Notices" value={totalNotices} color="purple" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 'var(--msqdx-spacing-md)' }}>
        {/* Scan History using MsqdxCard */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <MsqdxMoleculeCard
            title="Scan-Historie"
            variant="flat"
            borderRadius="lg"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 'var(--msqdx-spacing-xl)' }}>
                <CircularProgress size={28} sx={{ color: 'var(--color-theme-accent)' }} />
              </Box>
            ) : scans.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 'var(--msqdx-spacing-md)',
                }}
              >
                <MsqdxTypography
                  variant="body2"
                  sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-sm)' }}
                >
                  Noch keine Scans durchgeführt.
                </MsqdxTypography>
                <MsqdxButton
                  variant="outlined"
                  brandColor="green"
                  size="small"
                  onClick={() => router.push('/scan')}
                >
                  Ersten Scan starten
                </MsqdxButton>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--msqdx-spacing-sm)' }}>
                {scans.map((scan) => (
                  <Box
                    key={scan.id}
                    onClick={() => router.push(`/results/${scan.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--msqdx-spacing-sm)',
                      p: 'var(--msqdx-spacing-sm)',
                      borderRadius: MSQDX_SPACING.borderRadius.md,
                      cursor: 'pointer',
                      backgroundColor: 'var(--color-card-bg)',
                      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: MSQDX_BRAND_PRIMARY.green,
                        backgroundColor: alpha(MSQDX_BRAND_PRIMARY.green, 0.02),
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: scan.stats.errors > 0 ? MSQDX_STATUS.error.base : MSQDX_BRAND_PRIMARY.green,
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <MsqdxTypography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          mb: 0.5,
                        }}
                      >
                        {scan.url}
                      </MsqdxTypography>
                      <MsqdxTypography
                        variant="caption"
                        sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem' }}
                      >
                        {new Date(scan.timestamp).toLocaleString('de-DE')}
                      </MsqdxTypography>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      <MsqdxChip
                        label={`${scan.stats.errors}`}
                        size="small"
                        sx={{
                          backgroundColor: alpha(MSQDX_STATUS.error.base, 0.1),
                          color: MSQDX_STATUS.error.light,
                          border: 'none',
                          fontWeight: 700,
                          mb: 0.5,
                          display: 'inline-flex'
                        }}
                      />
                      <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', fontSize: '0.6rem' }}>Errors</MsqdxTypography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </MsqdxMoleculeCard>

          <MsqdxMoleculeCard
            title="Deep-Scan-Historie (Domain)"
            variant="flat"
            borderRadius="lg"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)', mt: 'var(--msqdx-spacing-md)' }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 'var(--msqdx-spacing-xl)' }}>
                <CircularProgress size={28} sx={{ color: 'var(--color-theme-accent)' }} />
              </Box>
            ) : domainScans.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-sm)' }}>
                  Noch keine Deep Scans (Domain) durchgeführt.
                </MsqdxTypography>
                <MsqdxButton variant="outlined" brandColor="green" size="small" onClick={() => router.push('/scan')}>
                  Deep Scan starten
                </MsqdxButton>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--msqdx-spacing-sm)' }}>
                {domainScans.map((ds) => (
                  <Box
                    key={ds.id}
                    onClick={() => router.push(`/domain/${ds.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--msqdx-spacing-sm)',
                      p: 'var(--msqdx-spacing-sm)',
                      borderRadius: MSQDX_SPACING.borderRadius.md,
                      cursor: 'pointer',
                      backgroundColor: 'var(--color-card-bg)',
                      border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: MSQDX_BRAND_PRIMARY.green,
                        backgroundColor: alpha(MSQDX_BRAND_PRIMARY.green, 0.02),
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: ds.status === 'complete' ? (ds.score > 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_BRAND_PRIMARY.orange) : MSQDX_NEUTRAL[400],
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <MsqdxTypography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5 }}>
                        {ds.domain}
                      </MsqdxTypography>
                      <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem' }}>
                        {new Date(ds.timestamp).toLocaleString('de-DE')} · {ds.totalPages} Seiten
                      </MsqdxTypography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <MsqdxChip label={ds.status === 'complete' ? `${ds.score}` : ds.status} size="small" brandColor={ds.status === 'complete' ? (ds.score > 80 ? 'green' : 'orange') : undefined} />
                    </Box>
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
