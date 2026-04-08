'use client';

import React, { memo } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { DomainResultPageTopicsCard } from './DomainResultPageTopicsCard';
import type { AggregatedPageClassification } from '@/lib/types';
import { MSQDX_INNER_CARD_BORDER_SX } from '@/lib/theme-accent';

function DomainResultPageTopicsEmptyInner({ t }: { t: (key: string) => string }) {
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.pageTopicsTitle')}
            headerActions={<InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.pageTopicsTabSubtitle')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <Box
                sx={{
                    p: 1.5,
                    borderRadius: 'var(--msqdx-radius-md)',
                    ...MSQDX_INNER_CARD_BORDER_SX,
                    bgcolor: 'var(--color-card-bg)',
                }}
            >
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.45 }}>
                    {t('domainResult.pageTopicsEmpty')}
                </MsqdxTypography>
            </Box>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultPageTopicsEmpty = memo(DomainResultPageTopicsEmptyInner);

export type DomainResultPageTopicsSectionProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    pageClassification: AggregatedPageClassification | null | undefined;
};

function DomainResultPageTopicsSectionInner({ t, pageClassification }: DomainResultPageTopicsSectionProps) {
    const hasData =
        pageClassification != null && pageClassification.coverage.pagesWithClassification > 0;

    return (
        <MsqdxMoleculeCard
            title={t('domainResult.pageTopicsTitle')}
            headerActions={<InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.pageTopicsTabSubtitle')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            {hasData ? (
                <DomainResultPageTopicsCard t={t} pageClassification={pageClassification} placement="tab" />
            ) : (
                <Stack spacing={1.5}>
                    <Box
                        sx={{
                            p: 1.5,
                            borderRadius: 'var(--msqdx-radius-md)',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                            bgcolor: 'var(--color-card-bg)',
                        }}
                    >
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.45 }}>
                            {t('domainResult.pageTopicsEmpty')}
                        </MsqdxTypography>
                    </Box>
                </Stack>
            )}
        </MsqdxMoleculeCard>
    );
}

export const DomainResultPageTopicsSection = memo(DomainResultPageTopicsSectionInner);
