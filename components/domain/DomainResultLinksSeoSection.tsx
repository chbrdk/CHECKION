'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { CrossPageKeyword } from '@/lib/domain-aggregation';
import { Box, CircularProgress, IconButton, Stack, Tooltip } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { ExternalLink } from 'lucide-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { VirtualChipList } from '@/components/VirtualChipList';
import { RemotePaginationBar } from '@/components/RemotePaginationBar';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { AggregatedLinks, AggregatedSeo, PageSeoSummary } from '@/lib/domain-aggregation';
import { SeoDensityScrollRow } from '@/components/domain/SeoDensityScrollRow';
import {
    DOMAIN_SEO_PAGES_PAGE_SIZE,
    DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
    apiScanDomainSeoPages,
} from '@/lib/constants';
import { MSQDX_INNER_CARD_BORDER_SX, MSQDX_BUTTON_THEME_ACCENT_SX } from '@/lib/theme-accent';

export type DomainResultLinksSeoSectionProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    locale: string;
    domainId: string;
    aggregated: NonNullable<DomainSummaryApiResponse['aggregated']>;
    onOpenPageUrl: (url: string) => void;
};

type SeoPanelProps = {
    t: DomainResultLinksSeoSectionProps['t'];
    locale: string;
    domainId: string;
    seo: AggregatedSeo;
    onOpenPageUrl: (url: string) => void;
};

const INNER_CARD_SX = {
    bgcolor: 'var(--color-card-bg)',
    ...MSQDX_INNER_CARD_BORDER_SX,
    width: '100%',
} as const;

