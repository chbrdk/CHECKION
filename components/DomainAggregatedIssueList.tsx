'use client';

import React from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_THEME } from '@msqdx/tokens';
import type { AggregatedIssue } from '@/lib/domain-aggregation';

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  error: { label: 'Error', color: MSQDX_STATUS.error.base },
  warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
  notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

export function DomainAggregatedIssueList({
  issues,
  onPageClick,
}: {
  issues: AggregatedIssue[];
  onPageClick?: (url: string) => void;
}) {
  if (issues.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          Keine Issues über alle Seiten aggregiert.
        </MsqdxTypography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: tableBorder,
        borderRadius: 8,
        overflow: 'auto',
        maxHeight: '65vh',
        backgroundColor: MSQDX_THEME.light.surface.primary,
      }}
    >
      <Box
        component="div"
        role="row"
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 72px 90px',
          gap: 0,
          borderBottom: tableBorder,
          backgroundColor: MSQDX_NEUTRAL[100],
          alignItems: 'center',
          minHeight: 40,
        }}
      >
        <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Schwere
          </MsqdxTypography>
        </Box>
        <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Meldung
          </MsqdxTypography>
        </Box>
        <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Level
          </MsqdxTypography>
        </Box>
        <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Runner
          </MsqdxTypography>
        </Box>
        <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Code
          </MsqdxTypography>
        </Box>
        <Box component="div" role="columnheader" sx={{ px: 1.5, py: 1 }}>
          <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: MSQDX_THEME.light.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Seiten
          </MsqdxTypography>
        </Box>
        <Box component="div" role="columnheader" sx={{ px: 1, py: 1 }} />
      </Box>
      {issues.map((issue, idx) => {
        const config = SEVERITY_CONFIG[issue.type] ?? SEVERITY_CONFIG.notice;
        const levelLabel = issue.wcagLevel === 'Unknown' ? '–' : issue.wcagLevel === 'APCA' ? 'APCA' : `Level ${issue.wcagLevel}`;
        const codeShort = issue.code.length > 48 ? issue.code.slice(0, 48) + '…' : issue.code;
        const firstUrl = issue.pageUrls?.[0];
        return (
          <Box
            key={`agg-${idx}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, 1.2fr) 80px 72px minmax(0, 1fr) 72px 90px',
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
              <MsqdxChip label={`${issue.pageCount} Seite(n)`} size="small" sx={{ fontSize: '0.7rem', height: 22 }} />
              {firstUrl && onPageClick && (
                <MsqdxTypography
                  component="button"
                  variant="caption"
                  sx={{ ml: 0.5, cursor: 'pointer', color: MSQDX_BRAND_PRIMARY.green, textDecoration: 'underline', border: 'none', background: 'none' }}
                  onClick={() => onPageClick(firstUrl)}
                >
                  Öffnen
                </MsqdxTypography>
              )}
            </Box>
            <Box sx={{ px: 1, py: 1 }} />
          </Box>
        );
      })}
    </Box>
  );
}
