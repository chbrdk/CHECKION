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
    apiProjectDomainScansActive,
    apiProjectDomainScanAll,
    apiProjectDomainScanCompetitor,
    apiScanDomainCreate,
    apiScanDomainStatus,
    apiScanDomainControl,
    pathDomain,
    pathScanDomain,
    pathScanDomainResume,
    pathGeoEeat,
    pathProjectRankings,
    pathProjectGeo,
    pathProjectResearch,
    pathProjectPageTopics,
} from '@/lib/constants';
import { InfoTooltip } from '@/components/InfoTooltip';
import Link from 'next/link';
import { THEME_ACCENT_CSS } from '@/lib/theme-accent';
import type { AggregatedPageClassification } from '@/lib/types';
import { normalizeDomain } from '@/lib/domain-normalize';
import { toScanStartUrl } from '@/lib/url-normalize';
import { parseTagsFromInput } from '@/lib/tag-utils';

interface ProjectData {
    id: string;
    name: string;
    domain: string | null;
    industry?: string | null;
    tags?: string[];
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
        pageClassification?: AggregatedPageClassification | null;
    };
}

interface ActiveDeepScanRow {
    scanId: string;
    label: string;
    /** When set, „Deep scan öffnen“ uses live `/scan/domain` with `scanId` for resume. */
    scanRootUrl?: string | null;
    status?: string;
    progress?: { scanned: number; total: number; currentUrl?: string };
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
    const [domainSummaryAllCompetitors, setDomainSummaryAllCompetitors] = useState<
        Record<
            string,
            | {
                  scanId: string;
                  score: number;
                  totalPageCount: number;
                  status: string;
                  aggregated?: { pageClassification?: AggregatedPageClassification | null };
              }
            | null
        >
    >({});
    const [restartDeepScanLoading, setRestartDeepScanLoading] = useState(false);
    const [scanAllDeepScanLoading, setScanAllDeepScanLoading] = useState(false);
    const [competitorScanLoadingDomain, setCompetitorScanLoadingDomain] = useState<string | null>(null);
    const [activeDeepScans, setActiveDeepScans] = useState<ActiveDeepScanRow[]>([]);
    const [listsLoading, setListsLoading] = useState(false);
    const [addCompetitorValue, setAddCompetitorValue] = useState('');
    const [suggestCompetitorsLoading, setSuggestCompetitorsLoading] = useState(false);
    const [suggestCompetitorsError, setSuggestCompetitorsError] = useState<string | null>(null);
    const [classificationIndustry, setClassificationIndustry] = useState('');
    const [classificationTagsStr, setClassificationTagsStr] = useState('');
    const [classificationSaving, setClassificationSaving] = useState(false);
    const fetchedForIdRef = useFetchOnceForId();

