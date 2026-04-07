'use client';

import React, { memo, useCallback, useMemo, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard } from '@msqdx/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { RemotePaginationBar } from '@/components/RemotePaginationBar';
import { InfoTooltip } from '@/components/InfoTooltip';
import dynamic from 'next/dynamic';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import {
    DOMAIN_SLIM_PAGES_PAGE_SIZE,
    apiScanDomainSlimPages,
} from '@/lib/constants';
import type { ScannedPagesSortKey } from '@/components/ScannedPagesTable';
import { DomainResultOverviewLeftColumn } from '@/components/domain/DomainResultOverviewLeftColumn';
import { MSQDX_INNER_CARD_BORDER_SX } from '@/lib/theme-accent';

const ScannedPagesTable = dynamic(
    () => import('@/components/ScannedPagesTable').then((m) => ({ default: m.ScannedPagesTable })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);

export type DomainResultOverviewSectionProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    result: DomainSummaryApiResponse;
    domainId: string;
    totalPageCount: number;
    /** From bundle — total rows for slim table. */
    totalSlimRows: number | null;
    /** Preserve `?projectId=` when opening Page Topics from overview. */
    domainLinkQuery: Record<string, string>;
    onScannedPageOpen: (page: SlimPage) => void;
};

function DomainResultOverviewSectionInner({
    t,
    result,
    domainId,
    totalPageCount,
    totalSlimRows,
    domainLinkQuery,
    onScannedPageOpen,
}: DomainResultOverviewSectionProps) {
    const [pageIndex, setPageIndex] = useState(0);
    const [sortKey, setSortKey] = useState<ScannedPagesSortKey>('url');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const handleServerSort = useCallback(
        (key: ScannedPagesSortKey) => {
            setPageIndex(0);
            setSortKey((prev) => {
                if (prev === key) {
                    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    return prev;
                }
                setSortDir('asc');
                return key;
            });
        },
        []
    );

    const embeddedPages = (result.pages as SlimPage[] | undefined)?.length
        ? (result.pages as SlimPage[])
        : null;

    const slimQuery = useQuery({
        queryKey: ['domain-slim-pages', domainId, pageIndex, sortKey, sortDir],
        queryFn: async () => {
            const offset = pageIndex * DOMAIN_SLIM_PAGES_PAGE_SIZE;
            const res = await fetch(
                apiScanDomainSlimPages(domainId, {
                    offset,
                    limit: DOMAIN_SLIM_PAGES_PAGE_SIZE,
                    sort: sortKey,
                    dir: sortDir,
                }),
                { credentials: 'same-origin' }
            );
            if (!res.ok) throw new Error('slim-pages failed');
            return res.json() as Promise<{ data?: SlimPage[]; total?: number }>;
        },
        enabled: embeddedPages === null && Boolean(domainId),
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false,
    });

    const tablePages: SlimPage[] =
        embeddedPages ?? slimQuery.data?.data ?? [];
    const remoteTotal =
        embeddedPages?.length ??
        slimQuery.data?.total ??
        totalSlimRows ??
        totalPageCount;
    const hasSlimRows = tablePages.length > 0;
    /** Erstes Laden ohne Zeilen: Placeholder greift bei Seitenwechsel — kein Leeren der Tabelle. */
    const slimInitialLoading = embeddedPages === null && slimQuery.isPending && !hasSlimRows;
    const slimRefetching = embeddedPages === null && slimQuery.isFetching && !slimQuery.isPending;

    const slimPaginationFooter = useMemo(
        () => (
            <>
                {embeddedPages === null ? (
                    <RemotePaginationBar
                        page={pageIndex}
                        pageSize={DOMAIN_SLIM_PAGES_PAGE_SIZE}
                        total={remoteTotal}
                        loading={slimRefetching}
                        onPageChange={setPageIndex}
                        labels={{ prev: t('share.back'), next: t('share.next') }}
                    />
                ) : null}
                <MsqdxTypography
                    variant="caption"
                    sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem', display: 'block', mt: 0.5 }}
                >
                    {embeddedPages !== null
                        ? `${tablePages.length.toLocaleString()} ${t('domainResult.pagesScanned')}`
                        : `${remoteTotal.toLocaleString()} ${t('domainResult.pagesScanned')}`}
                </MsqdxTypography>
            </>
        ),
        [embeddedPages, pageIndex, remoteTotal, slimRefetching, tablePages.length, t]
    );

    return (
        <MsqdxMoleculeCard variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)' }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 'var(--msqdx-spacing-md)',
                    minHeight: 0,
                    alignItems: 'flex-start',
                }}
            >
                <DomainResultOverviewLeftColumn
                    t={t}
                    score={result.score}
                    totalPages={result.totalPages}
                    systemicIssues={result.systemicIssues}
                    eeat={result.eeat}
                    domainId={domainId}
                    domainLinkQuery={domainLinkQuery}
                />

                <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <MsqdxMoleculeCard
                        title={t('domainResult.scannedPages')}
                        titleVariant="h6"
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        headerActions={<InfoTooltip title={t('info.scannedPages')} ariaLabel={t('common.info')} />}
                        sx={{
                            bgcolor: 'var(--color-card-bg)',
                            flex: 1,
                            minHeight: 0,
                            minWidth: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            ...MSQDX_INNER_CARD_BORDER_SX,
                        }}
                    >
                        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>
                            {slimInitialLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                                    <CircularProgress size={28} sx={{ color: 'var(--color-theme-accent)' }} />
                                </Box>
                            ) : (
                                <ScannedPagesTable
                                    pages={tablePages}
                                    onPageClick={onScannedPageOpen}
                                    serverSort={embeddedPages === null}
                                    sortKey={sortKey}
                                    sortDir={sortDir}
                                    onSortChange={embeddedPages === null ? handleServerSort : undefined}
                                    paginationFooter={slimPaginationFooter}
                                />
                            )}
                        </Box>
                    </MsqdxMoleculeCard>
                </Box>
            </Box>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultOverviewSection = memo(DomainResultOverviewSectionInner);