/** SEO card + paginated API + virtual list — isolated so refetch does not re-render the Links card. */
const DomainResultSeoPanel = memo(function DomainResultSeoPanel({ t, locale, domainId, seo, onOpenPageUrl }: SeoPanelProps) {
    const [seoPageIndex, setSeoPageIndex] = useState(0);
    const [seoSort, setSeoSort] = useState<'wordCount' | 'url'>('wordCount');
    const [seoDir, setSeoDir] = useState<'asc' | 'desc'>('desc');
    const lc = locale === 'en' ? 'en-US' : 'de-DE';

    const handleSeoSort = useCallback((next: 'wordCount' | 'url') => {
        setSeoPageIndex(0);
        setSeoSort((prev) => {
            if (prev === next) {
                setSeoDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                return prev;
            }
            setSeoDir(next === 'wordCount' ? 'desc' : 'asc');
            return next;
        });
    }, []);

    const seoQuery = useQuery({
        queryKey: ['domain-seo-pages', domainId, seoPageIndex, seoSort, seoDir],
        queryFn: async () => {
            const offset = seoPageIndex * DOMAIN_SEO_PAGES_PAGE_SIZE;
            const res = await fetch(
                apiScanDomainSeoPages(domainId, {
                    offset,
                    limit: DOMAIN_SEO_PAGES_PAGE_SIZE,
                    sort: seoSort,
                    dir: seoDir,
                }),
                { credentials: 'same-origin' }
            );
            if (!res.ok) throw new Error('seo-pages failed');
            return res.json() as Promise<{ data?: PageSeoSummary[]; total?: number }>;
        },
        enabled: Boolean(domainId),
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
    });

    const seoRows = seoQuery.data?.data ?? [];
    const seoTotal = seoQuery.data?.total ?? seo.totalPages ?? 0;
    const hasSeoRows = seoRows.length > 0;
    const seoInitialLoading = seoQuery.isPending && !hasSeoRows;
    const seoRefetching = seoQuery.isFetching && !seoQuery.isPending;

    const renderSeoRow = useCallback(
        (row: PageSeoSummary, _index: number) => (
            <SeoDensityScrollRow row={row} locale={locale} onOpenPageUrl={onOpenPageUrl} t={t} />
        ),
        [locale, onOpenPageUrl, t]
    );

    const paginationLabels = useMemo(
        () => ({ prev: t('share.back'), next: t('share.next') }),
        [t]
    );

    const crossPageKeywordItems = useMemo(() => seo.crossPageKeywords.slice(0, 25), [seo.crossPageKeywords]);

    const renderCrossPageKeywordChip = useCallback(
        (kw: CrossPageKeyword) => (
            <MsqdxChip
                label={t('domainResult.linksSeoKeywordChip', {
                    keyword: kw.keyword,
                    totalCount: kw.totalCount,
                    pageCount: kw.pageCount,
                    avg: kw.avgDensityPercent,
                })}
                size="small"
                sx={{ fontSize: '0.7rem', height: 22 }}
            />
        ),
        [t]
    );

    const kpiCell = (labelKey: string, value: string) => (
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
            <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mt: 0.5, lineHeight: 1.2 }}>
                {value}
            </MsqdxTypography>
        </Box>
    );

    const missingMetaBlock = useMemo(() => {
        const seoMissingMetaCount = Math.max(0, seo.totalPages - seo.withMetaDescription);
        const missingMetaUrls = seo.missingMetaDescriptionUrls ?? [];
        const showMissingMetaBlock = seoMissingMetaCount > 0 || missingMetaUrls.length > 0;
        const moreMissingMeta = Math.max(0, seoMissingMetaCount - Math.min(5, missingMetaUrls.length));
        if (!showMissingMetaBlock) return null;
        return (
            <Box sx={{ mt: 0.5 }}>
                <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
                    {t('domainResult.linksSeoMissingMetaTitle')}
                </MsqdxTypography>
                <Stack spacing={0.5}>
                    {missingMetaUrls.slice(0, 5).map((url) => (
                        <Box
                            key={url}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                py: 0.5,
                                pr: 0.5,
                                borderRadius: 'var(--msqdx-radius-md)',
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                px: 1,
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
                {moreMissingMeta > 0 && (
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.75, display: 'block' }}>
                        {t('domainResult.missingMetaMoreUrls', {
                            count: moreMissingMeta,
                        })}
                    </MsqdxTypography>
                )}
            </Box>
        );
    }, [onOpenPageUrl, seo.missingMetaDescriptionUrls, seo.totalPages, seo.withMetaDescription, t]);

    return (
        <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'stretch',
                    gap: 2,
                    width: '100%',
                    minWidth: 0,
                }}
            >
                <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
                    <MsqdxMoleculeCard
                        title={t('domainResult.linksSeoMetaCardTitle')}
                        titleVariant="h6"
                        subtitle={t('domainResult.linksSeoMetaCardIntro')}
                        variant="flat"
                        borderRadius="1.5xl"
                        footerDivider={false}
                        sx={INNER_CARD_SX}
                    >
                        <Stack spacing={1.5}>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                                    gap: 1.5,
                                }}
                            >
                                {kpiCell('domainResult.linksSeoKpiWithTitle', `${seo.withTitle} / ${seo.totalPages}`)}
                                {kpiCell('domainResult.linksSeoKpiWithMeta', `${seo.withMetaDescription} / ${seo.totalPages}`)}
                                {kpiCell('domainResult.linksSeoKpiWithH1', `${seo.withH1} / ${seo.totalPages}`)}
                                {seo.totalWordsAcrossPages > 0
                                    ? kpiCell(
                                          'domainResult.linksSeoKpiTotalWords',
                                          seo.totalWordsAcrossPages.toLocaleString(lc)
                                      )
                                    : null}
                            </Box>
                            {missingMetaBlock}
                        </Stack>
                    </MsqdxMoleculeCard>
                </Box>

                {seo.crossPageKeywords.length > 0 ? (
                    <Box sx={{ flex: { md: '1 1 0' }, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
                        <MsqdxMoleculeCard
                            title={t('domainResult.linksSeoKeywordsCardTitle')}
                            titleVariant="h6"
                            subtitle={t('domainResult.linksSeoKeywordsCardIntro')}
                            variant="flat"
                            borderRadius="1.5xl"
                            footerDivider={false}
                            sx={INNER_CARD_SX}
                        >
                            <VirtualChipList
                                items={crossPageKeywordItems}
                                getItemKey={(kw) => kw.keyword}
                                renderChip={renderCrossPageKeywordChip}
                            />
                        </MsqdxMoleculeCard>
                    </Box>
                ) : null}
            </Box>

            <MsqdxMoleculeCard
                title={t('domainResult.linksSeoDensityCardTitle')}
                titleVariant="h6"
                subtitle={t('domainResult.linksSeoDensityCardIntro')}
                variant="flat"
                borderRadius="1.5xl"
                footerDivider={false}
                sx={INNER_CARD_SX}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.25, alignItems: 'center' }}>
                    <MsqdxButton
                        size="small"
                        variant={seoSort === 'wordCount' ? 'contained' : 'outlined'}
                        onClick={() => handleSeoSort('wordCount')}
                        sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                    >
                        {t('domainResult.linksSeoSortWords')}
                        {seoSort === 'wordCount' ? (seoDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </MsqdxButton>
                    <MsqdxButton
                        size="small"
                        variant={seoSort === 'url' ? 'contained' : 'outlined'}
                        onClick={() => handleSeoSort('url')}
                        sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                    >
                        {t('domainResult.linksSeoSortUrl')}
                        {seoSort === 'url' ? (seoDir === 'desc' ? ' ↓' : ' ↑') : ''}
                    </MsqdxButton>
                </Box>
                {seoInitialLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} sx={{ color: 'var(--color-theme-accent)' }} />
                    </Box>
                ) : (
                    <VirtualScrollList
                        items={seoRows}
                        maxHeight={320}
                        estimateSize={DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX}
                        overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                        getItemKey={(row) => row.url}
                        renderItem={renderSeoRow}
                    />
                )}
                <RemotePaginationBar
                    page={seoPageIndex}
                    pageSize={DOMAIN_SEO_PAGES_PAGE_SIZE}
                    total={seoTotal}
                    loading={seoRefetching}
                    onPageChange={setSeoPageIndex}
                    labels={paginationLabels}
                />
            </MsqdxMoleculeCard>
        </Stack>
    );
});

