'use client';

import React, { memo } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { ExternalLink } from 'lucide-react';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedStructure } from '@/lib/domain-aggregation';
import { DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX, DOMAIN_TAB_VIRTUAL_OVERSCAN } from '@/lib/constants';
import { StructureUrlScrollRow } from '@/components/domain/StructureUrlScrollRow';
import { MSQDX_INNER_CARD_BORDER_SX, THEME_ACCENT_CSS } from '@/lib/theme-accent';

export type DomainResultStructureSectionProps = {
    t: (key: string, params?: Record<string, string | number>) => string;
    structure: AggregatedStructure;
    onOpenPageUrl: (url: string) => void;
};

const INNER_CARD_SX = {
    bgcolor: 'var(--color-card-bg)',
    ...MSQDX_INNER_CARD_BORDER_SX,
    width: '100%',
} as const;

function DomainResultStructureSectionInner({ t, structure, onOpenPageUrl }: DomainResultStructureSectionProps) {
    const nMulti = structure.pagesWithMultipleH1.length;
    const nSkip = structure.pagesWithSkippedLevels.length;
    const nGood = structure.pagesWithGoodStructure.length;
    const showGoodList = nGood > 0 && nGood <= 10;

    const kpiCell = (labelKey: string, value: number, valueColor?: string) => (
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
                    ...(valueColor ? { color: valueColor } : {}),
                }}
            >
                {value}
            </MsqdxTypography>
        </Box>
    );

    const urlListCard = (
        titleKey: string,
        subtitleKey: string,
        urls: string[],
    ) => (
        <MsqdxMoleculeCard
            title={t(titleKey)}
            titleVariant="h6"
            subtitle={t(subtitleKey)}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={INNER_CARD_SX}
        >
            {urls.length > 0 ? (
                <VirtualScrollList
                    items={urls}
                    maxHeight={320}
                    estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                    overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                    getItemKey={(url) => url}
                    renderItem={(url) => <StructureUrlScrollRow url={url} t={t} onOpenPageUrl={onOpenPageUrl} />}
                />
            ) : (
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.45 }}>
                    {t('domainResult.structureListEmpty')}
                </MsqdxTypography>
            )}
        </MsqdxMoleculeCard>
    );

    return (
        <MsqdxMoleculeCard
            title={t('domainResult.structureDomainTitle')}
            headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.structureDomainSubtitle')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    {kpiCell('domainResult.structureKpiMultipleH1', nMulti, nMulti > 0 ? MSQDX_STATUS.warning.base : undefined)}
                    {kpiCell('domainResult.structureKpiSkipped', nSkip, nSkip > 0 ? MSQDX_STATUS.warning.base : undefined)}
                    {kpiCell('domainResult.structureKpiGood', nGood, nGood > 0 ? THEME_ACCENT_CSS : undefined)}
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'flex-start',
                        gap: 2,
                        width: '100%',
                        minWidth: 0,
                    }}
                >
                    <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
                        {urlListCard(
                            'domainResult.structureCardMultipleH1Title',
                            'domainResult.structureCardMultipleH1Intro',
                            structure.pagesWithMultipleH1,
                        )}
                    </Box>
                    <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
                        {urlListCard(
                            'domainResult.structureCardSkippedTitle',
                            'domainResult.structureCardSkippedIntro',
                            structure.pagesWithSkippedLevels,
                        )}
                    </Box>
                </Box>

                {showGoodList ? (
                    <MsqdxMoleculeCard
                        title={t('domainResult.structureCardGoodTitle')}
                        titleVariant="h6"
                        subtitle={t('domainResult.structureCardGoodIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={INNER_CARD_SX}
                    >
                        <Stack spacing={0.5}>
                            {structure.pagesWithGoodStructure.map((url) => (
                                <Box
                                    key={url}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.5,
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: 'var(--msqdx-radius-md)',
                                        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                    }}
                                >
                                    <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={url}>
                                        {url}
                                    </MsqdxTypography>
                                    <Tooltip title={t('domainResult.openPage')}>
                                        <IconButton
                                            size="small"
                                            aria-label={t('domainResult.openPageAria', { url })}
                                            onClick={() => onOpenPageUrl(url)}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            <ExternalLink size={16} strokeWidth={2} aria-hidden />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                            ))}
                        </Stack>
                    </MsqdxMoleculeCard>
                ) : null}
            </Stack>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultStructureSection = memo(DomainResultStructureSectionInner);

function DomainResultStructureEmptyInner({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.structureDomainTitle')}
            headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('domainResult.structureEmpty')}
            </MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultStructureEmpty = memo(DomainResultStructureEmptyInner);
