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

/** Cache per project id so remount (e.g. tab switch) shows last data immediately and avoids flicker. */
const seoSummaryCache = new Map<string, { scanId: string; fullSummary: DomainSummaryResponse }>();

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

    // #region agent log
    const _logPrev = useRef<{ fullSummaryNull: boolean; count: number }>({ fullSummaryNull: true, count: 0 });
    _logPrev.current.count += 1;
    const fullSummaryNull = fullSummary == null;
    const changed = _logPrev.current.fullSummaryNull !== fullSummaryNull;
    _logPrev.current.fullSummaryNull = fullSummaryNull;
    if (typeof window !== 'undefined' && (changed || _logPrev.current.count <= 3)) {
        const cacheHas = id ? seoSummaryCache.has(id) : false;
        fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'seo/page.tsx:render',message:'render',data:{renderCount:_logPrev.current.count,id:id??'null',fullSummaryNull,cacheHas,changed},timestamp:Date.now(),hypothesisId:'F1',runId:'seo-render'})}).catch(()=>{});
    }
    // #endregion

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const cached = seoSummaryCache.get(id);
        // #region agent log
        if (typeof window !== 'undefined') fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'seo/page.tsx:effect',message:'effect',data:{id,hasCached:!!cached},timestamp:Date.now(),hypothesisId:'F2',runId:'seo-effect'})}).catch(()=>{});
        // #endregion
        if (cached) {
            setScanId(cached.scanId);
            setFullSummary(cached.fullSummary);
            setSummaryLoading(false);
        }
        const ac = new AbortController();
        const { signal } = ac;
        setProjectLoading(true);
        if (!cached) setSummaryLoading(true);
        fetch(apiProject(id), { credentials: 'same-origin', signal })
            .then((r) => r.json())
            .then((projectData: { data?: { id: string; domain: string | null } }) => {
                if (signal.aborted) return;
                if (projectData?.data) setProject(projectData.data);
                else setProject(null);
            })
            .catch(() => {
                if (!ac.signal.aborted) setProject(null);
            })
            .finally(() => {
                if (!signal.aborted) setProjectLoading(false);
            });
        fetch(apiProjectDomainSummary(id), { credentials: 'same-origin', signal })
            .then((r) => r.json())
            .then((domainSummaryRes: { success?: boolean; data?: { scanId?: string } }) => {
                if (signal.aborted) return;
                if (domainSummaryRes?.success && domainSummaryRes?.data?.scanId) {
                    const sid = domainSummaryRes.data.scanId;
                    setScanId(sid);
                    return fetch(apiScanDomainSummary(sid), { credentials: 'same-origin', signal })
                        .then((r) => (r.ok ? r.json() : null))
                        .then((payload: DomainSummaryResponse | null) => {
                            if (!signal.aborted && payload) {
                                setFullSummary(payload);
                                seoSummaryCache.set(id, { scanId: sid, fullSummary: payload });
                            }
                        });
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!signal.aborted) setSummaryLoading(false);
            });
        return () => ac.abort();
    }, [id, fetchedForIdRef]);

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
                    {loading ? (
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
