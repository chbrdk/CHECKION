'use client';

import React from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { AggregatedIssue } from '@/lib/domain-aggregation';
import { useI18n } from '@/components/i18n/I18nProvider';

const SEVERITY_ORDER = { error: 0, warning: 1, notice: 2 };
const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  error: { label: 'Error', color: MSQDX_STATUS.error.base },
  warning: { label: 'Warning', color: MSQDX_STATUS.warning.base },
  notice: { label: 'Notice', color: MSQDX_STATUS.info.base },
};

/** Derive a short title from URL (pathname last segment or host). */
function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1]!;
    return u.hostname;
  } catch {
    return url.length > 48 ? url.slice(0, 48) + '…' : url;
  }
}

export function PageIssuesCard({
  url,
  issuesForPage,
  stats,
  onOpenPage,
}: {
  url: string;
  issuesForPage: AggregatedIssue[];
  stats: { errors: number; warnings: number; notices: number };
  onOpenPage?: () => void;
}) {
  const { t } = useI18n();
  const title = titleFromUrl(url);
  const sorted = [...issuesForPage].sort(
    (a, b) => (SEVERITY_ORDER[a.type as keyof typeof SEVERITY_ORDER] ?? 2) - (SEVERITY_ORDER[b.type as keyof typeof SEVERITY_ORDER] ?? 2)
  );

  return (
    <MsqdxMoleculeCard
      title={title}
      subtitle={url}
      variant="flat"
      borderRadius="lg"
      sx={{ bgcolor: 'var(--color-card-bg)' }}
      footerDivider
      actions={
        onOpenPage ? (
          <MsqdxButton variant="outlined" size="small" onClick={onOpenPage}>
            {t('domainResult.openPage')}
          </MsqdxButton>
        ) : undefined
      }
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
        {stats.errors > 0 && (
          <MsqdxChip
            size="small"
            label={`${stats.errors} ${t('share.errors')}`}
            sx={{ bgcolor: alpha(SEVERITY_CONFIG.error.color, 0.12), color: SEVERITY_CONFIG.error.color, fontSize: '0.7rem' }}
          />
        )}
        {stats.warnings > 0 && (
          <MsqdxChip
            size="small"
            label={`${stats.warnings} ${t('share.warnings')}`}
            sx={{ bgcolor: alpha(SEVERITY_CONFIG.warning.color, 0.12), color: SEVERITY_CONFIG.warning.color, fontSize: '0.7rem' }}
          />
        )}
        {stats.notices > 0 && (
          <MsqdxChip
            size="small"
            label={`${stats.notices} ${t('share.notices')}`}
            sx={{ bgcolor: alpha(SEVERITY_CONFIG.notice.color, 0.12), color: SEVERITY_CONFIG.notice.color, fontSize: '0.7rem' }}
          />
        )}
      </Box>
      <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 220, overflow: 'auto' }}>
        {sorted.map((issue, idx) => {
          const config = SEVERITY_CONFIG[issue.type] ?? SEVERITY_CONFIG.notice;
          const codeShort = issue.code.length > 40 ? issue.code.slice(0, 40) + '…' : issue.code;
          return (
            <li key={`${issue.code}|${issue.type}|${idx}`} style={{ marginBottom: 6 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <MsqdxChip
                  label={config.label}
                  size="small"
                  sx={{
                    bgcolor: alpha(config.color, 0.12),
                    color: config.color,
                    fontWeight: 600,
                    fontSize: '0.65rem',
                    height: 18,
                    minHeight: 18,
                  }}
                />
                <MsqdxTypography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                  {issue.message}
                </MsqdxTypography>
              </Box>
              <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                {codeShort}
              </MsqdxTypography>
              {issue.helpUrl && (
                <a
                  href={issue.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('results.fixDocsAria')}
                  style={{ fontSize: '0.65rem', color: MSQDX_BRAND_PRIMARY.green, textDecoration: 'underline' }}
                >
                  {t('results.fixDocs')} →
                </a>
              )}
            </li>
          );
        })}
      </Box>
    </MsqdxMoleculeCard>
  );
}