type LinksPanelProps = {
    t: DomainResultLinksSeoSectionProps['t'];
    locale: string;
    links: AggregatedLinks;
    onOpenPageUrl: (url: string) => void;
};

/** Links aggregate card — no React Query; does not re-render when SEO pages fetch. */
const DomainResultLinksPanel = memo(function DomainResultLinksPanel({ t, locale, links, onOpenPageUrl }: LinksPanelProps) {
    const lc = locale === 'en' ? 'en-US' : 'de-DE';

    const statCell = (label: string, value: string, summaryLine?: string, emphasizeBroken?: boolean) => (
        <Box
            sx={{
                p: 1.5,
                borderRadius: 'var(--msqdx-radius-md)',
                ...MSQDX_INNER_CARD_BORDER_SX,
                bgcolor: emphasizeBroken
                    ? 'color-mix(in srgb, var(--color-secondary-dx-red) 8%, var(--color-card-bg))'
                    : 'var(--color-card-bg)',
            }}
        >
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                {label}
            </MsqdxTypography>
            <MsqdxTypography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>
                {value}
            </MsqdxTypography>
            {summaryLine ? (
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.75, display: 'block' }}>
                    {summaryLine}
                </MsqdxTypography>
            ) : null}
        </Box>
    );

    return (
        <Stack spacing={2} sx={{ width: '100%', minWidth: 0 }}>
            <MsqdxMoleculeCard
                title={t('domainResult.linksSeoLinksStatsCardTitle')}
                titleVariant="h6"
                subtitle={t('domainResult.linksSeoLinksStatsCardIntro')}
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
                    {statCell(
                        t('domainResult.linksStatBrokenTitle'),
                        links.broken.length.toLocaleString(lc),
                        undefined,
                        true
                    )}
                    {statCell(t('domainResult.linksStatUniqueTitle'), links.uniqueBrokenUrls.toLocaleString(lc))}
                    {statCell(
                        t('domainResult.linksStatTotalLinksTitle'),
                        links.totalLinks.toLocaleString(lc),
                        t('domainResult.linksStatSummaryLine', {
                            internal: links.internal,
                            external: links.external,
                        })
                    )}
                </Box>
            </MsqdxMoleculeCard>

            {links.brokenByPage.length > 0 ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.linksSeoMostBrokenCardTitle')}
                    titleVariant="h6"
                    subtitle={t('domainResult.linksSeoMostBrokenCardIntro')}
                    variant="flat"
                    borderRadius="1.5xl"
                    footerDivider={false}
                    sx={INNER_CARD_SX}
                >
                    <Stack spacing={0.75}>
                        {links.brokenByPage.slice(0, 10).map(({ url, count }) => (
                            <Box
                                key={url}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.75,
                                    py: 0.5,
                                    px: 1,
                                    borderRadius: 'var(--msqdx-radius-md)',
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                }}
                            >
                                <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={url}>
                                    {url}
                                </MsqdxTypography>
                                <MsqdxChip
                                    label={t('domainResult.linksBrokenCount', { count })}
                                    size="small"
                                    sx={{
                                        flexShrink: 0,
                                        height: 22,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        bgcolor: 'var(--color-secondary-dx-red-tint)',
                                        color: 'var(--color-secondary-dx-red)',
                                    }}
                                />
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
    );
});

