'use client';

import React, { memo } from 'react';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedGenerative } from '@/lib/domain-aggregation';
import { DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX, DOMAIN_TAB_VIRTUAL_OVERSCAN, DOMAIN_TAB_VIRTUAL_SCROLL_GAP_PX } from '@/lib/constants';
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
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(6, minmax(0, 1fr))' },
                        gap: 1.5,
                    }}
                >
                    {kpiCell('domainResult.generativeKpiGeoScore', String(generative.score), geoScoreColor(generative.score))}
                    {kpiCell(
                        'domainResult.generativeKpiDiscoverability',
                        generative.avgDiscoverability != null ? String(generative.avgDiscoverability) : '—',
                        generative.avgDiscoverability != null ? geoScoreColor(generative.avgDiscoverability) : undefined
                    )}
                    {kpiCell(
                        'domainResult.generativeKpiRepurposing',
                        generative.avgRepurposing != null ? String(generative.avgRepurposing) : '—',
                        generative.avgRepurposing != null ? geoScoreColor(generative.avgRepurposing) : undefined
                    )}
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

                {generative.issuePatterns && (
                    <MsqdxMoleculeCard
                        title={t('domainResult.generativePatternsTitle')}
                        titleVariant="h6"
                        subtitle={t('domainResult.generativePatternsIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={INNER_CARD_SX}
                    >
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('domainResult.generativePatternNoFaq', {
                                    count: generative.issuePatterns.pagesWithoutFaqSchema,
                                    total: n,
                                })}
                            </MsqdxTypography>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('domainResult.generativePatternNoFaqHowTo', {
                                    count: generative.issuePatterns.pagesWithoutHowToOrFaqSchema,
                                    total: n,
                                })}
                            </MsqdxTypography>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('domainResult.generativePatternNoBreadcrumb', {
                                    count: generative.issuePatterns.pagesWithoutBreadcrumbSchema,
                                    total: n,
                                })}
                            </MsqdxTypography>
                        </Box>
                    </MsqdxMoleculeCard>
                )}

                {generative.weakestRepurposingPages && generative.weakestRepurposingPages.length > 0 && (
                    <MsqdxMoleculeCard
                        title={t('domainResult.generativeWeakestTitle')}
                        titleVariant="h6"
                        subtitle={t('domainResult.generativeWeakestIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={INNER_CARD_SX}
                    >
                        <Stack spacing={0.75}>
                            {generative.weakestRepurposingPages.map((row) => (
                                <Box
                                    key={row.url}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 1,
                                        py: 0.5,
                                        borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                    }}
                                >
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{
                                            color: THEME_ACCENT_CSS,
                                            fontWeight: 600,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            minWidth: 0,
                                        }}
                                        title={row.url}
                                    >
                                        {row.url}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="caption" sx={{ flexShrink: 0, fontWeight: 700 }}>
                                        R {row.repurposing}
                                    </MsqdxTypography>
                                </Box>
                            ))}
                        </Stack>
                    </MsqdxMoleculeCard>
                )}

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
                    <Box
                        component="div"
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: `${DOMAIN_TAB_VIRTUAL_SCROLL_GAP_PX}px`,
                            flex: '1 1 auto',
                            minHeight: 0,
                        }}
                    >
                        {generative.pages.map((p) => (
                            <React.Fragment key={p.url}>
                                <GenerativePageScrollRow page={p} onOpenPageUrl={onOpenPageUrl} t={t} />
                            </React.Fragment>
                        ))}
                    </Box>
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
