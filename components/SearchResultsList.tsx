'use client';

import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { SearchMatch, SearchMatchType } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';

const listItemSx = {
  cursor: 'pointer',
  '&:hover': { bgcolor: 'var(--color-theme-accent-tint)' },
  border: '1px solid var(--color-secondary-dx-grey-light-tint)',
  borderRadius: 'var(--msqdx-radius-sm)',
  mb: 'var(--msqdx-spacing-xs)',
  p: 'var(--msqdx-spacing-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--msqdx-spacing-sm)',
  flexWrap: 'wrap' as const,
};

const MATCH_TYPE_KEYS: Record<SearchMatchType, string> = {
  url: 'dashboard.matchType_url',
  region: 'dashboard.matchType_region',
  issue: 'dashboard.matchType_issue',
  seo: 'dashboard.matchType_seo',
  domain: 'dashboard.matchType_domain',
};

export interface SearchResultsListProps {
  matches: SearchMatch[];
  loading: boolean;
  query: string;
  onSelectMatch: (match: SearchMatch) => void;
}

export function SearchResultsList({ matches, loading, query, onSelectMatch }: SearchResultsListProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 3 }}>
        <CircularProgress size={24} sx={{ color: 'var(--color-theme-accent)' }} />
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {t('dashboard.searchLoading')}
        </MsqdxTypography>
      </Box>
    );
  }

  if (matches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, px: 2 }}>
        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
          {query ? t('dashboard.searchNoResults', { query }) : t('dashboard.searchNoResultsEmpty')}
        </MsqdxTypography>
      </Box>
    );
  }

  return (
    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {matches.map((match, idx) => (
        <Box
          component="li"
          key={`${match.id}-${match.url}-${match.matchType}-${idx}`}
          sx={listItemSx}
          onClick={() => onSelectMatch(match)}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
              <MsqdxChip
                label={match.type === 'single' ? t('dashboard.searchType_single') : t('dashboard.searchType_domain')}
                size="small"
                sx={{
                  fontSize: '0.65rem',
                  height: 20,
                  bgcolor: match.type === 'single' ? 'var(--color-secondary-dx-green-tint)' : 'var(--color-secondary-dx-purple-tint)',
                  color: match.type === 'single' ? MSQDX_BRAND_PRIMARY.green : MSQDX_BRAND_PRIMARY.purple,
                }}
              />
              <MsqdxChip
                label={t(MATCH_TYPE_KEYS[match.matchType])}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.65rem', height: 20 }}
              />
            </Box>
            <MsqdxTypography
              variant="body2"
              sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.25 }}
            >
              {match.type === 'domain' && match.domain ? `${match.domain} → ` : ''}
              {match.url}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
              {match.snippet}
            </MsqdxTypography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
