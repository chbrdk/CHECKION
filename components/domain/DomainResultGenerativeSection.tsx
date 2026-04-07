'use client';

import React, { memo } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedGenerative } from '@/lib/domain-aggregation';
import { DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX, DOMAIN_TAB_VIRTUAL_OVERSCAN } from '@/lib/constants';
import { GenerativePageScrollRow } from '@/components/domain/GenerativePageScrollRow';
import { MSQDX_INNER_CARD_BORDER_SX, THEME_ACCENT_CSS } from '@/lib/theme-accent';

export type DomainResultGenerativeSectionProps = {
    t: (key: string, params?: Record<string, string | number>) => string;
    locale: string;
    generative: AggregatedGenerative;
    onOpenPageUrl: (url: string) => void;
};

const INNER_CARD_SX = {
    bgcolor: 'var(--color-card-bg)',
    ...MSQDX_INNER_CARD_BORDER_SX,
    width: '100%',
} as const;

function geoScoreColor(score: number): string {
    if (score >= 80) return THEME_ACCENT_CSS;
    if (score >= 55) return MSQDX_STATUS.warning.base;
    return MSQDX_STATUS.error.base;
}

function DomainResultGenerativeSectionInner({
    t,
    locale,
    generative,
    onOpenPageUrl,
}: DomainResultGenerativeSectionProps) {
    const lc = locale === 'en' ? 'en-US' : 'de-DE';
    const n = generative.pageCount;
    const cs = generative.contentSummary;

    const kpiCell = (labelKey: string, value: string, valueColor?: string) => (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 'var(--msqdx-radius-md)',
                ...MSQDX_INNER_CARD_BORDER_SX,
                bgcolor: 'var(--color-card-bg)',
            }}
        >
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                {t(labelKey)}
            </MsqdxTypography>
            <MsqdxTypography
                variant="h5"
                sx={{
                    fontWeight: 700,
                    mt: 0.5,
                    lineHeight: 1.2,
                    ...(valueColor ? { color: valueColor } : {}),
                }}
            >
                {value}
            </MsqdxTypography>
        </Box>
    );

    return (
        <MsqdxMoleculeCard
            title={t('domainResult.generativeTitle')}
            headerActions={<InfoTooltip title={t('info.generativeGeo')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.generativeSubtitle')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    {kpiCell('domainResult.generativeKpiGeoScore', String(generative.score), geoScoreColor(generative.score))}
                    {kpiCell(
                        'domainResult.generativeKpiLlmsTxt',
                        `${generative.withLlmsTxt.toLocaleString(lc)} / ${n.toLocaleString(lc)}`
                    )}
                    {kpiCell(
                        'domainResult.generativeKpiRobotsAi',
                        `${generative.withRobotsAllowingAi.toLocaleString(lc)} / ${n.toLocaleString(lc)}`
                    )}
                    {kpiCell('domainResult.generativeKpiPagesGeo', n.toLocaleString(lc))}
                </Box>

                <MsqdxMoleculeCard
                    title={t('domainResult.generativeContentTitle')}
                    titleVariant="h6"
                    subtitle={t('domainResult.generativeContentIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={INNER_CARD_SX}
                >
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                            gap: 1.5,
                        }}
                    >
                        {kpiCell('domainResult.generativeKpiAvgFaq', String(cs.avgFaqCount))}
                        {kpiCell('domainResult.generativeKpiListDensity', String(cs.avgListDensity))}
                        {kpiCell('domainResult.generativeKpiCitationDensity', String(cs.avgCitationDensity))}
                    </Box>
                </MsqdxMoleculeCard>

                <MsqdxMoleculeCard
                    title={t('domainResult.generativePagesTitle')}
                    titleVariant="h6"
                    subtitle={t('domainResult.generativePagesIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={INNER_CARD_SX}
                >
                    <VirtualScrollList
                        items={generative.pages}
                        maxHeight={360}
                        estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                        overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                        getItemKey={(p) => p.url}
                        renderItem={(p) => <GenerativePageScrollRow page={p} onOpenPageUrl={onOpenPageUrl} t={t} />}
                    />
                </MsqdxMoleculeCard>
            </Stack>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultGenerativeSection = memo(DomainResultGenerativeSectionInner);

function DomainResultGenerativeEmptyInner({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.generativeTitle')}
            headerActions={<InfoTooltip title={t('info.generativeGeo')} ariaLabel={t('common.info')} />}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('domainResult.generativeEmpty')}
            </MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultGenerativeEmpty = memo(DomainResultGenerativeEmptyInner);
