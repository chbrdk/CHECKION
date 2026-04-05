'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { InfoTooltip } from '@/components/InfoTooltip';
import { DomainResultPageTopicsCard } from './DomainResultPageTopicsCard';
import type { AggregatedPageClassification } from '@/lib/types';

function DomainResultPageTopicsEmptyInner({ t }: { t: (key: string) => string }) {
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.pageTopicsTitle')}
            headerActions={<InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />}
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('domainResult.pageTopicsEmpty')}
            </MsqdxTypography>
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
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-lg)' }}>
                {t('domainResult.pageTopicsTabSubtitle')}
            </MsqdxTypography>
            {hasData ? (
                <DomainResultPageTopicsCard t={t} pageClassification={pageClassification} placement="tab" />
            ) : (
                <DomainResultPageTopicsEmpty t={t} />
            )}
        </Box>
    );
}

export const DomainResultPageTopicsSection = memo(DomainResultPageTopicsSectionInner);
