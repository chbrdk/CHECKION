'use client';

import React, { memo, useCallback, useState } from 'react';
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { RemotePaginationBar } from '@/components/RemotePaginationBar';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { PageSeoSummary } from '@/lib/domain-aggregation';
import {
    DOMAIN_SEO_PAGES_PAGE_SIZE,
    DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
    apiScanDomainSeoPages,
} from '@/lib/constants';

export type DomainResultLinksSeoSectionProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    locale: string;
    domainId: string;
    aggregated: NonNullable<DomainSummaryApiResponse['aggregated']>;
    onOpenPageUrl: (url: string) => void;
};

function DomainResultLinksSeoSectionInner({
    t,
    locale,
    domainId,
    aggregated,
    onOpenPageUrl,
}: DomainResultLinksSeoSectionProps) {
    const [seoPageIndex, setSeoPageIndex] = useState(0);
    const [seoSort, setSeoSort] = useState<'wordCount' | 'url'>('wordCount');
    const [seoDir, setSeoDir] = useState<'asc' | 'desc'>('desc');

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
        enabled: Boolean(domainId) && Boolean(aggregated.seo),
    });

    const seoRows = seoQuery.data?.data ?? [];
    const seoTotal = seoQuery.data?.total ?? aggregated.seo?.totalPages ?? 0;
    const seoLoading = seoQuery.isFetching;

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--msqdx-spacing-md)' }}>
            {aggregated.seo && (
                <MsqdxMoleculeCard title="SEO (Domain)" headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />} subtitle="Meta, Keywords seitenübergreifend, Inhaltsdichte" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Meta & Struktur</MsqdxTypography>
                            <Box sx={{ display: 'grid', gap: 0.5 }}>
                                <MsqdxTypography variant="body2">Seiten mit Title: {aggregated.seo.withTitle} / {aggregated.seo.totalPages}</MsqdxTypography>
                                <MsqdxTypography variant="body2">Seiten mit Meta-Description: {aggregated.seo.withMetaDescription} / {aggregated.seo.totalPages}</MsqdxTypography>
                                <MsqdxTypography variant="body2">Seiten mit H1: {aggregated.seo.withH1} / {aggregated.seo.totalPages}</MsqdxTypography>
                                {aggregated.seo.totalWordsAcrossPages > 0 && (
                                    <MsqdxTypography variant="body2">Wörter gesamt (alle Seiten): {aggregated.seo.totalWordsAcrossPages.toLocaleString('de-DE')}</MsqdxTypography>
                                )}
                            </Box>
                            {(() => {
                                const seoMissingMetaCount = Math.max(
                                    0,
                                    aggregated.seo.totalPages - aggregated.seo.withMetaDescription
                                );
                                const missingMetaUrls = aggregated.seo.missingMetaDescriptionUrls ?? [];
                                const showMissingMetaBlock =
                                    seoMissingMetaCount > 0 || missingMetaUrls.length > 0;
                                const moreMissingMeta = Math.max(
                                    0,
                                    seoMissingMetaCount - Math.min(5, missingMetaUrls.length)
                                );
                                if (!showMissingMetaBlock) return null;
                                return (
                                    <Box sx={{ mt: 1 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>Ohne Meta-Description:</MsqdxTypography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {missingMetaUrls.slice(0, 5).map((url) => (
                                                <Box
                                                    key={url}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.5,
                                                        py: 0.25,
                                                        pr: 0.5,
                                                        border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                                        borderRadius: 1,
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
                                        </Box>
                                        {moreMissingMeta > 0 && (
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.5, display: 'block' }}>
                                                {t('domainResult.missingMetaMoreUrls', {
                                                    count: moreMissingMeta,
                                                })}
                                            </MsqdxTypography>
                                        )}
                                    </Box>
                                );
                            })()}
                        </Box>

                        {aggregated.seo.crossPageKeywords.length > 0 && (
                            <Box>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Keywords seitenübergreifend (Top)</MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                                    Begriffe, die auf mehreren Seiten vorkommen; sortiert nach Gesamt-Vorkommen.
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {aggregated.seo.crossPageKeywords.slice(0, 25).map((kw) => (
                                        <MsqdxChip
                                            key={kw.keyword}
                                            label={`${kw.keyword} (${kw.totalCount}×, ${kw.pageCount} Seite(n), Ø ${kw.avgDensityPercent}%)`}
                                            size="small"
                                            sx={{ fontSize: '0.7rem', height: 22 }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        <Box>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten nach Inhalt & Dichte</MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                                Sortiert serverseitig; &lt;300 Wörter = Skinny Content.
                            </MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1, alignItems: 'center' }}>
                                <MsqdxButton size="small" variant={seoSort === 'wordCount' ? 'contained' : 'outlined'} onClick={() => handleSeoSort('wordCount')}>
                                    Wörter {seoSort === 'wordCount' ? (seoDir === 'desc' ? '↓' : '↑') : ''}
                                </MsqdxButton>
                                <MsqdxButton size="small" variant={seoSort === 'url' ? 'contained' : 'outlined'} onClick={() => handleSeoSort('url')}>
                                    URL {seoSort === 'url' ? (seoDir === 'desc' ? '↓' : '↑') : ''}
                                </MsqdxButton>
                            </Box>
                            {seoLoading && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <CircularProgress size={20} sx={{ color: 'var(--color-theme-accent)' }} />
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {t('common.loading')}
                                    </MsqdxTypography>
                                </Box>
                            )}
                            <VirtualScrollList
                                items={seoRows}
                                maxHeight={320}
                                estimateSize={DOMAIN_TAB_SEO_PAGE_ROW_ESTIMATE_PX}
                                overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                                getItemKey={(row) => row.url}
                                renderItem={(row) => (
                                    <Box
                                        sx={{
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            mb: 0.75,
                                            px: 1,
                                            py: 0.75,
                                            border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
                                            <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={row.url}>
                                                {row.url}
                                            </MsqdxTypography>
                                            <Tooltip title={t('domainResult.openPage')}>
                                                <IconButton
                                                    size="small"
                                                    aria-label={t('domainResult.openPageAria', { url: row.url })}
                                                    onClick={() => onOpenPageUrl(row.url)}
                                                    sx={{ flexShrink: 0 }}
                                                >
                                                    <ExternalLink size={16} strokeWidth={2} aria-hidden />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, mt: 0.5, rowGap: 0.5 }}>
                                            <MsqdxTypography variant="caption" component="span" sx={{ fontWeight: 600 }}>
                                                {t('domainResult.seoWordCount', { count: row.wordCount.toLocaleString(locale === 'en' ? 'en-US' : 'de-DE') })}
                                            </MsqdxTypography>
                                            {row.topKeywordCount > 0 && (
                                                <MsqdxTypography variant="caption" component="span" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                    {t('domainResult.seoTopKeywords', { count: row.topKeywordCount })}
                                                </MsqdxTypography>
                                            )}
                                            {row.isSkinny && (
                                                <MsqdxChip
                                                    label={t('domainResult.seoSkinnyChip')}
                                                    size="small"
                                                    sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'var(--color-secondary-dx-orange-tint)', color: 'var(--color-secondary-dx-orange)' }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            />
                            <RemotePaginationBar
                                page={seoPageIndex}
                                pageSize={DOMAIN_SEO_PAGES_PAGE_SIZE}
                                total={seoTotal}
                                loading={seoLoading}
                                onPageChange={setSeoPageIndex}
                                labels={{ prev: t('share.back'), next: t('share.next') }}
                            />
                        </Box>
                    </Box>
                </MsqdxMoleculeCard>
            )}
            {aggregated.links && (
                <MsqdxMoleculeCard title="Links (Domain)" headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />} subtitle="Kaputte Links über alle Seiten" variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                    bgcolor: 'color-mix(in srgb, var(--color-secondary-dx-red) 7%, transparent)',
                                }}
                            >
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.25 }}>
                                    {t('domainResult.linksStatBrokenTitle')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {aggregated.links.broken.length.toLocaleString(locale === 'en' ? 'en-US' : 'de-DE')}
                                </MsqdxTypography>
                            </Box>
                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                }}
                            >
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.25 }}>
                                    {t('domainResult.linksStatUniqueTitle')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {aggregated.links.uniqueBrokenUrls.toLocaleString(locale === 'en' ? 'en-US' : 'de-DE')}
                                </MsqdxTypography>
                            </Box>
                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1,
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                    gridColumn: { xs: '1', sm: 'auto' },
                                }}
                            >
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.25 }}>
                                    {t('domainResult.linksStatTotalLinksTitle')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                    {aggregated.links.totalLinks.toLocaleString(locale === 'en' ? 'en-US' : 'de-DE')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.5, display: 'block' }}>
                                    {t('domainResult.linksStatSummaryLine', {
                                        internal: aggregated.links.internal,
                                        external: aggregated.links.external,
                                    })}
                                </MsqdxTypography>
                            </Box>
                        </Box>
                        {aggregated.links.brokenByPage.length > 0 && (
                            <Box sx={{ mt: 0.5 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                    {t('domainResult.linksMostBrokenTitle')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    {aggregated.links.brokenByPage.slice(0, 10).map(({ url, count }) => (
                                        <Box
                                            key={url}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.75,
                                                py: 0.35,
                                                px: 1,
                                                border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                                borderRadius: 1,
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
                                </Box>
                            </Box>
                        )}
                    </Box>
                </MsqdxMoleculeCard>
            )}
        </Box>
    );
}

export const DomainResultLinksSeoSection = memo(DomainResultLinksSeoSectionInner);

function DomainResultLinksSeoEmptyInner({ t }: { t: (key: string) => string }) {
    return (
        <MsqdxMoleculeCard title="Links & SEO (Domain)" headerActions={<InfoTooltip title={t('info.linksSeo')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine SEO- oder Link-Daten verfügbar.</MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultLinksSeoEmpty = memo(DomainResultLinksSeoEmptyInner);
