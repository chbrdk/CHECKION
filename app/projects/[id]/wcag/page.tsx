'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
            .then((data: { success?: boolean; data?: { scanId?: string } | null }) => {
                if (data?.success && data?.data?.scanId) {
                    setScanId(data.data.scanId);
                    return fetch(apiScanDomainSummary(data.data.scanId), { credentials: 'same-origin' });
                }
                return null;
            })
            .then((r) => (r?.ok ? r.json() : null))
            .then((payload: DomainSummaryResponse | null) => {
                if (payload) setFullSummary(payload);
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

    const handleIssuePageClick = useCallback((url: string) => {
        const page = pagesByUrl.get(url);
        if (page) router.push(pathResults(page.id));
    }, [pagesByUrl, router]);

    const aggregated = fullSummary?.aggregated?.issues ?? null;
    const totalPageCount = fullSummary?.totalPageCount ?? 0;
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
                                href={project?.domain ? pathScanDomain({ url: project.domain }) : pathProject(id)}
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

                {!loading && aggregated && (
                    <>
                        {/* Stats card */}
                        <MsqdxMoleculeCard
                            title={t('projects.wcag.summary')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider={false}
                            sx={{ bgcolor: 'var(--color-card-bg)' }}
                        >
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
                            <MsqdxMoleculeCard
                                title={t('projects.wcag.pagesWithMostErrors')}
                                variant="flat"
                                borderRadius="lg"
                                footerDivider={false}
                                sx={{ bgcolor: 'var(--color-card-bg)' }}
                            >
                                <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 180, overflow: 'auto' }}>
                                    {aggregated.pagesByIssueCount.slice(0, 15).map((row) => {
                                        const page = pagesByUrl.get(row.url);
                                        const label = `${row.errors} ${t('share.errors')}, ${row.warnings} ${t('share.warnings')}`;
                                        return (
                                            <li key={row.url}>
                                                {page ? (
                                                    <MsqdxButton
                                                        size="small"
                                                        variant="text"
                                                        onClick={() => router.push(pathResults(page.id))}
                                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                                    >
                                                        {row.url} — {label}
                                                    </MsqdxButton>
                                                ) : (
                                                    <MsqdxTypography variant="caption">
                                                        {row.url} — {label}
                                                    </MsqdxTypography>
                                                )}
                                            </li>
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
