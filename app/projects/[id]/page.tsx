'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFetchOnceForId } from '@/hooks/useFetchOnceForId';
import { Box } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxFormField,
    MsqdxChip,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiProjectSuggestCompetitors,
    apiProjectRankingSummary,
    apiProjectGeoSummary,
    apiProjectDomainSummaryAll,
    apiProjectDomainScanAll,
    apiScanDomainCreate,
    apiScanDomainStatus,
    pathDomain,
    pathGeoEeat,
    pathProjectRankings,
    pathProjectGeo,
    pathProjectResearch,
} from '@/lib/constants';
import { InfoTooltip } from '@/components/InfoTooltip';
import Link from 'next/link';

interface ProjectData {
    id: string;
    name: string;
    domain: string | null;
    valueProposition?: string | null;
    competitors?: string[];
    geoQueries?: string[];
    counts: { domainScans: number; journeyRuns: number; geoEeatRuns: number; singleScans: number; rankTrackingKeywords: number };
}

interface RankingSummaryData {
    score: number | null;
    keywordCount: number;
    lastUpdated: string | null;
}

interface GeoSummaryData {
    score: number | null;
    runs: Array<{ id: string; url: string; status: string; createdAt: string }>;
}

interface DomainSummaryData {
    scanId: string;
    score: number;
    totalPageCount: number;
    aggregated: {
        performance?: { avgTtfb: number; avgFcp: number; avgLcp: number; avgDomLoad: number; pageCount: number } | null;
        eco?: { avgCo2: number; totalPageWeight: number; gradeDistribution: Record<string, number>; pageCount: number } | null;
    };
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [rankingSummary, setRankingSummary] = useState<RankingSummaryData | null>(null);
    const [geoSummary, setGeoSummary] = useState<GeoSummaryData | null>(null);
    const [domainSummary, setDomainSummary] = useState<DomainSummaryData | null>(null);
    const [domainSummaryAllCompetitors, setDomainSummaryAllCompetitors] = useState<Record<string, { scanId: string; score: number; totalPageCount: number; status: string } | null>>({});
    const [restartDeepScanLoading, setRestartDeepScanLoading] = useState(false);
    const [scanAllDeepScanLoading, setScanAllDeepScanLoading] = useState(false);
    const [runningOwnScanId, setRunningOwnScanId] = useState<string | null>(null);
    const [runningScanProgress, setRunningScanProgress] = useState<{ scanned: number; total: number } | null>(null);
    const [listsLoading, setListsLoading] = useState(false);
    const [addCompetitorValue, setAddCompetitorValue] = useState('');
    const [suggestCompetitorsLoading, setSuggestCompetitorsLoading] = useState(false);
    const [suggestCompetitorsError, setSuggestCompetitorsError] = useState<string | null>(null);
    const fetchedForIdRef = useFetchOnceForId();

