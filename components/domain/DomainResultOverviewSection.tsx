'use client';

import React, { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { Box, CircularProgress } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxCard,
    MsqdxChip,
} from '@msqdx/react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { RemotePaginationBar } from '@/components/RemotePaginationBar';
import { InfoTooltip } from '@/components/InfoTooltip';
import dynamic from 'next/dynamic';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import {
    DOMAIN_SLIM_PAGES_PAGE_SIZE,
    DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
    apiScanDomainSlimPages,
} from '@/lib/constants';
import { pathDomainSection } from '@/lib/domain-result-sections';
import type { ScannedPagesSortKey } from '@/components/ScannedPagesTable';

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
    });

    const tablePages: SlimPage[] =
        embeddedPages ?? slimQuery.data?.data ?? [];
    const remoteTotal =
        embeddedPages?.length ??
        slimQuery.data?.total ??
        totalSlimRows ??
        totalPageCount;
    const slimLoading = embeddedPages === null && slimQuery.isFetching;

    const paginationBar =
        embeddedPages === null ? (
            <RemotePaginationBar
                page={pageIndex}
                pageSize={DOMAIN_SLIM_PAGES_PAGE_SIZE}
                total={remoteTotal}
                loading={slimLoading}
                onPageChange={setPageIndex}
                labels={{ prev: t('share.back'), next: t('share.next') }}
            />
        ) : null;

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 'var(--msqdx-spacing-md)' }}>
            <Box sx={{ flex: '0 0 350px' }}>
                <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', mb: 'var(--msqdx-spacing-md)' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxTypography variant="h6">{t('domainResult.domainScore')}</MsqdxTypography>
                        <InfoTooltip title={t('info.domainScore')} ariaLabel={t('common.info')} />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 'var(--msqdx-spacing-md)' }}>
                        <Box
                            sx={{
                                position: 'relative',
                                width: 120,
                                height: 120,
                                borderRadius: '50%',
                                border: `8px solid ${result.score > 80 ? 'var(--color-secondary-dx-green)' : 'var(--color-secondary-dx-orange)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <MsqdxTypography variant="h2">{result.score}</MsqdxTypography>
                        </Box>
                        <MsqdxTypography variant="body2" sx={{ mt: 'var(--msqdx-spacing-md)', color: 'var(--color-text-muted-on-light)' }}>
                            {result.totalPages} {t('domainResult.pagesScanned')}
                        </MsqdxTypography>
                    </Box>
                </MsqdxCard>

                <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                    <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                            <MsqdxTypography variant="h6">{t('domainResult.systemicIssues')}</MsqdxTypography>
                            <InfoTooltip title={t('info.systemicIssues')} ariaLabel={t('common.info')} />
                        </Box>
                        {(result.systemicIssues?.length ?? 0) === 0 ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                                <CheckCircle color="var(--color-secondary-dx-green)" />
                                <MsqdxTypography>{t('domainResult.noSystemicIssues')}</MsqdxTypography>
                            </Box>
                        ) : (
                            <VirtualScrollList
                                items={result.systemicIssues ?? []}
                                maxHeight={480}
                                estimateSize={DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX}
                                overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                                ariaLabel={t('domainResult.systemicIssues')}
                                getItemKey={(issue, idx) => `${issue.issueId}-${idx}`}
                                renderItem={(issue) => (
                                    <Box
                                        sx={{
                                            p: 'var(--msqdx-spacing-md)',
                                            mb: 'var(--msqdx-spacing-md)',
                                            border: '1px solid var(--color-secondary-dx-pink-tint)',
                                            borderRadius: 'var(--msqdx-radius-xs)',
                                            backgroundColor: 'var(--color-secondary-dx-pink-tint)',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                                            <AlertCircle color="var(--color-secondary-dx-pink)" size={20} />
                                            <MsqdxTypography variant="subtitle1" sx={{ color: 'var(--color-secondary-dx-pink)' }}>
                                                {issue.title}
                                            </MsqdxTypography>
                                            <MsqdxChip label={t('domainResult.issuePagesCount', { count: issue.count })} size="small" brandColor="pink" />
                                        </Box>
                                        <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                                            {t('domainResult.fixingRuleAffects', { issueId: issue.issueId, count: issue.count })}
                                        </MsqdxTypography>
                                    </Box>
                                )}
                            />
                        )}
                    </MsqdxCard>
                </Box>

                <Box sx={{ mt: 'var(--msqdx-spacing-md)' }}>
                    <Link
                        href={pathDomainSection(
                            domainId,
                            'page-topics',
                            Object.keys(domainLinkQuery).length ? domainLinkQuery : undefined
                        )}
                        style={{ textDecoration: 'none', color: 'var(--color-theme-accent)', fontWeight: 600, fontSize: '0.8125rem' }}
                    >
                        {t('domainResult.pageTopicsOverviewCta')}
                    </Link>
                </Box>

                {result.eeat && (
                    <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                        <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                                <MsqdxTypography variant="h6">{t('domainResult.eeatTitle')}</MsqdxTypography>
                                <InfoTooltip title={t('info.eeat')} ariaLabel={t('common.info')} />
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatTrust')}</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                        <MsqdxChip size="small" label={t('domainResult.eeatImpressum', { count: result.eeat.trust.pagesWithImpressum, total: result.eeat.trust.totalPages })} brandColor={result.eeat.trust.pagesWithImpressum > 0 ? 'green' : undefined} />
                                        <MsqdxChip size="small" label={t('domainResult.eeatContact', { count: result.eeat.trust.pagesWithContact, total: result.eeat.trust.totalPages })} brandColor={result.eeat.trust.pagesWithContact > 0 ? 'green' : undefined} />
                                        <MsqdxChip size="small" label={t('domainResult.eeatPrivacy', { count: result.eeat.trust.pagesWithPrivacy, total: result.eeat.trust.totalPages })} brandColor={result.eeat.trust.pagesWithPrivacy > 0 ? 'green' : undefined} />
                                    </Box>
                                </Box>
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatExperience')}</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                        <MsqdxChip size="small" label={t('domainResult.eeatAbout', { count: result.eeat.experience.pagesWithAbout, total: result.eeat.experience.totalPages })} brandColor={result.eeat.experience.pagesWithAbout > 0 ? 'green' : undefined} />
                                        <MsqdxChip size="small" label={t('domainResult.eeatTeam', { count: result.eeat.experience.pagesWithTeam, total: result.eeat.experience.totalPages })} brandColor={result.eeat.experience.pagesWithTeam > 0 ? 'green' : undefined} />
                                        <MsqdxChip size="small" label={t('domainResult.eeatCaseStudy', { count: result.eeat.experience.pagesWithCaseStudyMention, total: result.eeat.experience.totalPages })} brandColor={result.eeat.experience.pagesWithCaseStudyMention > 0 ? 'green' : undefined} />
                                    </Box>
                                </Box>
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatExpertise')}</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', alignItems: 'center' }}>
                                        <MsqdxChip size="small" label={t('domainResult.eeatAuthorBio', { count: result.eeat.expertise.pagesWithAuthorBio, total: result.eeat.expertise.totalPages })} brandColor={result.eeat.expertise.pagesWithAuthorBio > 0 ? 'green' : undefined} />
                                        <MsqdxChip size="small" label={t('domainResult.eeatArticleAuthor', { count: result.eeat.expertise.pagesWithArticleAuthor, total: result.eeat.expertise.totalPages })} brandColor={result.eeat.expertise.pagesWithArticleAuthor > 0 ? 'green' : undefined} />
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>{t('domainResult.eeatAvgCitations', { avg: result.eeat.expertise.avgCitationsPerPage.toFixed(1) })}</MsqdxTypography>
                                    </Box>
                                </Box>
                                {result.eeat.authoritativeness !== undefined && result.eeat.authoritativeness && (
                                    <Box>
                                        <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>{t('domainResult.eeatAuthoritativeness')}</MsqdxTypography>
                                        <MsqdxTypography variant="body2">{result.eeat.authoritativeness}</MsqdxTypography>
                                    </Box>
                                )}
                            </Box>
                        </MsqdxCard>
                    </Box>
                )}
            </Box>

            <Box sx={{ flex: 1 }}>
                <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxTypography variant="h6">{t('domainResult.scannedPages')}</MsqdxTypography>
                        <InfoTooltip title={t('info.scannedPages')} ariaLabel={t('common.info')} />
                    </Box>
                    {slimLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CircularProgress size={20} sx={{ color: 'var(--color-theme-accent)' }} />
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('common.loading')}
                            </MsqdxTypography>
                        </Box>
                    )}
                    <ScannedPagesTable
                        pages={tablePages}
                        onPageClick={onScannedPageOpen}
                        serverSort={embeddedPages === null}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSortChange={embeddedPages === null ? handleServerSort : undefined}
                        paginationFooter={
                            <>
                                {paginationBar}
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.7rem', display: 'block', mt: 0.5 }}>
                                    {embeddedPages !== null
                                        ? `${tablePages.length.toLocaleString()} ${t('domainResult.pagesScanned')}`
                                        : `${remoteTotal.toLocaleString()} ${t('domainResult.pagesScanned')}`}
                                </MsqdxTypography>
                            </>
                        }
                    />
                </MsqdxCard>
            </Box>
        </Box>
    );
}

export const DomainResultOverviewSection = memo(DomainResultOverviewSectionInner);
