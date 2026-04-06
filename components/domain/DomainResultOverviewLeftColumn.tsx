'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip } from '@msqdx/react';
import { CheckCircle } from 'lucide-react';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import { DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX, DOMAIN_TAB_VIRTUAL_OVERSCAN } from '@/lib/constants';
import { pathDomainSection } from '@/lib/domain-result-sections';
import { SystemicIssueScrollRow } from '@/components/domain/SystemicIssueScrollRow';

export type DomainResultOverviewLeftColumnProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    score: number;
    totalPages: number;
    systemicIssues: DomainSummaryApiResponse['systemicIssues'];
    eeat: DomainSummaryApiResponse['eeat'] | undefined;
    domainId: string;
    domainLinkQuery: Record<string, string>;
};

/**
 * Left column (score, systemic issues, E-E-A-T) — isolated from slim-pages query so
 * pagination/refetch does not re-render this block (reduces flicker).
 */
export const DomainResultOverviewLeftColumn = memo(function DomainResultOverviewLeftColumn({
    t,
    score,
    totalPages,
    systemicIssues,
    eeat,
    domainId,
    domainLinkQuery,
}: DomainResultOverviewLeftColumnProps) {
    const issues = systemicIssues ?? [];
    const hasIssues = issues.length > 0;

    return (
        <Box sx={{ flex: '0 0 350px', minWidth: 0 }}>
            <MsqdxCard
                variant="flat"
                sx={{
                    bgcolor: 'var(--color-card-bg)',
                    p: 'var(--msqdx-spacing-md)',
                    borderRadius: 'var(--msqdx-radius-sm)',
                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                    mb: 'var(--msqdx-spacing-md)',
                }}
            >
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
                            border: `8px solid ${score > 80 ? 'var(--color-secondary-dx-green)' : 'var(--color-secondary-dx-orange)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <MsqdxTypography variant="h2">{score}</MsqdxTypography>
                    </Box>
                    <MsqdxTypography variant="body2" sx={{ mt: 'var(--msqdx-spacing-md)', color: 'var(--color-text-muted-on-light)' }}>
                        {totalPages} {t('domainResult.pagesScanned')}
                    </MsqdxTypography>
                </Box>
            </MsqdxCard>

            <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                <MsqdxCard
                    variant="flat"
                    sx={{
                        bgcolor: 'var(--color-card-bg)',
                        p: 'var(--msqdx-spacing-md)',
                        borderRadius: 'var(--msqdx-radius-sm)',
                        border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                    }}
                >
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                        <MsqdxTypography variant="h6">{t('domainResult.systemicIssues')}</MsqdxTypography>
                        <InfoTooltip title={t('info.systemicIssues')} ariaLabel={t('common.info')} />
                    </Box>
                    {!hasIssues ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                            <CheckCircle color="var(--color-secondary-dx-green)" />
                            <MsqdxTypography>{t('domainResult.noSystemicIssues')}</MsqdxTypography>
                        </Box>
                    ) : (
                        <VirtualScrollList
                            items={issues}
                            maxHeight={480}
                            estimateSize={DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX}
                            overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                            ariaLabel={t('domainResult.systemicIssues')}
                            getItemKey={(issue, idx) => `${issue.issueId}-${idx}`}
                            renderItem={(issue) => <SystemicIssueScrollRow issue={issue} t={t} />}
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

            {eeat && (
                <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                    <MsqdxCard
                        variant="flat"
                        sx={{
                            bgcolor: 'var(--color-card-bg)',
                            p: 'var(--msqdx-spacing-md)',
                            borderRadius: 'var(--msqdx-radius-sm)',
                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                        }}
                    >
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                            <MsqdxTypography variant="h6">{t('domainResult.eeatTitle')}</MsqdxTypography>
                            <InfoTooltip title={t('info.eeat')} ariaLabel={t('common.info')} />
                        </Box>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                            <Box>
                                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>
                                    {t('domainResult.eeatTrust')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatImpressum', { count: eeat.trust.pagesWithImpressum, total: eeat.trust.totalPages })}
                                        brandColor={eeat.trust.pagesWithImpressum > 0 ? 'green' : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatContact', { count: eeat.trust.pagesWithContact, total: eeat.trust.totalPages })}
                                        brandColor={eeat.trust.pagesWithContact > 0 ? 'green' : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatPrivacy', { count: eeat.trust.pagesWithPrivacy, total: eeat.trust.totalPages })}
                                        brandColor={eeat.trust.pagesWithPrivacy > 0 ? 'green' : undefined}
                                    />
                                </Box>
                            </Box>
                            <Box>
                                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>
                                    {t('domainResult.eeatExperience')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatAbout', { count: eeat.experience.pagesWithAbout, total: eeat.experience.totalPages })}
                                        brandColor={eeat.experience.pagesWithAbout > 0 ? 'green' : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatTeam', { count: eeat.experience.pagesWithTeam, total: eeat.experience.totalPages })}
                                        brandColor={eeat.experience.pagesWithTeam > 0 ? 'green' : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatCaseStudy', {
                                            count: eeat.experience.pagesWithCaseStudyMention,
                                            total: eeat.experience.totalPages,
                                        })}
                                        brandColor={eeat.experience.pagesWithCaseStudyMention > 0 ? 'green' : undefined}
                                    />
                                </Box>
                            </Box>
                            <Box>
                                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>
                                    {t('domainResult.eeatExpertise')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', alignItems: 'center' }}>
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatAuthorBio', { count: eeat.expertise.pagesWithAuthorBio, total: eeat.expertise.totalPages })}
                                        brandColor={eeat.expertise.pagesWithAuthorBio > 0 ? 'green' : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatArticleAuthor', {
                                            count: eeat.expertise.pagesWithArticleAuthor,
                                            total: eeat.expertise.totalPages,
                                        })}
                                        brandColor={eeat.expertise.pagesWithArticleAuthor > 0 ? 'green' : undefined}
                                    />
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {t('domainResult.eeatAvgCitations', { avg: eeat.expertise.avgCitationsPerPage.toFixed(1) })}
                                    </MsqdxTypography>
                                </Box>
                            </Box>
                            {eeat.authoritativeness !== undefined && eeat.authoritativeness && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>
                                        {t('domainResult.eeatAuthoritativeness')}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="body2">{eeat.authoritativeness}</MsqdxTypography>
                                </Box>
                            )}
                        </Box>
                    </MsqdxCard>
                </Box>
            )}
        </Box>
    );
});