    const loadProject = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(apiProject(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (data?.data) setProject(data.data);
            else setProject(null);
        } catch {
            setProject(null);
        }
    }, [id]);

    const competitors = Array.isArray(project?.competitors) ? project.competitors : [];

    const normalizeDomainInput = useCallback((value: string) => {
        let v = value.trim().toLowerCase();
        v = v.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0] ?? '';
        return v;
    }, []);

    const handleAddCompetitor = useCallback(async () => {
        const domain = normalizeDomainInput(addCompetitorValue);
        if (!id || !domain) return;
        const next = [...competitors];
        if (next.includes(domain)) return;
        next.push(domain);
        setAddCompetitorValue('');
        try {
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ competitors: next }),
            });
            if (res.ok) loadProject();
        } catch {
            // ignore
        }
    }, [id, addCompetitorValue, competitors, normalizeDomainInput, loadProject]);

    const handleRemoveCompetitor = useCallback(
        async (domain: string) => {
            if (!id) return;
            const next = competitors.filter((c) => c !== domain);
            try {
                const res = await fetch(apiProject(id), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ competitors: next }),
                });
                if (res.ok) loadProject();
            } catch {
                // ignore
            }
        },
        [id, competitors, loadProject]
    );

    const handleSuggestCompetitors = useCallback(async () => {
        if (!id) return;
        setSuggestCompetitorsError(null);
        setSuggestCompetitorsLoading(true);
        try {
            const res = await fetch(apiProjectSuggestCompetitors(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && Array.isArray(data.competitors)) {
                const existing = new Set(competitors.map((c) => c.toLowerCase()));
                const toAdd = data.competitors
                    .map((c: string) => normalizeDomainInput(c))
                    .filter((c: string) => c && !existing.has(c));
                if (toAdd.length > 0) {
                    const next = [...competitors, ...toAdd];
                    const patchRes = await fetch(apiProject(id), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ competitors: next }),
                    });
                    if (patchRes.ok) loadProject();
                }
            } else if (!res.ok && typeof data?.error === 'string') {
                setSuggestCompetitorsError(data.error);
            } else if (!res.ok) {
                setSuggestCompetitorsError(t('common.error'));
            }
        } catch {
            setSuggestCompetitorsError(t('common.error'));
        } finally {
            setSuggestCompetitorsLoading(false);
        }
    }, [id, competitors, normalizeDomainInput, loadProject, t]);

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const ac = new AbortController();
        const { signal } = ac;
        setLoading(true);
        setListsLoading(true);
        Promise.all([
            fetch(apiProject(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
            fetch(apiProjectRankingSummary(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
            fetch(apiProjectGeoSummary(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
            fetch(apiProjectDomainSummaryAll(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
        ])
            .then(([projectRes, rankSummaryRes, geoSummaryRes, domainSummaryAllRes]) => {
                if (signal.aborted) return;
                if (projectRes?.data) setProject(projectRes.data as ProjectData);
                else setProject(null);
                if (rankSummaryRes?.success && rankSummaryRes?.data) {
                    setRankingSummary(rankSummaryRes.data as RankingSummaryData);
                } else setRankingSummary(null);
                if (geoSummaryRes?.success && geoSummaryRes?.data) {
                    setGeoSummary(geoSummaryRes.data as GeoSummaryData);
                } else setGeoSummary(null);
                if (domainSummaryAllRes?.success && domainSummaryAllRes?.data) {
                    const d = domainSummaryAllRes.data as { own: DomainSummaryData | null; competitors: Record<string, { scanId: string; score: number; totalPageCount: number; status: string } | null> };
                    setDomainSummary(d.own ?? null);
                    setDomainSummaryAllCompetitors(d.competitors ?? {});
                } else {
                    setDomainSummary(null);
                    setDomainSummaryAllCompetitors({});
                }
            })
            .catch((err) => {
                if (err?.name === 'AbortError') return;
                setRankingSummary(null);
                setGeoSummary(null);
                setDomainSummary(null);
                setDomainSummaryAllCompetitors({});
            })
            .finally(() => {
                if (!signal.aborted) {
                    setLoading(false);
                    setListsLoading(false);
                }
            });
        return () => ac.abort();
    }, [id, fetchedForIdRef]);

    const loadDomainSummaryAll = useCallback(async () => {
        if (!id) return;
        try {
            const r = await fetch(apiProjectDomainSummaryAll(id), { credentials: 'same-origin' });
            const res = await r.json();
            if (res?.success && res?.data) {
                const d = res.data as { own: DomainSummaryData | null; competitors: Record<string, { scanId: string; score: number; totalPageCount: number; status: string } | null> };
                setDomainSummary(d.own ?? null);
                setDomainSummaryAllCompetitors(d.competitors ?? {});
            }
        } catch {
            // ignore
        }
    }, [id]);

    const handleRestartDeepScan = useCallback(async () => {
        if (!id || !project?.domain) return;
        setRestartDeepScanLoading(true);
        try {
            const r = await fetch(apiScanDomainCreate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ url: project.domain, projectId: id }),
            });
            const data = await r.json();
            if (data?.success && data?.data?.id) {
                router.push(pathDomain(data.data.id));
                return;
            }
        } catch {
            // ignore
        } finally {
            setRestartDeepScanLoading(false);
        }
    }, [id, project?.domain, router]);

    const handleScanAllDeepScan = useCallback(async () => {
        if (!id) return;
        setScanAllDeepScanLoading(true);
        try {
            const r = await fetch(apiProjectDomainScanAll(id), {
                method: 'POST',
                credentials: 'same-origin',
            });
            const data = await r.json();
            if (data?.success) {
                await loadDomainSummaryAll();
                if (data?.data?.own?.scanId) {
                    setRunningOwnScanId(data.data.own.scanId);
                    setRunningScanProgress({ scanned: 0, total: 0 });
                }
            }
        } catch {
            // ignore
        } finally {
            setScanAllDeepScanLoading(false);
        }
    }, [id, loadDomainSummaryAll]);

    useEffect(() => {
        if (!runningOwnScanId) return;
        const interval = setInterval(async () => {
            try {
                const r = await fetch(apiScanDomainStatus(runningOwnScanId!), { credentials: 'same-origin' });
                const data = await r.json();
                if (data?.status === 'complete' || data?.status === 'error') {
                    setRunningOwnScanId(null);
                    setRunningScanProgress(null);
                    if (id) loadDomainSummaryAll();
                    return;
                }
                if (data?.progress && typeof data.progress?.scanned === 'number') {
                    setRunningScanProgress({ scanned: data.progress.scanned, total: data.progress?.total ?? 0 });
                }
            } catch {
                // ignore
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [runningOwnScanId, id, loadDomainSummaryAll]);

    if (!id) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    if (loading || !project) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{loading ? t('common.loading') : t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    const listItemSx = {
        display: 'flex' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        px: 1.5,
        borderBottom: '1px solid var(--color-border-subtle, #eee)',
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 320px) 1fr 1fr' },
                    gridTemplateRows: { xs: 'auto auto auto auto auto auto', md: 'auto auto' },
                    gap: 2,
                    alignItems: 'stretch',
                }}
            >
                {/* Row 1 col 1: Company info – actions = Button unten (gleiche Höhe wie Ranking/GEO) */}
                <MsqdxMoleculeCard
                    title={project.name}
                    titleVariant="h4"
                    variant="flat"
                    borderRadius="button"
                    footerDivider
                    actions={
                        id ? (
                            <Link href={pathProjectResearch(id)} style={{ textDecoration: 'none' }}>
                                <MsqdxButton variant="outlined" size="small">
                                    {t('projects.researchStart')}
                                </MsqdxButton>
                            </Link>
                        ) : null
                    }
                    sx={{
                        gridColumn: { xs: 1, md: 1 },
                        gridRow: { xs: 1, md: 1 },
                        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                        bgcolor: 'var(--color-card-bg)',
                        color: 'var(--color-text-on-light)',
                    }}
                >
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>
                        {t('projects.companyInfo')}
                    </MsqdxTypography>
                    {project.domain && (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                            {project.domain}
                        </MsqdxTypography>
                    )}
                    {project.valueProposition && (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {project.valueProposition}
                        </MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>

                {/* Row 1 col 2: Ranking-Score */}
                <MsqdxMoleculeCard
                            title={t('projects.rankingScore')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider
                            sx={{ gridColumn: { xs: 1, md: 2 }, gridRow: { xs: 2, md: 1 }, bgcolor: 'var(--color-card-bg)' }}
                            actions={
                                id ? (
                                    <Link href={pathProjectRankings(id)} style={{ textDecoration: 'none' }}>
                                        <MsqdxButton variant="outlined" size="small">
                                            {t('projects.viewAllRankings')}
                                        </MsqdxButton>
                                    </Link>
                                ) : null
                            }
                        >
                            {listsLoading ? (
                                <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                            ) : (
                                <>
                                    <MsqdxTypography variant="h4" weight="bold" sx={{ mb: 0.5 }}>
                                        {rankingSummary?.score != null ? `${rankingSummary.score}/100` : '—'}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {rankingSummary ? t('projects.keywordCount', { count: rankingSummary.keywordCount }) : ''}
                                        {rankingSummary?.lastUpdated ? ` · ${t('projects.lastUpdate')}: ${new Date(rankingSummary.lastUpdated).toLocaleDateString()}` : ''}
                                    </MsqdxTypography>
                                </>
                            )}
                        </MsqdxMoleculeCard>

                {/* Row 1 col 3: GEO */}
                <MsqdxMoleculeCard
                            title={t('projects.geoScore')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider
                            actions={
                                id ? (
                                    <Link href={pathProjectGeo(id)} style={{ textDecoration: 'none' }}>
                                        <MsqdxButton variant="outlined" size="small">
                                            {t('projects.viewGeo')}
                                        </MsqdxButton>
                                    </Link>
                                ) : null
                            }
                            sx={{ gridColumn: { xs: 1, md: 3 }, gridRow: { xs: 3, md: 1 }, bgcolor: 'var(--color-card-bg)' }}
                        >
                            {listsLoading ? (
                                <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                            ) : (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                                        <MsqdxTypography variant="h4" weight="bold">
                                            {geoSummary?.score != null ? `${geoSummary.score}/100` : '—'}
                                        </MsqdxTypography>
                                    </Box>
                                    {geoSummary?.runs && geoSummary.runs.length > 0 && (
                                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                            {geoSummary.runs.slice(0, 5).map((g) => (
                                                <Box key={g.id} component="li" sx={listItemSx}>
                                                    <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                                                        {new Date(g.createdAt).toLocaleDateString()} · {g.status}
                                                    </MsqdxTypography>
                                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathGeoEeat(g.id))}>
                                                        {t('projects.open')}
                                                    </MsqdxButton>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </>
                            )}
                        </MsqdxMoleculeCard>

                {/* Row 2 col 2: Domain Score (Deep Scan) */}
                <MsqdxMoleculeCard
                    title={t('domainResult.domainScore')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider
                    sx={{ gridColumn: { xs: 1, md: 2 }, gridRow: { xs: 4, md: 2 }, bgcolor: 'var(--color-card-bg)' }}
                    headerActions={<InfoTooltip title={t('info.domainScore')} ariaLabel={t('common.info')} />}
                    actions={
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {domainSummary?.scanId && (
                                <Link href={pathDomain(domainSummary.scanId)} style={{ textDecoration: 'none' }}>
                                    <MsqdxButton variant="outlined" size="small">
                                        {t('projects.open')}
                                    </MsqdxButton>
                                </Link>
                            )}
                            {project?.domain && (
                                <MsqdxButton
                                    variant="outlined"
                                    size="small"
                                    onClick={handleRestartDeepScan}
                                    disabled={restartDeepScanLoading}
                                >
                                    {restartDeepScanLoading ? t('common.loading') : t('projects.restartDeepScan')}
                                </MsqdxButton>
                            )}
                            {(project?.domain || (competitors.length > 0)) && (
                                <MsqdxButton
                                    variant="outlined"
                                    size="small"
                                    onClick={handleScanAllDeepScan}
                                    disabled={scanAllDeepScanLoading}
                                >
                                    {scanAllDeepScanLoading ? t('common.loading') : t('projects.scanAllDeepScan')}
                                </MsqdxButton>
                            )}
                        </Box>
                    }
                >
                    {listsLoading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                    ) : runningOwnScanId ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1, gap: 1 }}>
                            <MsqdxTypography variant="body1" weight="medium">
                                {t('projects.deepScanRunning')}
                            </MsqdxTypography>
                            {runningScanProgress && runningScanProgress.total > 0 && (
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {runningScanProgress.scanned} / {runningScanProgress.total} {t('domainResult.pagesScanned')}
                                </MsqdxTypography>
                            )}
                            <Link href={pathDomain(runningOwnScanId)} style={{ textDecoration: 'none' }}>
                                <MsqdxButton variant="outlined" size="small">
                                    {t('projects.openDeepScan')}
                                </MsqdxButton>
                            </Link>
                        </Box>
                    ) : domainSummary ? (
                        <>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        border: `6px solid ${domainSummary.score > 80 ? 'var(--color-secondary-dx-green)' : 'var(--color-secondary-dx-orange)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <MsqdxTypography variant="h3" weight="bold">
                                        {domainSummary.score}
                                    </MsqdxTypography>
                                </Box>
                                <MsqdxTypography variant="body2" sx={{ mt: 1, color: 'var(--color-text-muted-on-light)' }}>
                                    {domainSummary.totalPageCount} {t('domainResult.pagesScanned')}
                                </MsqdxTypography>
                            </Box>
                            {Object.keys(domainSummaryAllCompetitors).length > 0 && (
                                <Box sx={{ mt: 1.5, width: '100%' }}>
                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                        {t('projects.competitorDeepScans')}
                                    </MsqdxTypography>
                                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                        {Object.entries(domainSummaryAllCompetitors).map(([domain, comp]) => (
                                            comp && (
                                                <Box key={domain} component="li" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 0.25, gap: 0.5 }}>
                                                    <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {domain} {comp.status === 'complete' ? `· ${comp.score}` : `· ${comp.status}`}
                                                    </MsqdxTypography>
                                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathDomain(comp.scanId))} sx={{ flexShrink: 0 }}>
                                                        {t('projects.open')}
                                                    </MsqdxButton>
                                                </Box>
                                            )
                                        ))}
                                    </Box>
                                </Box>
                            )}
                        </>
                    ) : (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            —
                        </MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>

                {/* Row 2 col 3: Performance (avg) + Eco Score */}
                <MsqdxMoleculeCard
                    title={t('domainResult.performanceEco')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider
                    sx={{ gridColumn: { xs: 1, md: 3 }, gridRow: { xs: 5, md: 2 }, bgcolor: 'var(--color-card-bg)' }}
                >
                    {listsLoading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                    ) : domainSummary?.aggregated ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {domainSummary.aggregated.performance && (
                                <Box>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                                        {t('domainResult.performanceAvg')}
                                    </MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        <MsqdxChip size="small" label={`TTFB ${domainSummary.aggregated.performance.avgTtfb} ms`} />
                                        <MsqdxChip size="small" label={`FCP ${domainSummary.aggregated.performance.avgFcp} ms`} />
                                        <MsqdxChip size="small" label={`LCP ${domainSummary.aggregated.performance.avgLcp} ms`} />
                                    </Box>
                                </Box>
                            )}
                            {domainSummary.aggregated.eco && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            border: '3px solid',
                                            borderColor:
                                                (domainSummary.aggregated.eco.gradeDistribution['A+'] ?? domainSummary.aggregated.eco.gradeDistribution['A'])
                                                    ? 'var(--color-secondary-dx-green)'
                                                    : 'var(--color-secondary-dx-orange)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <MsqdxTypography variant="h4" sx={{ lineHeight: 1 }}>
                                            {Object.entries(domainSummary.aggregated.eco.gradeDistribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'}
                                        </MsqdxTypography>
                                    </Box>
                                    <Box>
                                        <MsqdxTypography variant="body2" weight="bold">
                                            {domainSummary.aggregated.eco.avgCo2}g CO₂
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                            {(domainSummary.aggregated.eco.totalPageWeight / 1024 / 1024 / Math.max(1, domainSummary.aggregated.eco.pageCount)).toFixed(2)} MB Ø
                                        </MsqdxTypography>
                                    </Box>
                                </Box>
                            )}
                            {!domainSummary.aggregated.performance && !domainSummary.aggregated.eco && (
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    —
                                </MsqdxTypography>
                            )}
                        </Box>
                    ) : (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            —
                        </MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>

                {/* Row 3 / col 1: Wettbewerber – actions = Buttons unten (wie andere Cards) */}
                <MsqdxMoleculeCard
                    title={t('projects.competitors')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider
                    actions={
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <MsqdxButton
                                variant="outlined"
                                size="small"
                                onClick={handleAddCompetitor}
                                disabled={!normalizeDomainInput(addCompetitorValue)}
                            >
                                {t('projects.addCompetitor')}
                            </MsqdxButton>
                            <MsqdxButton
                                variant="outlined"
                                size="small"
                                onClick={handleSuggestCompetitors}
                                disabled={suggestCompetitorsLoading || !project.domain}
                            >
                                {suggestCompetitorsLoading ? t('common.loading') : t('projects.suggestCompetitorsWithAi')}
                            </MsqdxButton>
                        </Box>
                    }
                    sx={{ gridColumn: { xs: 1, md: 1 }, gridRow: { xs: 6, md: 2 }, bgcolor: 'var(--color-card-bg)' }}
                >
                    {competitors.length === 0 ? (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                            {t('projects.noCompetitors')}
                        </MsqdxTypography>
                    ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                            {competitors.map((domain) => (
                                <MsqdxChip
                                    key={domain}
                                    label={domain}
                                    onDelete={() => handleRemoveCompetitor(domain)}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                />
                            ))}
                        </Box>
                    )}
                    {suggestCompetitorsError && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mb: 1 }}>
                            {suggestCompetitorsError}
                        </MsqdxTypography>
                    )}
                    <MsqdxFormField
                        label={t('projects.competitorDomain')}
                        placeholder={t('projects.addCompetitorPlaceholder')}
                        value={addCompetitorValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddCompetitorValue(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddCompetitor()}
                        sx={{
                            margin: 0,
                            width: '100%',
                            '& .MuiFormControl-root': { margin: 0, minHeight: 0 },
                            '& .MuiInputBase-root': { minHeight: 40, maxHeight: 40, height: 40 },
                            '& .MuiInputBase-input': { py: 0.5, height: 40, boxSizing: 'border-box' },
                        }}
                    />
                </MsqdxMoleculeCard>
            </Box>
        </Box>
    );
}
