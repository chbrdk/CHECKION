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

export default function DashboardPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scan')
      .then((res) => res.json())
      .then((data) => {
        setScans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalScans = scans.length;
  const totalErrors = scans.reduce((sum, s) => sum + s.stats.errors, 0);
  const totalWarnings = scans.reduce((sum, s) => sum + s.stats.warnings, 0);
  const totalNotices = scans.reduce((sum, s) => sum + s.stats.notices, 0);

  return (
    <Box sx={{ p: `${MSQDX_SPACING.scale.md}px`, maxWidth: 1600, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: `${MSQDX_SPACING.scale.md}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <Box>
          <MsqdxTypography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: MSQDX_SPACING.scale.xs,
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard
          </MsqdxTypography>
          <MsqdxTypography
            variant="body2"
            sx={{ color: MSQDX_THEME.dark.text.tertiary }}
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
          gap: `${MSQDX_SPACING.scale.md}px`,
          mb: `${MSQDX_SPACING.scale.xl}px`,
        }}
      >
        <StatCard label="Scans" value={totalScans} color="green" />
        <StatCard label="Errors" value={totalErrors} color="pink" />
        <StatCard label="Warnings" value={totalWarnings} color="yellow" />
        <StatCard label="Notices" value={totalNotices} color="purple" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: MSQDX_SPACING.scale.lg }}>
        {/* Scan History using MsqdxCard */}
        <Box sx={{ gridColumn: '1 / -1' }}>
          <MsqdxMoleculeCard
            title="Scan-Historie"
            variant="flat"
            borderRadius="lg"
            footerDivider={false} // Clean look
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: MSQDX_SPACING.scale.xxl }}>
                <CircularProgress size={28} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
              </Box>
            ) : scans.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: MSQDX_SPACING.scale.xl,
                }}
              >
                <MsqdxTypography
                  variant="body2"
                  sx={{ color: MSQDX_THEME.dark.text.tertiary, mb: MSQDX_SPACING.scale.md }}
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
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: MSQDX_SPACING.scale.sm }}>
                {scans.map((scan) => (
                  <Box
                    key={scan.id}
                    onClick={() => router.push(`/results/${scan.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: MSQDX_SPACING.scale.md,
                      p: MSQDX_SPACING.scale.md,
                      borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                      cursor: 'pointer',
                      backgroundColor: MSQDX_NEUTRAL[900],
                      border: `1px solid ${MSQDX_THEME.dark.border.subtle}`,
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
                        sx={{ color: MSQDX_THEME.dark.text.tertiary, fontSize: '0.7rem' }}
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
                      <MsqdxTypography variant="caption" sx={{ display: 'block', color: MSQDX_THEME.dark.text.tertiary, fontSize: '0.6rem' }}>Errors</MsqdxTypography>
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
    // We can use children for the content
    >
      <MsqdxTypography
        variant="caption"
        sx={{
          color: MSQDX_THEME.dark.text.tertiary,
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
