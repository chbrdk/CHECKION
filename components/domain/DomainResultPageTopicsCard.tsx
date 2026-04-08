'use client';

import React, { memo } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import type { AggregatedPageClassification, AggregatedPageClassificationProfile } from '@/lib/types';
import { PageTopicsVisualization } from '@/components/domain/PageTopicsVisualization';
import { MSQDX_INNER_CARD_BORDER_SX } from '@/lib/theme-accent';

export type DomainResultPageTopicsCardProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    pageClassification: AggregatedPageClassification;
    /** `overview`: left column spacing; `tab`: full-width tab, no extra top margin */
    placement?: 'overview' | 'tab';
};

const INNER_CARD_SX = {
    bgcolor: 'var(--color-card-bg)',
    ...MSQDX_INNER_CARD_BORDER_SX,
    width: '100%',
} as const;

function profileLabel(t: DomainResultPageTopicsCardProps['t'], p: AggregatedPageClassificationProfile): string {
    switch (p) {
        case 'pillar':
            return t('domainResult.pageTopicsProfilePillar');
        case 'hub':
            return t('domainResult.pageTopicsProfileHub');
        case 'utility':
            return t('domainResult.pageTopicsProfileUtility');
        default:
            return t('domainResult.pageTopicsProfileMixed');
    }
}

export const DomainResultPageTopicsCard = memo(function DomainResultPageTopicsCard({
    t,
    pageClassification,
    placement = 'overview',
}: DomainResultPageTopicsCardProps) {
    const { coverage, pageSamples, tierDistribution } = pageClassification;
    if (coverage.pagesWithClassification <= 0) return null;

    return (
        <Box sx={placement === 'tab' ? { mt: 0 } : { mt: 'var(--msqdx-spacing-xl)' }}>
            <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                            gridColumn: { xs: 'span 2', md: 'span 2' },
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            {t('domainResult.pageTopicsKpiCoverage')}
                        </MsqdxTypography>
                        <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>
                            {coverage.pagesWithClassification} / {coverage.totalPages}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.75, lineHeight: 1.35 }}>
                            {t('domainResult.pageTopicsCoverage', {
                                classified: coverage.pagesWithClassification,
                                total: coverage.totalPages,
                            })}
                        </MsqdxTypography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            T5
                        </MsqdxTypography>
                        <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>
                            {tierDistribution.pagesWithAtLeastOneTier5}
                        </MsqdxTypography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                            T1–2 &gt; T4–5
                        </MsqdxTypography>
                        <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>
                            {tierDistribution.pagesDominatedByLowTiers}
                        </MsqdxTypography>
                    </Box>
                </Box>

                <MsqdxMoleculeCard
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={INNER_CARD_SX}
                >
                    <PageTopicsVisualization t={t} pageClassification={pageClassification} />
                </MsqdxMoleculeCard>

                {pageSamples.length > 0 ? (
                    <MsqdxMoleculeCard
                        title={t('domainResult.pageTopicsSamples')}
                        titleVariant="h6"
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={INNER_CARD_SX}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {pageSamples.map((s) => (
                                <MsqdxTypography key={s.url} variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.4 }}>
                                    <strong>{profileLabel(t, s.profile)}</strong>
                                    {' · '}
                                    {s.url.length > 88 ? `${s.url.slice(0, 85)}…` : s.url}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    </MsqdxMoleculeCard>
                ) : null}
            </Stack>
        </Box>
    );
});
