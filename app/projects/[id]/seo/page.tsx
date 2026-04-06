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
    MsqdxTabs,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import {
    apiProject,
    apiProjectDomainSummary,
    apiProjectDomainSummaryAll,
    apiScanDomainSummary,
    pathDomain,
    pathResults,
    pathScanDomain,
    pathProject,
    SEO_URL_LIST_INITIAL,
} from '@/lib/constants';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import type { AggregatedSeo, AggregatedStructure } from '@/lib/domain-aggregation';
import { computeSeoOnPageScore } from '@/lib/seo-on-page-score';
import { SeoOnPageTable, type SeoOnPageRow } from '@/components/SeoOnPageTable';
import { SeoKeywordsTable } from '@/components/SeoKeywordsTable';
import { THEME_ACCENT_CSS } from '@/lib/theme-accent';

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
    const [competitorSeoScores, setCompetitorSeoScores] = useState<Record<string, { scanId: string; seoOnPageScore: number; seoOnPageLabel: string; status: string }>>({});
    const fetchedForIdRef = useFetchOnceForId();
    // #region agent log
    const seoPageRenderRef = useRef(0);
    seoPageRenderRef.current += 1;
    const pr = seoPageRenderRef.current;
    if ([1, 2, 3, 5, 10, 20, 50, 100, 200, 500].includes(pr)) {
      fetch('http://127.0.0.1:7902/ingest/bbc31d13-f45c-46d1-93ab-b989a1d926fc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'cafcc0' },
        body: JSON.stringify({
          sessionId: 'cafcc0',
          location: 'seo/page.tsx:render',
          message: 'SEO page render',
          data: { renderCount: pr, hasFullSummary: !!fullSummary },
          timestamp: Date.now(),
          hypothesisId: 'H1',
        }),
      }).catch(() => {});
    }
    // #endregion

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const ac = new AbortController();
        const { signal } = ac;
        const summaryAllPromise = fetch(apiProjectDomainSummaryAll(id), { credentials: 'same-origin', signal }).then((r) =>
            r.json()
        ) as Promise<{ success?: boolean; data?: { competitors?: Record<string, { scanId: string; seoOnPageScore?: number; seoOnPageLabel?: string; status: string } | null> } }>;

        (async () => {
            const cached = seoSummaryCache.get(id);
            try {
                if (cached) {
                    setProjectLoading(false);
                    setSummaryLoading(false);
                    const data = await summaryAllPromise;
                    if (!signal.aborted && data?.success && data?.data?.competitors) {
                        const comp: Record<string, { scanId: string; seoOnPageScore: number; seoOnPageLabel: string; status: string }> = {};
                        for (const [domain, c] of Object.entries(data.data.competitors)) {
                            if (c) comp[domain] = { scanId: c.scanId, seoOnPageScore: c.seoOnPageScore ?? 0, seoOnPageLabel: c.seoOnPageLabel ?? 'critical', status: c.status };
                        }
                        setCompetitorSeoScores(comp);
                    }
                    return;
                }
                setProjectLoading(true);
                setSummaryLoading(true);
                const [projectRes, domainSummaryRes, summaryAllRes] = await Promise.all([
                    fetch(apiProject(id), { credentials: 'same-origin', signal }).then((r) => r.json()) as Promise<{ data?: { id: string; domain: string | null } }>,
                    fetch(apiProjectDomainSummary(id), { credentials: 'same-origin', signal }).then((r) => r.json()) as Promise<{ success?: boolean; data?: { scanId?: string } }>,
                    summaryAllPromise,
                ]);
                if (signal.aborted) return;
                if (summaryAllRes?.success && summaryAllRes?.data?.competitors) {
                    const comp: Record<string, { scanId: string; seoOnPageScore: number; seoOnPageLabel: string; status: string }> = {};
                    for (const [domain, c] of Object.entries(summaryAllRes.data.competitors)) {
                        if (c) comp[domain] = { scanId: c.scanId, seoOnPageScore: c.seoOnPageScore ?? 0, seoOnPageLabel: c.seoOnPageLabel ?? 'critical', status: c.status };
                    }
                    setCompetitorSeoScores(comp);
                }
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
    const [seoTabValue, setSeoTabValue] = useState(0);
    const [canonicalListExpanded, setCanonicalListExpanded] = useState(false);
    const [noindexListExpanded, setNoindexListExpanded] = useState(false);
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
                    titleVariant="h4"
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
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mb: 1, width: '100%' }}>
                                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {t('projects.seo.score')}
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                            <MsqdxTypography variant="h2" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '2rem' }}>
                                                {seoScore.score}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="body1" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500, fontSize: '1.25rem' }}>
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
                                    {Object.keys(competitorSeoScores).length > 0 &&
                                        Object.entries(competitorSeoScores).map(([domain, c]) => (
                                            <Box key={domain} sx={{ flex: '1 1 0', minWidth: 80, display: 'flex', flexDirection: 'column', gap: 0.25, alignItems: 'flex-start' }}>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', fontSize: '0.7rem' }}>
                                                    {domain}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'var(--color-text-muted-on-light)' }}>
                                                    {c.status === 'complete' ? `${c.seoOnPageScore}/100` : c.status}
                                                </MsqdxTypography>
                                                {c.status === 'complete' && (
                                                    <MsqdxChip
                                                        label={t(`projects.seo.scoreLabel_${c.seoOnPageLabel}`)}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ fontSize: '0.65rem', height: 18 }}
                                                    />
                                                )}
                                                {c.status === 'complete' && (
                                                    <MsqdxButton
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => router.push(pathDomain(c.scanId))}
                                                        sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.7rem', mt: 0.25 }}
                                                    >
                                                        {t('projects.open')}
                                                    </MsqdxButton>
                                                )}
                                            </Box>
                                        ))}
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
                                href={
                                    project?.domain
                                        ? pathScanDomain({ url: project.domain, projectId: id ?? undefined })
                                        : pathProject(id)
                                }
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
                    <MsqdxMoleculeCard
                        title={t('projects.seo.dataCardTitle')}
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)' }}
                    >
                        <Box
                            sx={{
                                borderBottom: `1px solid ${THEME_ACCENT_CSS}`,
                                mb: 0,
                                mt: -1,
                                mx: -2,
                                px: 2,
                                '& .MuiTabs-indicator': { backgroundColor: THEME_ACCENT_CSS },
                                '& .Mui-selected': { color: THEME_ACCENT_CSS },
                            }}
                        >
                            <MsqdxTabs
                                value={seoTabValue}
                                onChange={(v) => setSeoTabValue(Number(v))}
                                tabs={[
                                    { label: t('projects.seo.tabPages'), value: 0 },
                                    { label: t('projects.seo.tabKeywords'), value: 1 },
                                ]}
                            />
                        </Box>

                        {seoTabValue === 0 && (
                            <Stack component="span" sx={{ gap: 2, pt: 2 }}>
                        {/* Overview Meta & Basis */}
                        {aggregatedSeo && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.overview')}
                                subtitle={t('projects.seo.overviewSubtitle')}
                                titleVariant="h6"
                                variant="flat"
                                borderRadius="lg"
                                sx={{ bgcolor: 'var(--color-card-bg)', border: `1px solid ${THEME_ACCENT_CSS}` }}
                            >
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', alignItems: 'flex-end' }}>
                                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {t('projects.seo.withTitle')}
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                {aggregatedSeo.withTitle}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                / {aggregatedSeo.totalPages}
                                            </MsqdxTypography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {t('projects.seo.withMetaDescription')}
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                {aggregatedSeo.withMetaDescription}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                / {aggregatedSeo.totalPages}
                                            </MsqdxTypography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {t('projects.seo.withH1')}
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                {aggregatedSeo.withH1}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                / {aggregatedSeo.totalPages}
                                            </MsqdxTypography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {t('projects.seo.withCanonical')}
                                        </MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                            <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                {aggregatedSeo.withCanonical}
                                            </MsqdxTypography>
                                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                / {aggregatedSeo.totalPages}
                                            </MsqdxTypography>
                                        </Box>
                                    </Box>
                                    {(aggregatedSeo.withOgTitle != null || aggregatedSeo.withOgImage != null) && (
                                        <>
                                            <Box>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {t('projects.seo.withOgTitle')}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                        {aggregatedSeo.withOgTitle ?? 0}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                        / {aggregatedSeo.totalPages}
                                                    </MsqdxTypography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {t('projects.seo.withOgImage')}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                        {aggregatedSeo.withOgImage ?? 0}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                        / {aggregatedSeo.totalPages}
                                                    </MsqdxTypography>
                                                </Box>
                                            </Box>
                                            <Box>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {t('projects.seo.withOgDescription')}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                        {aggregatedSeo.withOgDescription ?? 0}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                        / {aggregatedSeo.totalPages}
                                                    </MsqdxTypography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {t('projects.seo.withTwitterCard')}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                        {aggregatedSeo.withTwitterCard ?? 0}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                        / {aggregatedSeo.totalPages}
                                                    </MsqdxTypography>
                                                </Box>
                                            </Box>
                                        </>
                                    )}
                                    {aggregatedSeo.pagesWithNoindex != null && (
                                        <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                {t('projects.seo.indexable')}
                                            </MsqdxTypography>
                                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                    {Math.max(0, aggregatedSeo.totalPages - aggregatedSeo.pagesWithNoindex.length)}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                                    / {aggregatedSeo.totalPages}
                                                </MsqdxTypography>
                                            </Box>
                                        </Box>
                                    )}
                                    {aggregatedSeo.totalWordsAcrossPages > 0 && (
                                        <Box sx={{ flex: '1 1 0', minWidth: 100 }}>
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                {t('projects.seo.totalWords')}
                                            </MsqdxTypography>
                                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                                    {aggregatedSeo.totalWordsAcrossPages.toLocaleString('de-DE')}
                                                </MsqdxTypography>
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </MsqdxMoleculeCard>
                        )}

                        {/* Seiten ohne Canonical – initial slice, load more */}
                        {aggregatedSeo && (aggregatedSeo.missingCanonicalUrls?.length ?? 0) > 0 && (() => {
                            const urls = aggregatedSeo.missingCanonicalUrls!;
                            const limit = canonicalListExpanded ? urls.length : Math.min(SEO_URL_LIST_INITIAL, urls.length);
                            const shown = urls.slice(0, limit);
                            const hasMore = urls.length > limit;
                            return (
                                <MsqdxMoleculeCard
                                    title={t('projects.seo.missingCanonical')}
                                    subtitle={`${urls.length} ${t('projects.seo.pagesShort')}`}
                                    variant="flat"
                                    borderRadius="lg"
                                    sx={{ bgcolor: 'var(--color-card-bg)', border: `1px solid ${THEME_ACCENT_CSS}` }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                        {shown.map((url) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <Link key={url} href={pathResults(page.id)} style={{ fontSize: '0.8rem', color: 'var(--color-text-on-light)', textDecoration: 'none' }}>
                                                    {url}
                                                </Link>
                                            ) : (
                                                <MsqdxTypography key={url} variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</MsqdxTypography>
                                            );
                                        })}
                                    </Box>
                                    {hasMore && (
                                        <Box sx={{ mt: 0.5 }}>
                                            <MsqdxButton size="small" variant="text" onClick={() => setCanonicalListExpanded(true)}>
                                                {t('common.loadMore')} ({urls.length - limit} {t('projects.seo.more')})
                                            </MsqdxButton>
                                        </Box>
                                    )}
                                </MsqdxMoleculeCard>
                            );
                        })()}

                        {/* Seiten mit noindex – initial slice, load more */}
                        {aggregatedSeo && (aggregatedSeo.pagesWithNoindex?.length ?? 0) > 0 && (() => {
                            const urls = aggregatedSeo.pagesWithNoindex!;
                            const limit = noindexListExpanded ? urls.length : Math.min(SEO_URL_LIST_INITIAL, urls.length);
                            const shown = urls.slice(0, limit);
                            const hasMore = urls.length > limit;
                            return (
                                <MsqdxMoleculeCard
                                    title={t('projects.seo.pagesWithNoindex')}
                                    subtitle={`${urls.length} ${t('projects.seo.pagesShort')}`}
                                    variant="flat"
                                    borderRadius="lg"
                                    sx={{ bgcolor: 'var(--color-card-bg)', border: `1px solid ${THEME_ACCENT_CSS}` }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                                        {shown.map((url) => {
                                            const page = pagesByUrl.get(url);
                                            return page ? (
                                                <Link key={url} href={pathResults(page.id)} style={{ fontSize: '0.8rem', color: 'var(--color-text-on-light)', textDecoration: 'none' }}>
                                                    {url}
                                                </Link>
                                            ) : (
                                                <MsqdxTypography key={url} variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</MsqdxTypography>
                                            );
                                        })}
                                    </Box>
                                    {hasMore && (
                                        <Box sx={{ mt: 0.5 }}>
                                            <MsqdxButton size="small" variant="text" onClick={() => setNoindexListExpanded(true)}>
                                                {t('common.loadMore')} ({urls.length - limit} {t('projects.seo.more')})
                                            </MsqdxButton>
                                        </Box>
                                    )}
                                </MsqdxMoleculeCard>
                            );
                        })()}

                        {/* Unified table: all pages with Meta, H1, structure, content */}
                        {aggregatedSeo && seoTableRows.length > 0 && (
                            <MsqdxMoleculeCard
                                title={t('projects.seo.tableTitle')}
                                subtitle={t('projects.seo.pagesByContentSubtitle')}
                                titleVariant="h6"
                                variant="flat"
                                borderRadius="lg"
                                sx={{
                                    bgcolor: 'var(--color-card-bg)',
                                    border: `1px solid ${THEME_ACCENT_CSS}`,
                                    '& p.MuiTypography-body2': { color: '#000' },
                                }}
                            >
                                <SeoOnPageTable rows={seoTableRows} onRowClick={handleSeoRowClick} />
                            </MsqdxMoleculeCard>
                        )}
                            </Stack>
                        )}

                        {seoTabValue === 1 && aggregatedSeo && aggregatedSeo.crossPageKeywords.length > 0 && (
                            <Box sx={{ pt: 2 }}>
                                <MsqdxMoleculeCard
                                    title={t('projects.seo.keywordsTableTitle')}
                                    subtitle={t('projects.seo.keywordsTableSubtitle')}
                                    variant="flat"
                                    borderRadius="lg"
                                    sx={{ bgcolor: 'var(--color-card-bg)', border: `1px solid ${THEME_ACCENT_CSS}` }}
                                >
                                    <SeoKeywordsTable keywords={aggregatedSeo.crossPageKeywords} />
                                </MsqdxMoleculeCard>
                            </Box>
                        )}

                        {seoTabValue === 1 && aggregatedSeo && aggregatedSeo.crossPageKeywords.length === 0 && (
                            <Box sx={{ pt: 2 }}>
                                <MsqdxMoleculeCard variant="flat" borderRadius="lg" sx={{ bgcolor: 'var(--color-card-bg)', border: `1px solid ${THEME_ACCENT_CSS}` }}>
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {t('projects.seo.tableEmpty')}
                                    </MsqdxTypography>
                                </MsqdxMoleculeCard>
                            </Box>
                        )}

                    </MsqdxMoleculeCard>
                )}
            </Stack>
        </Box>
    );
}