function DomainResultLinksSeoSectionInner({
    t,
    locale,
    domainId,
    aggregated,
    onOpenPageUrl,
}: DomainResultLinksSeoSectionProps) {
    const hasSeo = Boolean(aggregated.seo);
    const hasLinks = Boolean(aggregated.links);
    const twoCol = hasSeo && hasLinks;

    return (
        <MsqdxMoleculeCard
            title={t('domainResult.linksSeoSectionTitle')}
            headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />}
            subtitle={t('domainResult.linksSeoSectionSubtitle')}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: twoCol ? 'row' : 'column' },
                    alignItems: 'stretch',
                    gap: 2,
                    width: '100%',
                    minWidth: 0,
                }}
            >
                {hasSeo ? (
                    <Box
                        sx={{
                            flex: twoCol ? { lg: '1 1 0' } : 'none',
                            minWidth: 0,
                            width: { xs: '100%', lg: twoCol ? 'auto' : '100%' },
                        }}
                    >
                        <DomainResultSeoPanel t={t} locale={locale} domainId={domainId} seo={aggregated.seo!} onOpenPageUrl={onOpenPageUrl} />
                    </Box>
                ) : null}
                {hasLinks ? (
                    <Box
                        sx={{
                            flex: twoCol ? { lg: '1 1 0' } : 'none',
                            minWidth: 0,
                            width: { xs: '100%', lg: twoCol ? 'auto' : '100%' },
                        }}
                    >
                        <DomainResultLinksPanel t={t} locale={locale} links={aggregated.links!} onOpenPageUrl={onOpenPageUrl} />
                    </Box>
                ) : null}
            </Box>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultLinksSeoSection = memo(DomainResultLinksSeoSectionInner);

function DomainResultLinksSeoEmptyInner({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
    return (
        <MsqdxMoleculeCard
            title={t('domainResult.linksSeoEmptyCardTitle')}
            headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />}
            variant="flat"
            borderRadius="1.5xl"
            footerDivider={false}
            sx={{ bgcolor: 'var(--color-card-bg)' }}
        >
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                {t('domainResult.linksSeoEmpty')}
            </MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultLinksSeoEmpty = memo(DomainResultLinksSeoEmptyInner);
