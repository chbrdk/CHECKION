'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxCard, MsqdxMoleculeCard, MsqdxIcon } from '@msqdx/react';
import { MSQDX_COLORS, MSQDX_NEUTRAL, MSQDX_STATUS } from '@msqdx/tokens';
import type { StandaloneScanSummary } from '@/lib/types';
import { HistoryList, SingleScanRow, DomainScanRow, type DomainScanSummary } from '@/components/HistoryList';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    DASHBOARD_SCANS_PAGE_SIZE,
    DASHBOARD_JOURNEYS_PAGE_SIZE,
    apiScanList,
    apiScansDomainList,
    apiJourneysList,
    apiScansDelete,
    apiScansDomainDelete,
    pathResults,
    pathDomain,
    PATH_SCAN,
    PATH_DEEP_SCANS,
} from '@/lib/constants';
import { pathDomainSection } from '@/lib/domain-result-sections';
import { PaginationBar } from '@/components/PaginationBar';

const LIMIT = DASHBOARD_SCANS_PAGE_SIZE;

type Pagination = { total: number; page: number; limit: number; totalPages: number };

export default function DashboardPage() {
    const router = useRouter();
    const { t } = useI18n();
    const [scans, setScans] = useState<StandaloneScanSummary[]>([]);
    const [domainScans, setDomainScans] = useState<DomainScanSummary[]>([]);
    const [scanPagination, setScanPagination] = useState<Pagination | null>(null);
    const [domainPagination, setDomainPagination] = useState<Pagination | null>(null);
    const [scanPage, setScanPage] = useState(1);
    const [domainPage, setDomainPage] = useState(1);
    const [journeyPage, setJourneyPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [savedJourneys, setSavedJourneys] = useState<
        Array<{
            id: string;
            domainScanId: string;
            domain?: string;
            name: string | null;
            goal: string;
            createdAt: string;
        }>
    >([]);
    const [journeyPagination, setJourneyPagination] = useState<Pagination | null>(null);

    const handleDeleteScan = useCallback(
        async (id: string) => {
            if (!window.confirm(t('dashboard.deleteScanConfirm'))) return;
            try {
                const res = await fetch(apiScansDelete(id), { method: 'DELETE' });
                if (res.ok) {
                    setScans((prev) => prev.filter((s) => s.id !== id));
                    if (scanPagination) {
                        setScanPagination((p) => (p ? { ...p, total: Math.max(0, p.total - 1) } : null));
                    }
                }
            } catch {
                /* ignore */
            }
        },
        [scanPagination, t],
    );

    const handleDeleteDomainScan = useCallback(
        async (id: string) => {
            if (!window.confirm(t('dashboard.deleteDomainScanConfirm'))) return;
            try {
                const res = await fetch(apiScansDomainDelete(id), { method: 'DELETE' });
                if (res.ok) {
                    setDomainScans((prev) => prev.filter((d) => d.id !== id));
                    if (domainPagination) {
                        setDomainPagination((p) => (p ? { ...p, total: Math.max(0, p.total - 1) } : null));
                    }
                }
            } catch {
                /* ignore */
            }
        },
        [domainPagination, t],
    );

    const loadScans = useCallback(async () => {
        setLoading(true);
        try {
            const [scanRes, domainRes, journeysRes] = await Promise.all([
                fetch(apiScanList({ limit: LIMIT, page: scanPage })).then((r) => r.json()),
                fetch(apiScansDomainList({ limit: LIMIT, page: domainPage })).then((r) => r.json()),
                fetch(apiJourneysList({ limit: DASHBOARD_JOURNEYS_PAGE_SIZE, page: journeyPage }), {
                    credentials: 'same-origin',
                }).then((r) => r.json()),
            ]);
            setScans(Array.isArray(scanRes?.data) ? scanRes.data : []);
            setScanPagination(scanRes?.pagination ?? null);
            setDomainScans(Array.isArray(domainRes?.data) ? domainRes.data : []);
            setDomainPagination(domainRes?.pagination ?? null);
            setSavedJourneys(Array.isArray(journeysRes?.data) ? journeysRes.data : []);
            setJourneyPagination(journeysRes?.pagination ?? null);
        } catch {
            setScans([]);
            setDomainScans([]);
            setScanPagination(null);
            setDomainPagination(null);
            setSavedJourneys([]);
            setJourneyPagination(null);
        } finally {
            setLoading(false);
        }
    }, [scanPage, domainPage, journeyPage]);

    useEffect(() => {
        loadScans();
    }, [loadScans]);

    const totalScans = (scanPagination?.total ?? 0) + (domainPagination?.total ?? 0);
    const totalErrors = scans.reduce((sum, s) => sum + s.stats.errors, 0);
    const totalWarnings = scans.reduce((sum, s) => sum + s.stats.warnings, 0);
    const totalNotices = scans.reduce((sum, s) => sum + s.stats.notices, 0);

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box
                sx={{
                    mb: 'var(--msqdx-spacing-xxl)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'end',
                }}
            >
                <Box>
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--msqdx-spacing-xs)',
                            mb: 'var(--msqdx-spacing-xs)',
                        }}
                    >
                        <MsqdxTypography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            {t('dashboard.title')}
                        </MsqdxTypography>
                    </Box>
                    <MsqdxTypography variant="body2" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                        {t('info.dashboard')}
                    </MsqdxTypography>
                </Box>
            </Box>

            <MsqdxMoleculeCard
                variant="flat"
                borderRadius="lg"
                footerDivider={false}
                sx={{ bgcolor: 'var(--color-card-bg)', mb: 'var(--msqdx-spacing-md)', px: 'var(--msqdx-spacing-md)' }}
            >
                <MsqdxButton
                    variant="contained"
                    size="large"
                    startIcon={<MsqdxIcon name="add" size="xl" />}
                    onClick={() => router.push(PATH_SCAN)}
                    sx={{ alignSelf: 'center' }}
                >
                    {t('dashboard.newScan')}
                </MsqdxButton>
            </MsqdxMoleculeCard>

            {/* Stats Cards */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--msqdx-spacing-sm)',
                    mb: 'var(--msqdx-spacing-md)',
                }}
            >
                <StatCard label={t('dashboard.stats.scans')} value={totalScans} color="success" />
                <StatCard label={t('dashboard.stats.errors')} value={totalErrors} color="error" />
                <StatCard label={t('dashboard.stats.warnings')} value={totalWarnings} color="warning" />
                <StatCard label={t('dashboard.stats.notices')} value={totalNotices} color="info" />
            </Box>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                    gap: 'var(--msqdx-spacing-md)',
                }}
            >
                {/* Scan History using MsqdxCard */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <MsqdxMoleculeCard
                        title={t('dashboard.historyTitle')}
                        subtitle={t('info.scanHistory')}
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', px: 'var(--msqdx-spacing-md)' }}
                    >
                        <HistoryList
                            loading={loading}
                            items={scans}
                            renderItem={(scan) => (
                                <SingleScanRow
                                    key={scan.id}
                                    scan={scan}
                                    onClick={() => router.push(pathResults(scan.id))}
                                    onDelete={handleDeleteScan}
                                />
                            )}
                            filterFn={(scan, q) => scan.url.toLowerCase().includes(q)}
                            emptyMessage={t('dashboard.emptyMessage')}
                            emptyActionLabel={t('dashboard.emptyCta')}
                            onEmptyAction={() => router.push(PATH_SCAN)}
                        />
                        {scanPagination && scanPagination.totalPages > 1 && (
                            <PaginationBar
                                page={scanPagination.page}
                                totalPages={scanPagination.totalPages}
                                onPrev={() => setScanPage((p) => Math.max(1, p - 1))}
                                onNext={() => setScanPage((p) => Math.min(scanPagination.totalPages, p + 1))}
                                t={t}
                            />
                        )}
                    </MsqdxMoleculeCard>

                    <MsqdxMoleculeCard
                        title={t('dashboard.domainHistoryTitle')}
                        subtitle={t('info.domainHistory')}
                        headerActions={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Link href={PATH_DEEP_SCANS} style={{ color: 'inherit', fontSize: '0.875rem' }}>
                                    {t('dashboard.viewAllDeepScans')}
                                </Link>
                            </Box>
                        }
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', mt: 'var(--msqdx-spacing-md)' }}
                    >
                        <HistoryList
                            loading={loading}
                            items={domainScans}
                            renderItem={(ds) => (
                                <DomainScanRow
                                    key={ds.id}
                                    item={ds}
                                    onClick={() =>
                                        router.push(
                                            pathDomain(ds.id, ds.projectId ? { projectId: ds.projectId } : undefined),
                                        )
                                    }
                                    onDelete={handleDeleteDomainScan}
                                />
                            )}
                            filterFn={(ds, q) => ds.domain.toLowerCase().includes(q)}
                            emptyMessage={t('dashboard.domainEmptyMessage')}
                            emptyActionLabel={t('dashboard.domainEmptyCta')}
                            onEmptyAction={() => router.push(PATH_SCAN)}
                        />
                        {domainPagination && domainPagination.totalPages > 1 && (
                            <PaginationBar
                                page={domainPagination.page}
                                totalPages={domainPagination.totalPages}
                                onPrev={() => setDomainPage((p) => Math.max(1, p - 1))}
                                onNext={() => setDomainPage((p) => Math.min(domainPagination.totalPages, p + 1))}
                                t={t}
                            />
                        )}
                    </MsqdxMoleculeCard>

                    <MsqdxMoleculeCard
                        title={t('dashboard.journeyHistoryTitle')}
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)', mt: 'var(--msqdx-spacing-md)' }}
                    >
                        {savedJourneys.length === 0 ? (
                            <MsqdxTypography variant="body2" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                                {t('dashboard.journeyHistoryEmpty')}
                            </MsqdxTypography>
                        ) : (
                            <Box
                                component="ul"
                                sx={{
                                    listStyle: 'none',
                                    m: 0,
                                    p: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0.5,
                                }}
                            >
                                {savedJourneys.map((j) => (
                                    <Box
                                        key={j.id}
                                        component="li"
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 1,
                                            py: 0.75,
                                            px: 1,
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: 'var(--color-secondary-dx-grey-light-tint)' },
                                        }}
                                    >
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                                {j.name || j.goal}
                                            </MsqdxTypography>
                                            <MsqdxTypography
                                                variant="caption"
                                                sx={{ color: `${MSQDX_NEUTRAL['700']}` }}
                                            >
                                                {j.domain ?? j.domainScanId} ·{' '}
                                                {new Date(j.createdAt).toLocaleDateString()}
                                            </MsqdxTypography>
                                        </Box>
                                        <MsqdxButton
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                                router.push(
                                                    pathDomainSection(j.domainScanId, 'journey', {
                                                        restoreJourney: j.id,
                                                    }),
                                                )
                                            }
                                        >
                                            {t('dashboard.journeyHistoryOpen')}
                                        </MsqdxButton>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        {journeyPagination && journeyPagination.totalPages > 1 && (
                            <PaginationBar
                                page={journeyPagination.page}
                                totalPages={journeyPagination.totalPages}
                                onPrev={() => setJourneyPage((p) => Math.max(1, p - 1))}
                                onNext={() => setJourneyPage((p) => Math.min(journeyPagination.totalPages, p + 1))}
                                t={t}
                            />
                        )}
                    </MsqdxMoleculeCard>
                </Box>
            </Box>
        </Box>
    );
}

// Wrapper for StatCard using MsqdxCard
function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: keyof (typeof MSQDX_COLORS)['status'];
}) {
    // Actually looking at tokens.ts.
    // Let's use specific colors for value text.

    const statusColors: Record<string, string> = {
        success: MSQDX_STATUS.success.base,
        error: MSQDX_STATUS.error.dark,
        warning: MSQDX_STATUS.warning.light,
        info: MSQDX_COLORS.brand.purple,
    };

    return (
        <MsqdxCard hoverable sx={{ bgcolor: 'var(--color-card-bg)', borderColor: statusColors[color] }}>
            <MsqdxTypography
                variant="caption"
                sx={{
                    color: `${MSQDX_NEUTRAL['700']}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    display: 'block',
                    mb: 1,
                }}
            >
                {label}
            </MsqdxTypography>
            <MsqdxTypography
                variant="h3"
                sx={{
                    fontWeight: 700,
                    color: statusColors[color],
                    letterSpacing: '-0.03em',
                }}
            >
                {value}
            </MsqdxTypography>
        </MsqdxCard>
    );
}
