'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFetchOnceForId } from '@/hooks/useFetchOnceForId';
import Link from 'next/link';
import { Box, Stack, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { DomainAggregatedIssueList } from '@/components/DomainAggregatedIssueList';
import { PageIssuesCard } from '@/components/PageIssuesCard';
import {
    apiProject,
    apiProjectDomainSummary,
    apiProjectDomainSummaryAll,
    apiScanDomainSummary,
    pathDomain,
    pathResults,
    pathScanDomain,
    pathProject,
} from '@/lib/constants';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import { computeWcagScore } from '@/lib/wcag-score';

export default function ProjectWcagPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;

    const [project, setProject] = useState<{ id: string; domain: string | null } | null>(null);
    const [projectLoading, setProjectLoading] = useState(true);
    const [scanId, setScanId] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [fullSummary, setFullSummary] = useState<DomainSummaryResponse | null>(null);
    const [competitorWcagScores, setCompetitorWcagScores] = useState<Record<string, { scanId: string; wcagScore: number; status: string }>>({});
    const fetchedForIdRef = useFetchOnceForId();

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const ac = new AbortController();
        const { signal } = ac;
        setProjectLoading(true);
        setSummaryLoading(true);
        setScanId(null);
        setFullSummary(null);
        setCompetitorWcagScores({});
        fetch(apiProject(id), { credentials: 'same-origin', signal })
            .then((r) => r.json())
            .then((data: { data?: { id: string; domain: string | null } }) => {
                if (!signal.aborted && data?.data) setProject(data.data);
                else if (!signal.aborted) setProject(null);
            })
            .catch(() => { if (!signal.aborted) setProject(null); })
            .finally(() => { if (!signal.aborted) setProjectLoading(false); });
        Promise.all([
            fetch(apiProjectDomainSummary(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
            fetch(apiProjectDomainSummaryAll(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
        ])
            .then(([domainSummaryRes, summaryAllRes]) => {
                if (signal.aborted) return;
                if (summaryAllRes?.success && summaryAllRes?.data?.competitors) {
                    const comp: Record<string, { scanId: string; wcagScore: number; status: string }> = {};
                    for (const [domain, c] of Object.entries(summaryAllRes.data.competitors as Record<string, { scanId: string; wcagScore?: number; status: string } | null>)) {
                        if (c) comp[domain] = { scanId: c.scanId, wcagScore: c.wcagScore ?? 0, status: c.status };
                    }
                    setCompetitorWcagScores(comp);
                }
                if (domainSummaryRes?.success && domainSummaryRes?.data?.scanId) {
                    setScanId(domainSummaryRes.data.scanId);
                    return fetch(apiScanDomainSummary(domainSummaryRes.data.scanId), { credentials: 'same-origin', signal })
                        .then((r) => (r.ok ? r.json() : null))
                        .then((payload: DomainSummaryResponse | null) => {
                            if (!signal.aborted && payload) setFullSummary(payload);
                        });
                }
            })
            .catch((err) => { if (err?.name !== 'AbortError') setCompetitorWcagScores({}); })
            .finally(() => { if (!signal.aborted) setSummaryLoading(false); });
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

    const handleIssuePageClick = useCallback((url: string) => {
        const page = pagesByUrl.get(url);
        if (page) router.push(pathResults(page.id));
    }, [pagesByUrl, router]);

    const aggregated = fullSummary?.aggregated?.issues ?? null;
    const totalPageCount = fullSummary?.totalPageCount ?? fullSummary?.pages?.length ?? (fullSummary as { totalPages?: number } | undefined)?.totalPages ?? 0;
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
                    title={t('projects.navWcag')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    headerActions={<InfoTooltip title={t('info.issuesList')} ariaLabel={t('common.info')} />}
                    actions={
                        scanId ? (
                            <Link href={pathDomain(scanId)} style={{ textDecoration: 'none' }}>
                                <MsqdxButton variant="outlined" size="small">
                                    {t('projects.openDeepScan')}
                                </MsqdxButton>
                            </Link>
                        ) : null
                    }
                >
                    {loading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                    ) : fullSummary ? (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.wcag.fromScan')} · {totalPageCount} {t('domainResult.pagesScanned')}
                        </MsqdxTypography>
                    ) : !scanId ? (
                        <>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                                {t('projects.wcag.noScan')}
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
                                    {t('projects.wcag.startScan')}
                                </MsqdxButton>
                            </Link>
                        </>
                    ) : null}
                </MsqdxMoleculeCard>

                {loading && (
                    <MsqdxMoleculeCard variant="flat" borderRadius="lg" sx={{ bgcolor: 'var(--color-card-bg)' }}>
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('common.loading')}
                            </MsqdxTypography>
                        </Box>
                    </MsqdxMoleculeCard>
                )}

                {!loading && aggregated && (() => {
                    const wcagScore = computeWcagScore({
                        errors: aggregated.stats.errors,
                        warnings: aggregated.stats.warnings,
                        notices: aggregated.stats.notices,
                        totalPageCount: totalPageCount,
                    });
                    const scoreLabelKey = `projects.wcag.scoreLabel_${wcagScore.label}`;
                    return (
                    <>
                        {/* Stats card */}
                        <MsqdxMoleculeCard
                            title={t('projects.wcag.summary')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider={false}
                            sx={{ bgcolor: 'var(--color-card-bg)' }}
                            headerActions={
                                <InfoTooltip
                                    title={t('projects.wcag.scoreTooltip')}
                                    ariaLabel={t('common.info')}
                                />
                            }
                        >
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline', mb: 1.5 }}>
                                <Box>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                        {t('projects.ourScore')}
                                    </MsqdxTypography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                        <MsqdxTypography variant="h4" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                            {wcagScore.score}
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontWeight: 500 }}>
                                            {t('projects.wcag.score')}
                                        </MsqdxTypography>
                                    </Box>
                                    <MsqdxChip
                                        label={t(scoreLabelKey)}
                                        size="small"
                                        variant="outlined"
                                        sx={{ mt: 0.5 }}
                                    />
                                </Box>
                                {Object.keys(competitorWcagScores).length > 0 && (
                                    <>
                                        {Object.entries(competitorWcagScores).map(([domain, c]) => (
                                            <Box key={domain}>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {domain}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <MsqdxTypography variant="h4" weight="bold" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                        {c.status === 'complete' ? `${c.wcagScore}/100` : c.status}
                                                    </MsqdxTypography>
                                                    {c.status === 'complete' && (
                                                        <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathDomain(c.scanId))}>
                                                            {t('projects.open')}
                                                        </MsqdxButton>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                                <MsqdxChip
                                    label={`${t('share.errors')}: ${aggregated.stats.errors}`}
                                    size="small"
                                    sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }}
                                />
                                <MsqdxChip
                                    label={`${t('share.warnings')}: ${aggregated.stats.warnings}`}
                                    size="small"
                                    sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }}
                                />
                                <MsqdxChip
                                    label={`${t('share.notices')}: ${aggregated.stats.notices}`}
                                    size="small"
                                    sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }}
                                />
                            </Box>
                            {aggregated.levelStats && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {(['A', 'AA', 'AAA', 'APCA', 'Unknown'] as const).map(
                                        (level) =>
                                            (aggregated.levelStats[level] ?? 0) > 0 && (
                                                <MsqdxChip
                                                    key={level}
                                                    label={`${level}: ${aggregated.levelStats[level]}`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )
                                    )}
                                </Box>
                            )}
                        </MsqdxMoleculeCard>

                        {/* Issues table */}
                        <MsqdxMoleculeCard
                            title={t('projects.wcag.issuesTitle')}
                            subtitle={t('projects.wcag.aggregatedOver', { count: totalPageCount })}
                            variant="flat"
                            borderRadius="lg"
                            sx={{ bgcolor: 'var(--color-card-bg)' }}
                            headerActions={<InfoTooltip title={t('info.issuesList')} ariaLabel={t('common.info')} />}
                        >
                            <DomainAggregatedIssueList
                                issues={aggregated.issues}
                                onPageClick={handleIssuePageClick}
                            />
                        </MsqdxMoleculeCard>

                        {/* Pages with most issues */}
                        {aggregated.pagesByIssueCount?.some((p) => p.errors > 0 || p.warnings > 0) && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    {t('projects.wcag.pagesWithMostErrors')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                                    {aggregated.pagesByIssueCount.slice(0, 15).map((row) => {
                                        const page = pagesByUrl.get(row.url);
                                        const issuesForPage = aggregated.issues.filter((i) => i.pageUrls?.includes(row.url));
                                        return (
                                            <PageIssuesCard
                                                key={row.url}
                                                url={row.url}
                                                issuesForPage={issuesForPage}
                                                stats={{ errors: row.errors, warnings: row.warnings, notices: row.notices }}
                                                onOpenPage={page ? () => router.push(pathResults(page.id)) : undefined}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}
                    </>
                    );
                })()}
            </Stack>
        </Box>
    );
}
