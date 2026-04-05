'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxCard } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedPageClassification, AggregatedPageClassificationProfile } from '@/lib/types';
import { PageTopicsVisualization } from '@/components/domain/PageTopicsVisualization';

export type DomainResultPageTopicsCardProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    pageClassification: AggregatedPageClassification;
    /** `overview`: left column spacing; `tab`: full-width tab, no extra top margin */
    placement?: 'overview' | 'tab';
};

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
    const { coverage, pageSamples } = pageClassification;
    if (coverage.pagesWithClassification <= 0) return null;

    return (
        <Box sx={placement === 'tab' ? { mt: 0 } : { mt: 'var(--msqdx-spacing-xl)' }}>
            <MsqdxCard
                variant="flat"
                sx={{
                    bgcolor: 'var(--color-card-bg)',
                    p: 'var(--msqdx-spacing-md)',
                    borderRadius: 'var(--msqdx-radius-sm)',
                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                }}
            >
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxTypography variant="h6">{t('domainResult.pageTopicsTitle')}</MsqdxTypography>
                    <InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />
                </Box>

                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-md)' }}>
                    {t('domainResult.pageTopicsCoverage', {
                        classified: coverage.pagesWithClassification,
                        total: coverage.totalPages,
                    })}
                </MsqdxTypography>

                <PageTopicsVisualization t={t} pageClassification={pageClassification} />

                {pageSamples.length > 0 && (
                    <>
                        <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-xs)' }}>
                            {t('domainResult.pageTopicsSamples')}
                        </MsqdxTypography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-xs)' }}>
                            {pageSamples.map((s) => (
                                <MsqdxTypography key={s.url} variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    <strong>{profileLabel(t, s.profile)}</strong>
                                    {' · '}
                                    {s.url.length > 64 ? `${s.url.slice(0, 61)}…` : s.url}
                                </MsqdxTypography>
                            ))}
                        </Box>
                    </>
                )}
            </MsqdxCard>
        </Box>
    );
});
