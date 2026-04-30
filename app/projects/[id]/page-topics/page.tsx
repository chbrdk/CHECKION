'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { useFetchOnceForId } from '@/hooks/useFetchOnceForId';
import { apiProject, apiProjectDomainSummaryAll, pathDomain } from '@/lib/constants';
import { DomainResultPageTopicsCard } from '@/components/domain/DomainResultPageTopicsCard';
import type { AggregatedPageClassification } from '@/lib/types';

type SummaryAggregated = {
    pageClassification?: AggregatedPageClassification | null;
};

type OwnPayload = {
    scanId: string;
    aggregated?: SummaryAggregated;
} | null;

type CompetitorPayload = {
    scanId: string;
    status: string;
    aggregated?: SummaryAggregated;
} | null;

export default function ProjectPageTopicsPage() {
    const params = useParams();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<{ name: string; domain: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [own, setOwn] = useState<OwnPayload>(null);
    const [competitors, setCompetitors] = useState<Record<string, CompetitorPayload | null>>({});
    const fetchedForIdRef = useFetchOnceForId();

    useEffect(() => {
        if (!id) return;
        if (fetchedForIdRef.current === id) return;
        fetchedForIdRef.current = id;
        const ac = new AbortController();
        const { signal } = ac;
        setLoading(true);
        setOwn(null);
        setCompetitors({});
        Promise.all([
            fetch(apiProject(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
            fetch(apiProjectDomainSummaryAll(id), { credentials: 'same-origin', signal }).then((r) => r.json()),
        ])
            .then(([projectRes, summaryRes]) => {
                if (signal.aborted) return;
                const p = projectRes?.data as { name?: string; domain?: string | null } | undefined;
                if (p) setProject({ name: p.name ?? '', domain: p.domain ?? null });
                else setProject(null);
                if (summaryRes?.success && summaryRes?.data) {
                    const d = summaryRes.data as { own: OwnPayload; competitors: Record<string, CompetitorPayload | null> };
                    setOwn(d.own ?? null);
                    setCompetitors(d.competitors ?? {});
                }
            })
            .catch(() => {
                if (!signal.aborted) {
                    setProject(null);
                    setOwn(null);
                    setCompetitors({});
                }
            })
            .finally(() => {
                if (!signal.aborted) setLoading(false);
            });
        return () => ac.abort();
    }, [id, fetchedForIdRef]);

    if (!id) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
            </Box>
        );
    }

    const ownPc = own?.aggregated?.pageClassification ?? null;
    const ownLabel = project?.domain?.trim() || t('projects.ownDomainScanLabel');
    const competitorEntries = Object.entries(competitors).sort(([a], [b]) => a.localeCompare(b));

    const hasAnyTopics =
        (ownPc && ownPc.coverage.pagesWithClassification > 0) ||
        competitorEntries.some(
            ([, c]) =>
                c?.status === 'complete' &&
                c?.aggregated?.pageClassification &&
                c.aggregated.pageClassification.coverage.pagesWithClassification > 0
        );

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto', width: '100%', boxSizing: 'border-box' }}>
            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                <Link href={pathProject(id)} style={{ textDecoration: 'none' }}>
                    <MsqdxButton variant="outlined" size="small">
                        ← {project?.name ?? t('projects.title')}
                    </MsqdxButton>
                </Link>
            </Box>
            <MsqdxTypography variant="h4" weight="bold" sx={{ mb: 0.5 }}>
                {t('projects.pageTopicsCompareTitle')}
            </MsqdxTypography>
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 3 }}>
                {t('projects.pageTopicsCompareSubtitle')}
            </MsqdxTypography>

            {!hasAnyTopics ? (
                <MsqdxMoleculeCard
                    title={t('domainResult.pageTopicsTitle')}
                    variant="flat"
                    borderRadius="lg"
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('domainResult.pageTopicsEmpty')}
                    </MsqdxTypography>
                </MsqdxMoleculeCard>
            ) : (
                <Stack spacing={4}>
                    {own && (
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                <MsqdxTypography variant="h5" weight="bold">
                                    {ownLabel}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />
                                    <Link href={pathDomain(own.scanId, { projectId: id })} style={{ textDecoration: 'none' }}>
                                        <MsqdxButton variant="outlined" size="small">
                                            {t('projects.openDeepScan')}
                                        </MsqdxButton>
                                    </Link>
                                </Box>
                            </Box>
                            {ownPc && ownPc.coverage.pagesWithClassification > 0 ? (
                                <DomainResultPageTopicsCard t={t} pageClassification={ownPc} placement="tab" />
                            ) : (
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {t('domainResult.pageTopicsEmpty')}
                                </MsqdxTypography>
                            )}
                        </Box>
                    )}

                    {competitorEntries.map(([domain, comp]) => {
                        if (!comp) return null;
                        const pc = comp.aggregated?.pageClassification ?? null;
                        const hasData = comp.status === 'complete' && pc && pc.coverage.pagesWithClassification > 0;
                        return (
                            <Box key={domain}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                                    <MsqdxTypography variant="h5" weight="bold">
                                        {domain}
                                    </MsqdxTypography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <InfoTooltip title={t('info.pageTopicsAggregate')} ariaLabel={t('common.info')} />
                                        <Link href={pathDomain(comp.scanId, { projectId: id })} style={{ textDecoration: 'none' }}>
                                            <MsqdxButton variant="outlined" size="small" disabled={comp.status !== 'complete'}>
                                                {t('projects.openDeepScan')}
                                            </MsqdxButton>
                                        </Link>
                                    </Box>
                                </Box>
                                {comp.status !== 'complete' ? (
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {t('projects.pageTopicsCompetitorIncomplete', { status: comp.status })}
                                    </MsqdxTypography>
                                ) : hasData ? (
                                    <DomainResultPageTopicsCard t={t} pageClassification={pc} placement="tab" />
                                ) : (
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {t('domainResult.pageTopicsEmpty')}
                                    </MsqdxTypography>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            )}
        </Box>
    );
}
