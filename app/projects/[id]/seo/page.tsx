'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import {
    apiProject,
    apiProjectDomainSummary,
    apiScanDomainSummary,
    pathDomain,
    pathResults,
    pathScanDomain,
    pathProject,
} from '@/lib/constants';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import type { AggregatedSeo, AggregatedStructure } from '@/lib/domain-aggregation';

export default function ProjectSeoPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;

    const [project, setProject] = useState<{ id: string; domain: string | null } | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);
    const [scanId, setScanId] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [fullSummary, setFullSummary] = useState<DomainSummaryResponse | null>(null);

    const loadProject = useCallback(async () => {
        if (!id) return;
        setProjectLoading(true);
        try {
            const res = await fetch(apiProject(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (data?.data) setProject(data.data);
            else setProject(null);
        } catch {
            setProject(null);
        } finally {
            setProjectLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!id) return;
        setSummaryLoading(true);
        setScanId(null);
        setFullSummary(null);
        fetch(apiProjectDomainSummary(id), { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((domainSummaryRes: { success?: boolean; data?: { scanId?: string } }) => {
                if (domainSummaryRes?.success && domainSummaryRes?.data?.scanId) {
                    setScanId(domainSummaryRes.data.scanId);
                    return fetch(apiScanDomainSummary(domainSummaryRes.data.scanId), { credentials: 'same-origin' })
                        .then((r) => (r.ok ? r.json() : null))
                        .then((payload: DomainSummaryResponse | null) => {
                            if (payload) setFullSummary(payload);
                        });
                }
            })
            .catch(() => {})
            .finally(() => setSummaryLoading(false));
    }, [id]);

    const pagesByUrl = useMemo(() => {
        const pages = fullSummary?.pages;
        if (!pages || !Array.isArray(pages)) return new Map<string, SlimPage>();
        const map = new Map<string, SlimPage>();
        for (const p of pages as SlimPage[]) {
            if (p?.url != null) map.set(p.url, p);
        }
        return map;
    }, [fullSummary?.pages]);

    const aggregatedSeo = fullSummary?.aggregated?.seo as AggregatedSeo | null | undefined;
    const aggregatedStructure = fullSummary?.aggregated?.structure as AggregatedStructure | null | undefined;
    const totalPageCount = fullSummary?.totalPageCount ?? fullSummary?.pages?.length ?? (fullSummary as { totalPages?: number } | undefined)?.totalPages ?? 0;
    const hasSeoData = aggregatedSeo != null || aggregatedStructure != null;
    const loading = projectLoading || summaryLoading;

    if (!id) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    if (projectLoading && !project) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
            </Box>
        );
    }

    return (
        <Box sx={{ py: 'var(--msqdx-spacing-md)', px: 1.5, width: '100%', maxWidth: '100%' }}>
            <Stack sx={{ gap: 2 }}>
                {/* Header / context card */}
                <MsqdxMoleculeCard
                    title={t('projects.seo.title')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    headerActions={<InfoTooltip title={t('info.seoOnPage')} ariaLabel={t('common.info')} />}
                    actions={
                        scanId ? (
                            <Link href={pathDomain(scanId)} style={{ textDecoration: 'none' }}>
                                <MsqdxButton variant="outlined" size="small">
                                    {t('projects.seo.openDeepScan')}
                                </MsqdxButton>
                            </Link>
                        ) : null
                    }
                >
                    {loading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                    ) : fullSummary ? (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.seo.fromScan')} · {totalPageCount} {t('domainResult.pagesScanned')}
                        </MsqdxTypography>
                    ) : !scanId ? (
                        <>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                                {t('projects.seo.noScan')}
                            </MsqdxTypography>
                            <Link
                                href={project?.domain ? pathScanDomain({ url: project.domain }) : pathProject(id)}
                                style={{ textDecoration: 'none' }}
                            >
                                <MsqdxButton variant="outlined" size="small">
                                    {t('projects.seo.startScan')}
                                </MsqdxButton>
                            </Link>
                        </>
                    ) : (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('common.loading')}
                        </MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>

                {!loading && fullSummary && !hasSeoData && (
                    <MsqdxMoleculeCard variant="flat" borderRadius="lg" sx={{ bgcolor: 'var(--color-card-bg)' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.seo.noScan')}
                        </MsqdxTypography>
                    </MsqdxMoleculeCard>
                )}

                {!loading && fullSummary && hasSeoData && (
                    <>
                        {/* Overview Meta & Basis */}
                        {aggregatedSeo && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.overview')}
                                subtitle={t('projects.seo.overviewSubtitle')}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                    <MsqdxTypography variant="body2">
                                        {t('projects.seo.withTitle')}: {aggregatedSeo.withTitle} / {aggregatedSeo.totalPages}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="body2">
                                        {t('projects.seo.withMetaDescription')}: {aggregatedSeo.withMetaDescription} / {aggregatedSeo.totalPages}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="body2">
                                        {t('projects.seo.withH1')}: {aggregatedSeo.withH1} / {aggregatedSeo.totalPages}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="body2">
                                        {t('projects.seo.withCanonical')}: {aggregatedSeo.withCanonical} / {aggregatedSeo.totalPages}
                                    </MsqdxTypography>
                                    {aggregatedSeo.totalWordsAcrossPages > 0 && (
                                        <MsqdxTypography variant="body2" sx={{ mt: 0.5 }}>
                                            {t('projects.seo.totalWords')}: {aggregatedSeo.totalWordsAcrossPages.toLocaleString('de-DE')}
                                        </MsqdxTypography>
                                    )}
                                </Box>
                            </MsqdxMoleculeCard>
                        )}

                        {/* Pages without Meta-Description */}
                        {aggregatedSeo && aggregatedSeo.missingMetaDescriptionUrls.length > 0 && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.pagesWithoutMetaDescription')}
                                subtitle={t('projects.seo.pagesCount', { count: aggregatedSeo.missingMetaDescriptionUrls.length })}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 280, overflow: 'auto' }}>
                                    {aggregatedSeo.missingMetaDescriptionUrls.map((url) => {
                                        const page = pagesByUrl.get(url);
                                        return (
                                            <Box component="li" key={url} sx={{ py: 0.5, borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                                                {page ? (
                                                    <MsqdxButton
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => router.push(pathResults(page.id))}
                                                        sx={{ textTransform: 'none', fontSize: '0.75rem', justifyContent: 'flex-start' }}
                                                    >
                                                        {url}
                                                    </MsqdxButton>
                                                ) : (
                                                    <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                        {url}
                                                    </MsqdxTypography>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </MsqdxMoleculeCard>
                        )}

                        {/* Pages without H1 */}
                        {aggregatedSeo && aggregatedSeo.missingH1Urls.length > 0 && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.pagesWithoutH1')}
                                subtitle={t('projects.seo.pagesCount', { count: aggregatedSeo.missingH1Urls.length })}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 280, overflow: 'auto' }}>
                                    {aggregatedSeo.missingH1Urls.map((url) => {
                                        const page = pagesByUrl.get(url);
                                        return (
                                            <Box component="li" key={url} sx={{ py: 0.5, borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                                                {page ? (
                                                    <MsqdxButton
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => router.push(pathResults(page.id))}
                                                        sx={{ textTransform: 'none', fontSize: '0.75rem', justifyContent: 'flex-start' }}
                                                    >
                                                        {url}
                                                    </MsqdxButton>
                                                ) : (
                                                    <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                        {url}
                                                    </MsqdxTypography>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </MsqdxMoleculeCard>
                        )}

                        {/* Structure */}
                        {aggregatedStructure && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.structureTitle')}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                    <MsqdxChip
                                        label={`${t('projects.seo.multipleH1')}: ${aggregatedStructure.pagesWithMultipleH1.length}`}
                                        size="small"
                                        brandColor="pink"
                                    />
                                    <MsqdxChip
                                        label={`${t('projects.seo.skippedLevels')}: ${aggregatedStructure.pagesWithSkippedLevels.length}`}
                                        size="small"
                                        brandColor="yellow"
                                    />
                                    {aggregatedStructure.pagesWithGoodStructure.length > 0 && (
                                        <MsqdxChip
                                            label={`${t('projects.seo.goodStructure')}: ${aggregatedStructure.pagesWithGoodStructure.length}`}
                                            size="small"
                                            brandColor="green"
                                        />
                                    )}
                                </Box>
                                {aggregatedStructure.pagesWithMultipleH1.length > 0 && (
                                    <Box sx={{ mb: 1 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>{t('projects.seo.multipleH1')}</MsqdxTypography>
                                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                            {aggregatedStructure.pagesWithMultipleH1.slice(0, 10).map((url) => {
                                                const page = pagesByUrl.get(url);
                                                return (
                                                    <Box component="li" key={url} sx={{ py: 0.25 }}>
                                                        {page ? (
                                                            <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                                                {url}
                                                            </MsqdxButton>
                                                        ) : (
                                                            <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</MsqdxTypography>
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                            {aggregatedStructure.pagesWithMultipleH1.length > 10 && (
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                    +{aggregatedStructure.pagesWithMultipleH1.length - 10} {t('projects.seo.more')}
                                                </MsqdxTypography>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                                {aggregatedStructure.pagesWithSkippedLevels.length > 0 && (
                                    <Box>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>{t('projects.seo.skippedLevels')}</MsqdxTypography>
                                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                            {aggregatedStructure.pagesWithSkippedLevels.slice(0, 10).map((url) => {
                                                const page = pagesByUrl.get(url);
                                                return (
                                                    <Box component="li" key={url} sx={{ py: 0.25 }}>
                                                        {page ? (
                                                            <MsqdxButton size="small" variant="text" onClick={() => router.push(pathResults(page.id))} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                                                                {url}
                                                            </MsqdxButton>
                                                        ) : (
                                                            <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</MsqdxTypography>
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                            {aggregatedStructure.pagesWithSkippedLevels.length > 10 && (
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                    +{aggregatedStructure.pagesWithSkippedLevels.length - 10} {t('projects.seo.more')}
                                                </MsqdxTypography>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </MsqdxMoleculeCard>
                        )}

                        {/* Cross-Page Keywords */}
                        {aggregatedSeo && aggregatedSeo.crossPageKeywords.length > 0 && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.crossPageKeywords')}
                                subtitle={t('projects.seo.crossPageKeywordsSubtitle')}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {aggregatedSeo.crossPageKeywords.slice(0, 50).map((kw) => (
                                        <MsqdxChip
                                            key={kw.keyword}
                                            label={`${kw.keyword} (${kw.totalCount}×, ${kw.pageCount} ${t('projects.seo.pagesShort')}, Ø ${kw.avgDensityPercent}%)`}
                                            size="small"
                                            sx={{ fontSize: '0.7rem', height: 22 }}
                                        />
                                    ))}
                                </Box>
                            </MsqdxMoleculeCard>
                        )}

                        {/* Pages by content & density */}
                        {aggregatedSeo && aggregatedSeo.pages.length > 0 && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.pagesByContent')}
                                subtitle={t('projects.seo.pagesByContentSubtitle')}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, maxHeight: 360, overflow: 'auto' }}>
                                    {aggregatedSeo.pages.map((row) => {
                                        const page = pagesByUrl.get(row.url);
                                        return (
                                            <Box
                                                component="li"
                                                key={row.url}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                    py: 0.5,
                                                    borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                                    flexWrap: 'wrap',
                                                }}
                                            >
                                                {page ? (
                                                    <MsqdxButton
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => router.push(pathResults(page.id))}
                                                        sx={{ textTransform: 'none', fontSize: '0.75rem', flex: '1 1 auto', minWidth: 0, justifyContent: 'flex-start' }}
                                                    >
                                                        {row.url}
                                                    </MsqdxButton>
                                                ) : (
                                                    <MsqdxTypography variant="caption" sx={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {row.url}
                                                    </MsqdxTypography>
                                                )}
                                                <MsqdxTypography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                                                    {row.wordCount.toLocaleString('de-DE')} {t('projects.seo.words')}
                                                </MsqdxTypography>
                                                {row.topKeywordCount > 0 && (
                                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                        {row.topKeywordCount} {t('projects.seo.topKeywords')}
                                                    </MsqdxTypography>
                                                )}
                                                {row.isSkinny && (
                                                    <MsqdxChip label={t('projects.seo.skinny')} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'var(--color-secondary-dx-orange-tint)', color: 'var(--color-secondary-dx-orange)' }} />
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </MsqdxMoleculeCard>
                        )}
                    </>
                )}
            </Stack>
        </Box>
    );
}
