'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFetchOnceForId } from '@/hooks/useFetchOnceForId';
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
import { computeSeoOnPageScore } from '@/lib/seo-on-page-score';
import { SeoOnPageTable, type SeoOnPageRow } from '@/components/SeoOnPageTable';

/** Cache per project id so remount shows last data immediately. Max size to avoid unbounded memory growth. */
const SEO_CACHE_MAX = 5;
const seoSummaryCache = new Map<string, { scanId: string; fullSummary: DomainSummaryResponse }>();

function setSeoCache(id: string, entry: { scanId: string; fullSummary: DomainSummaryResponse }) {
  if (seoSummaryCache.size >= SEO_CACHE_MAX) {
    const firstKey = seoSummaryCache.keys().next().value;
    if (firstKey != null) seoSummaryCache.delete(firstKey);
  }
  seoSummaryCache.set(id, entry);
}

export default function ProjectSeoPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;

    const [project, setProject] = useState<{ id: string; domain: string | null } | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);
    const [scanId, setScanId] = useState<string | null>(() => (id ? seoSummaryCache.get(id)?.scanId ?? null : null));
    const [summaryLoading, setSummaryLoading] = useState(() => !(id && seoSummaryCache.has(id)));
    const [fullSummary, setFullSummary] = useState<DomainSummaryResponse | null>(() => (id ? seoSummaryCache.get(id)?.fullSummary ?? null : null));
    const fetchedForIdRef = useFetchOnceForId();

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const cached = seoSummaryCache.get(id);
        if (cached) {
            setScanId(cached.scanId);
            setFullSummary(cached.fullSummary);
            setSummaryLoading(false);
        }
        const ac = new AbortController();
        const { signal } = ac;
        if (!cached) {
            setProjectLoading(true);
            setSummaryLoading(true);
        }

        (async () => {
            try {
                const [projectRes, domainSummaryRes] = await Promise.all([
                    fetch(apiProject(id), { credentials: 'same-origin', signal }).then((r) => r.json()) as Promise<{ data?: { id: string; domain: string | null } }>,
                    fetch(apiProjectDomainSummary(id), { credentials: 'same-origin', signal }).then((r) => r.json()) as Promise<{ success?: boolean; data?: { scanId?: string } }>,
                ]);
                if (signal.aborted) return;
                let payload: DomainSummaryResponse | null = null;
                const sid = domainSummaryRes?.success && domainSummaryRes?.data?.scanId ? domainSummaryRes.data.scanId : null;
                if (sid) {
                    const scanRes = await fetch(apiScanDomainSummary(sid), { credentials: 'same-origin', signal });
                    if (!signal.aborted && scanRes.ok) payload = await scanRes.json();
                }
                if (signal.aborted) return;
                setProject(projectRes?.data ?? null);
                setProjectLoading(false);
                if (sid) setScanId(sid);
                if (payload) {
                    setFullSummary(payload);
                    setSeoCache(id, { scanId: sid!, fullSummary: payload });
                }
                setSummaryLoading(false);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                setProject(null);
                setProjectLoading(false);
                setSummaryLoading(false);
            }
        })();
        return () => ac.abort();
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
    const seoScore = useMemo(
        () => computeSeoOnPageScore({ seo: aggregatedSeo ?? null, structure: aggregatedStructure ?? null }),
        [aggregatedSeo, aggregatedStructure]
    );
    const seoTableRows = useMemo((): SeoOnPageRow[] => {
        if (!aggregatedSeo?.pages?.length) return [];
        const multiH1Set = new Set(aggregatedStructure?.pagesWithMultipleH1 ?? []);
        const skippedSet = new Set(aggregatedStructure?.pagesWithSkippedLevels ?? []);
        return aggregatedSeo.pages.map((p) => ({
            ...p,
            structure: multiH1Set.has(p.url) ? 'multipleH1' as const : skippedSet.has(p.url) ? 'skippedLevels' as const : 'good' as const,
        }));
    }, [aggregatedSeo?.pages, aggregatedStructure?.pagesWithMultipleH1, aggregatedStructure?.pagesWithSkippedLevels]);
    const handleSeoRowClick = useCallback(
        (url: string) => {
            const page = pagesByUrl.get(url);
            if (page) router.push(pathResults(page.id));
        },
        [pagesByUrl, router]
    );
    const loading = projectLoading || summaryLoading;

    if (!id) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    if (projectLoading && !project && !fullSummary) {
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
                    headerActions={<InfoTooltip title={t('projects.seo.scoreTooltip')} ariaLabel={t('common.info')} />}
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
                    {!fullSummary && loading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                    ) : fullSummary ? (
                        <Box>
                            {hasSeoData && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'baseline', mb: 1 }}>
                                    <Box>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {t('projects.seo.score')}
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                {seoScore.score}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                /100
                                            </MsqdxTypography>
                                        </Box>
                                        <MsqdxChip
                                            label={t(`projects.seo.scoreLabel_${seoScore.label}`)}
                                            size="small"
                                            variant="outlined"
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Box>
                                </Box>
                            )}
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('projects.seo.fromScan')} · {totalPageCount} {t('domainResult.pagesScanned')}
                            </MsqdxTypography>
                        </Box>
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

                {fullSummary && !hasSeoData && (
                    <MsqdxMoleculeCard variant="flat" borderRadius="lg" sx={{ bgcolor: 'var(--color-card-bg)' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.seo.noScan')}
                        </MsqdxTypography>
                    </MsqdxMoleculeCard>
                )}

                {fullSummary && hasSeoData && (
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

                        {/* Unified table: all pages with Meta, H1, structure, content */}
                        {aggregatedSeo && seoTableRows.length > 0 && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.tableTitle')}
                                subtitle={t('projects.seo.pagesByContentSubtitle')}
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <SeoOnPageTable rows={seoTableRows} onRowClick={handleSeoRowClick} />
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

                    </>
                )}
            </Stack>
        </Box>
    );
}
