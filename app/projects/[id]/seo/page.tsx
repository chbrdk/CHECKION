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
    const fetchedForIdRef = useFetchOnceForId();

    useEffect(() => {
        if (!id) return;
        // #region agent log
        const refCurrent = fetchedForIdRef.current;
        const skipped = refCurrent === id;
        fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'seo/page.tsx:effect',message:'effect run',data:{id,refCurrent,skipped},timestamp:Date.now(),hypothesisId:'A',runId:'seo-effect'})}).catch(()=>{});
        // #endregion
        if (skipped) return;
        fetchedForIdRef.current = id;
        const ac = new AbortController();
        const { signal } = ac;
        setProjectLoading(true);
        setSummaryLoading(true);
        setScanId(null);
        setFullSummary(null);
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
                    setScanId(domainSummaryRes.data.scanId);
                    return fetch(apiScanDomainSummary(domainSummaryRes.data.scanId), { credentials: 'same-origin', signal })
                        .then((r) => (r.ok ? r.json() : null))
                        .then((payload: DomainSummaryResponse | null) => {
                            // #region agent log
                            fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'seo/page.tsx:setFullSummary',message:'before setFullSummary',data:{payloadPresent:!!payload,signalAborted:signal.aborted},timestamp:Date.now(),hypothesisId:'E',runId:'seo-summary'})}).catch(()=>{});
                            // #endregion
                            if (!signal.aborted && payload) setFullSummary(payload);
                        });
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!signal.aborted) setSummaryLoading(false);
            });
        return () => {
            // #region agent log
            fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'seo/page.tsx:cleanup',message:'effect cleanup abort',data:{id},timestamp:Date.now(),hypothesisId:'A',runId:'seo-cleanup'})}).catch(()=>{});
            // #endregion
            ac.abort();
        };
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
    useEffect(() => {
        // #region agent log
        fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'cafcc0'},body:JSON.stringify({sessionId:'cafcc0',location:'seo/page.tsx:seoTableRows',message:'seoTableRows changed',data:{seoTableRowsLength:seoTableRows.length,hasAggregatedSeo:!!aggregatedSeo,fullSummaryNull:fullSummary==null},timestamp:Date.now(),hypothesisId:'D',runId:'seo-rows'})}).catch(()=>{});
        // #endregion
    }, [seoTableRows.length, aggregatedSeo, fullSummary]);
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