    const loadProject = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(apiProject(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (data?.data) {
                setProject(data.data);
                const p = data.data as ProjectData;
                setClassificationIndustry(p.industry ?? '');
                setClassificationTagsStr(Array.isArray(p.tags) ? p.tags.join(', ') : '');
            } else setProject(null);
        } catch {
            setProject(null);
        }
    }, [id]);

    const handleSaveClassification = useCallback(async () => {
        if (!id) return;
        setClassificationSaving(true);
        try {
            const tags = parseTagsFromInput(classificationTagsStr);
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    industry: classificationIndustry.trim() || null,
                    tags,
                }),
            });
            if (res.ok) await loadProject();
        } catch {
            /* ignore */
        } finally {
            setClassificationSaving(false);
        }
    }, [id, classificationIndustry, classificationTagsStr, loadProject]);

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

    const refreshActiveDomainScans = useCallback(
        async (signal?: AbortSignal) => {
            if (!id) return;
            try {
                const r = await fetch(apiProjectDomainScansActive(id), { credentials: 'same-origin', signal });
                if (signal?.aborted) return;
                const j = await r.json();
                if (signal?.aborted) return;
                if (j?.success && Array.isArray(j.data?.scans)) {
                    setActiveDeepScans(
                        j.data.scans.map((s: { scanId: string; label: string; status: string }) => ({
                            scanId: s.scanId,
                            label: s.label,
                            scanRootUrl: toScanStartUrl(s.label),
                            status: s.status,
                        }))
                    );
                }
            } catch {
                /* ignore */
            }
        },
        [id]
    );

    const loadDomainSummaryAll = useCallback(async () => {
        if (!id) return;
        try {
            const r = await fetch(apiProjectDomainSummaryAll(id), { credentials: 'same-origin' });
            const res = await r.json();
            if (res?.success && res?.data) {
                const d = res.data as {
                    own: DomainSummaryData | null;
                    competitors: Record<
                        string,
                        | {
                              scanId: string;
                              score: number;
                              totalPageCount: number;
                              status: string;
                              aggregated?: { pageClassification?: AggregatedPageClassification | null };
                          }
                        | null
                    >;
                };
                setDomainSummary(d.own ?? null);
                setDomainSummaryAllCompetitors(d.competitors ?? {});
            }
        } catch {
            // ignore
        }
        await refreshActiveDomainScans();
    }, [id, refreshActiveDomainScans]);

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
                    const d = domainSummaryAllRes.data as {
                        own: DomainSummaryData | null;
                        competitors: Record<
                            string,
                            | {
                                  scanId: string;
                                  score: number;
                                  totalPageCount: number;
                                  status: string;
                                  aggregated?: { pageClassification?: AggregatedPageClassification | null };
                              }
                            | null
                        >;
                    };
                    setDomainSummary(d.own ?? null);
                    setDomainSummaryAllCompetitors(d.competitors ?? {});
                } else {
                    setDomainSummary(null);
                    setDomainSummaryAllCompetitors({});
                }
                if (!signal.aborted) {
                    void refreshActiveDomainScans(signal);
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
    }, [id, fetchedForIdRef, refreshActiveDomainScans]);

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
                router.push(
                    pathScanDomainResume({
                        domainOrUrl: project.domain,
                        scanId: data.data.id as string,
                        projectId: id,
                    })
                );
                return;
            }
        } catch {
            // ignore
        } finally {
            setRestartDeepScanLoading(false);
        }
    }, [id, project?.domain, router]);

    const handleStartCompetitorDeepScan = useCallback(
        async (domain: string) => {
            if (!id || !domain.trim()) return;
            setCompetitorScanLoadingDomain(domain);
            try {
                const r = await fetch(apiProjectDomainScanCompetitor(id), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ domain }),
                });
                const data = await r.json().catch(() => ({}));
                if (r.ok && data?.success) {
                    await loadDomainSummaryAll();
                }
            } catch {
                // ignore
            } finally {
                setCompetitorScanLoadingDomain(null);
            }
        },
        [id, loadDomainSummaryAll]
    );

    const handleScanAllDeepScan = useCallback(async () => {
        if (!id) return;
        setScanAllDeepScanLoading(true);
        try {
            const r = await fetch(apiProjectDomainScanAll(id), {
                method: 'POST',
                credentials: 'same-origin',
            });
            const data = await r.json();
            if (data?.success && data?.data) {
                await loadDomainSummaryAll();
                const rows: ActiveDeepScanRow[] = [];
                const own = data.data.own as { scanId?: string } | null;
                if (own?.scanId) {
                    const ownDomain = project?.domain?.trim() ?? '';
                    rows.push({
                        scanId: own.scanId,
                        label: ownDomain || t('projects.ownDomainScanLabel'),
                        scanRootUrl: ownDomain ? toScanStartUrl(ownDomain) : null,
                    });
                }
                const comps = data.data.competitors as Record<string, { scanId: string; reused?: boolean }> | undefined;
                for (const [dom, info] of Object.entries(comps ?? {})) {
                    if (info?.scanId && !info.reused) {
                        rows.push({
                            scanId: info.scanId,
                            label: dom,
                            scanRootUrl: toScanStartUrl(dom),
                        });
                    }
                }
                if (rows.length > 0) setActiveDeepScans(rows);
            }
        } catch {
            // ignore
        } finally {
            setScanAllDeepScanLoading(false);
        }
    }, [id, loadDomainSummaryAll, project?.domain, t]);

    const handleDeepScanControl = useCallback(
        async (scanId: string, action: 'pause' | 'resume' | 'cancel') => {
            try {
                const r = await fetch(apiScanDomainControl(scanId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ action }),
                });
                if (r.ok) {
                    const j = await r.json().catch(() => ({}));
                    const st = typeof j?.status === 'string' ? j.status : undefined;
                    if (st === 'complete' || st === 'error' || st === 'cancelled') {
                        setActiveDeepScans((prev) => prev.filter((row) => row.scanId !== scanId));
                        void loadDomainSummaryAll();
                    } else if (st) {
                        setActiveDeepScans((prev) =>
                            prev.map((row) => (row.scanId === scanId ? { ...row, status: st } : row))
                        );
                    }
                }
            } catch {
                // ignore
            }
        },
        [loadDomainSummaryAll]
    );

    const activeDeepScansRef = useRef<ActiveDeepScanRow[]>([]);
    activeDeepScansRef.current = activeDeepScans;
    const activeScanIdsKey = activeDeepScans
        .map((r) => r.scanId)
        .sort()
        .join(',');

    useEffect(() => {
        if (!activeScanIdsKey) return;

        const tick = async () => {
            const snapshot = activeDeepScansRef.current;
            if (snapshot.length === 0) return;
            try {
                const updates = await Promise.all(
                    snapshot.map(async (row) => {
                        try {
                            const r = await fetch(apiScanDomainStatus(row.scanId), { credentials: 'same-origin' });
                            if (!r.ok) return { scanId: row.scanId, data: null };
                            const data = await r.json();
                            return { scanId: row.scanId, data };
                        } catch {
                            return { scanId: row.scanId, data: null };
                        }
                    })
                );
                setActiveDeepScans((prev) => {
                    const next: ActiveDeepScanRow[] = [];
                    for (const row of prev) {
                        const u = updates.find((x) => x.scanId === row.scanId);
                        const data = u?.data as {
                            status?: string;
                            progress?: { scanned?: number; total?: number; currentUrl?: string };
                        } | null;
                        if (!data?.status) {
                            next.push(row);
                            continue;
                        }
                        const st = data.status;
                        if (st === 'complete' || st === 'error' || st === 'cancelled') {
                            continue;
                        }
                        next.push({
                            ...row,
                            status: st,
                            progress:
                                data.progress && typeof data.progress.scanned === 'number'
                                    ? {
                                          scanned: data.progress.scanned,
                                          total: data.progress.total ?? 0,
                                          currentUrl: data.progress.currentUrl,
                                      }
                                    : row.progress,
                        });
                    }
                    if (prev.length > 0 && next.length === 0 && id) {
                        void loadDomainSummaryAll();
                    }
                    return next;
                });
            } catch {
                // ignore
            }
        };

        void tick();
        const interval = setInterval(tick, 3000);
        return () => clearInterval(interval);
    }, [activeScanIdsKey, id, loadDomainSummaryAll]);

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
                    gridTemplateRows: { xs: 'auto auto auto auto auto auto auto', md: 'auto auto auto' },
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
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid var(--color-border-subtle, #eee)' }}>
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mb: 1, color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.classificationTitle')}
                        </MsqdxTypography>
                        <MsqdxFormField
                            label={t('projects.industryLabel')}
                            value={classificationIndustry}
                            onChange={(e) => setClassificationIndustry((e.target as HTMLInputElement).value)}
                        />
                        <Box sx={{ mt: 1.5 }}>
                            <MsqdxFormField
                                label={t('projects.tagsLabel')}
                                value={classificationTagsStr}
                                onChange={(e) => setClassificationTagsStr((e.target as HTMLInputElement).value)}
                            />
                        </Box>
                        <Box sx={{ mt: 1.5 }}>
                            <MsqdxButton
                                variant="outlined"
                                size="small"
                                loading={classificationSaving}
                                onClick={() => void handleSaveClassification()}
                            >
                                {t('projects.saveClassification')}
                            </MsqdxButton>
                        </Box>
                    </Box>
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
                                <Link href={pathDomain(domainSummary.scanId, { projectId: id })} style={{ textDecoration: 'none' }}>
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
                    ) : activeDeepScans.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 0.5, width: '100%' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('projects.deepScanRunning')}
                            </MsqdxTypography>
                            {activeDeepScans.map((row) => {
                                const st = row.status ?? 'scanning';
                                const canPause = st === 'scanning' || st === 'queued';
                                const canResume = st === 'paused';
                                const canCancel =
                                    st === 'scanning' || st === 'queued' || st === 'paused' || st === 'cancelling';
                                const openDeepScanHref =
                                    row.scanRootUrl != null && row.scanRootUrl !== ''
                                        ? pathScanDomain({
                                              url: row.scanRootUrl,
                                              ...(row.progress && row.progress.total > 0
                                                  ? { maxPages: row.progress.total }
                                                  : {}),
                                              projectId: id,
                                              scanId: row.scanId,
                                          })
                                        : pathDomain(row.scanId, { projectId: id });
                                return (
                                    <Box
                                        key={row.scanId}
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 0.5,
                                            pb: 1,
                                            borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                        }}
                                    >
                                        <MsqdxTypography variant="body2" weight="medium">
                                            {row.label}
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                            {st}
                                            {row.progress && row.progress.total > 0
                                                ? ` · ${row.progress.scanned} / ${row.progress.total} ${t('domainResult.pagesScanned')}`
                                                : ''}
                                        </MsqdxTypography>
                                        {row.progress?.currentUrl ? (
                                            <MsqdxTypography variant="caption" sx={{ wordBreak: 'break-all', color: 'var(--color-text-muted-on-light)' }}>
                                                {row.progress.currentUrl}
                                            </MsqdxTypography>
                                        ) : null}
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                            <Link href={openDeepScanHref} style={{ textDecoration: 'none' }}>
                                                <MsqdxButton variant="outlined" size="small">
                                                    {t('projects.openDeepScan')}
                                                </MsqdxButton>
                                            </Link>
                                            {canPause ? (
                                                <MsqdxButton variant="outlined" size="small" onClick={() => handleDeepScanControl(row.scanId, 'pause')}>
                                                    {t('projects.deepScanPause')}
                                                </MsqdxButton>
                                            ) : null}
                                            {canResume ? (
                                                <MsqdxButton variant="outlined" size="small" onClick={() => handleDeepScanControl(row.scanId, 'resume')}>
                                                    {t('projects.deepScanResume')}
                                                </MsqdxButton>
                                            ) : null}
                                            {canCancel ? (
                                                <MsqdxButton variant="outlined" size="small" onClick={() => handleDeepScanControl(row.scanId, 'cancel')}>
                                                    {st === 'cancelling' ? t('domain.finalizeCancelScan') : t('projects.deepScanCancel')}
                                                </MsqdxButton>
                                            ) : null}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    ) : domainSummary ? (
                        <>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 0.5 }}>
                                <Box
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        border: `6px solid ${domainSummary.score > 80 ? THEME_ACCENT_CSS : 'var(--color-secondary-dx-orange)'}`,
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
                                        {Object.entries(domainSummaryAllCompetitors).map(([domain, comp]) => {
                                            const scanBusy =
                                                competitorScanLoadingDomain != null &&
                                                normalizeDomain(competitorScanLoadingDomain) === normalizeDomain(domain);
                                            return (
                                            <Box
                                                key={domain}
                                                component="li"
                                                sx={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    py: 0.35,
                                                    gap: 0.5,
                                                }}
                                            >
                                                <MsqdxTypography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 120px', minWidth: 0 }}>
                                                    {domain}
                                                    {comp
                                                        ? comp.status === 'complete'
                                                            ? ` · ${comp.score}`
                                                            : ` · ${comp.status}`
                                                        : ' · —'}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flexShrink: 0 }}>
                                                    {comp ? (
                                                        <MsqdxButton
                                                            variant="outlined"
                                                            size="small"
                                                            onClick={() => router.push(pathDomain(comp.scanId, { projectId: id }))}
                                                        >
                                                            {t('projects.open')}
                                                        </MsqdxButton>
                                                    ) : null}
                                                    <MsqdxButton
                                                        variant="outlined"
                                                        size="small"
                                                        disabled={scanBusy}
                                                        onClick={() => void handleStartCompetitorDeepScan(domain)}
                                                    >
                                                        {scanBusy ? t('common.loading') : t('projects.competitorDeepScan')}
                                                    </MsqdxButton>
                                                </Box>
                                            </Box>
                                            );
                                        })}
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
                                                    ? THEME_ACCENT_CSS
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
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                            {competitors.map((domain) => {
                                const scanBusy = competitorScanLoadingDomain != null && normalizeDomain(competitorScanLoadingDomain) === normalizeDomain(domain);
                                return (
                                    <Box
                                        key={domain}
                                        sx={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            gap: 1,
                                            py: 0.25,
                                        }}
                                    >
                                        <MsqdxTypography variant="body2" sx={{ flex: '1 1 140px', minWidth: 0, wordBreak: 'break-all' }}>
                                            {domain}
                                        </MsqdxTypography>
                                        <MsqdxButton
                                            variant="outlined"
                                            size="small"
                                            disabled={scanBusy}
                                            onClick={() => void handleStartCompetitorDeepScan(domain)}
                                        >
                                            {scanBusy ? t('common.loading') : t('projects.competitorDeepScan')}
                                        </MsqdxButton>
                                        <MsqdxButton variant="text" size="small" color="inherit" onClick={() => handleRemoveCompetitor(domain)}>
                                            {t('projects.removeCompetitor')}
                                        </MsqdxButton>
                                    </Box>
                                );
                            })}
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

                <MsqdxMoleculeCard
                    title={t('projects.pageTopicsCompareTitle')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider
                    headerActions={<InfoTooltip title={t('info.pageTopicsCompareCard')} ariaLabel={t('common.info')} />}
                    actions={
                        <Link href={pathProjectPageTopics(id)} style={{ textDecoration: 'none' }}>
                            <MsqdxButton variant="outlined" size="small">
                                {t('projects.pageTopicsCompareCta')}
                            </MsqdxButton>
                        </Link>
                    }
                    sx={{ gridColumn: { xs: 1, md: '1 / -1' }, gridRow: { xs: 7, md: 3 }, bgcolor: 'var(--color-card-bg)' }}
                >
                    {listsLoading ? (
                        <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
                    ) : (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {(() => {
                                const ownPc = domainSummary?.aggregated?.pageClassification;
                                const ownN =
                                    ownPc && ownPc.coverage.pagesWithClassification > 0
                                        ? `${ownPc.coverage.pagesWithClassification}/${ownPc.coverage.totalPages}`
                                        : null;
                                const compReady = Object.entries(domainSummaryAllCompetitors).filter(
                                    ([, c]) =>
                                        c?.status === 'complete' &&
                                        c.aggregated?.pageClassification &&
                                        c.aggregated.pageClassification.coverage.pagesWithClassification > 0
                                ).length;
                                const compTotal = Object.keys(domainSummaryAllCompetitors).length;
                                if (!ownN && compTotal === 0) {
                                    return t('projects.pageTopicsCompareHintNoCompetitors');
                                }
                                return t('projects.pageTopicsCompareHint', {
                                    own: ownN ?? '—',
                                    competitorsReady: String(compReady),
                                    competitorsTotal: String(compTotal),
                                });
                            })()}
                        </MsqdxTypography>
                    )}
                </MsqdxMoleculeCard>
            </Box>
        </Box>
    );
}
