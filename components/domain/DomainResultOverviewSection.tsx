'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Box, CircularProgress } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxCard,
    MsqdxChip,
} from '@msqdx/react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import dynamic from 'next/dynamic';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import {
    DOMAIN_SLIM_PAGES_CHUNK,
    DOMAIN_SLIM_PAGES_MAX_CLIENT,
    DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
} from '@/lib/constants';
import { pathDomainSection } from '@/lib/domain-result-sections';
const ScannedPagesTable = dynamic(
    () => import('@/components/ScannedPagesTable').then((m) => ({ default: m.ScannedPagesTable })),
    { ssr: false, loading: () => <Box sx={{ py: 2 }}><CircularProgress size={24} /></Box> }
);

export type DomainResultOverviewSectionProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    result: DomainSummaryApiResponse;
    pages: SlimPage[];
    slimPagesLoading: boolean;
    totalPageCount: number;
    canLoadMoreSlimPages: boolean;
    slimPagesRemoteTotal: number | null;
    loadMoreSlimPages: () => Promise<void>;
    domainId: string;
    onScannedPageOpen: (page: SlimPage) => void;
};

function DomainResultOverviewSectionInner({
    t,
    result,
    pages,
    slimPagesLoading,
    totalPageCount,
    canLoadMoreSlimPages,
    slimPagesRemoteTotal,
    loadMoreSlimPages,
    domainId,
    onScannedPageOpen,
}: DomainResultOverviewSectionProps) {
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
                        href={pathDomainSection(domainId, 'page-topics')}
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
                    {slimPagesLoading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CircularProgress size={20} sx={{ color: 'var(--color-theme-accent)' }} />
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Seitenliste wird geladen…
                            </MsqdxTypography>
                        </Box>
                    )}
                    {totalPageCount > DOMAIN_SLIM_PAGES_MAX_CLIENT && pages.length >= DOMAIN_SLIM_PAGES_MAX_CLIENT && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                            Es werden die ersten {DOMAIN_SLIM_PAGES_MAX_CLIENT.toLocaleString()} von {totalPageCount.toLocaleString()} Seiten in der Tabelle angezeigt.
                        </MsqdxTypography>
                    )}
                    {canLoadMoreSlimPages && domainId && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                            <MsqdxButton
                                size="small"
                                variant="outlined"
                                disabled={slimPagesLoading}
                                onClick={() => void loadMoreSlimPages()}
                            >
                                {t('domainResult.slimPagesLoadMore', { count: DOMAIN_SLIM_PAGES_CHUNK })}
                            </MsqdxButton>
                            {slimPagesRemoteTotal != null && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {pages.length.toLocaleString()} / {slimPagesRemoteTotal.toLocaleString()}
                                </MsqdxTypography>
                            )}
                        </Box>
                    )}
                    <ScannedPagesTable pages={pages} onPageClick={onScannedPageOpen} />
                </MsqdxCard>
            </Box>
        </Box>
    );
}

export const DomainResultOverviewSection = memo(DomainResultOverviewSectionInner);
