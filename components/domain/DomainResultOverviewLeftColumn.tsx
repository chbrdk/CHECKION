'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { CheckCircle } from 'lucide-react';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import { DOMAIN_TAB_SYSTEMIC_ISSUE_ROW_ESTIMATE_PX, DOMAIN_TAB_VIRTUAL_OVERSCAN } from '@/lib/constants';
import { pathDomainSection } from '@/lib/domain-result-sections';
import { SystemicIssueScrollRow } from '@/components/domain/SystemicIssueScrollRow';
import { THEME_ACCENT_CSS, THEME_ACCENT_TINT_CSS } from '@/lib/theme-accent';

const EEAT_POSITIVE_CHIP_SX = {
    bgcolor: `${THEME_ACCENT_TINT_CSS} !important`,
    color: `${THEME_ACCENT_CSS} !important`,
} as const;

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
            <Stack spacing={2}>
            <MsqdxMoleculeCard
                title={t('domainResult.domainScore')}
                titleVariant="h6"
                variant="flat"
                borderRadius="lg"
                footerDivider={false}
                headerActions={<InfoTooltip title={t('info.domainScore')} ariaLabel={t('common.info')} />}
                sx={{ bgcolor: 'var(--color-card-bg)' }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 'var(--msqdx-spacing-md)' }}>
                    <Box
                        sx={{
                            position: 'relative',
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            border: `8px solid ${score > 80 ? THEME_ACCENT_CSS : 'var(--color-secondary-dx-orange)'}`,
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
            </MsqdxMoleculeCard>

                <MsqdxMoleculeCard
                    title={t('domainResult.systemicIssues')}
                    titleVariant="h6"
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    headerActions={<InfoTooltip title={t('info.systemicIssues')} ariaLabel={t('common.info')} />}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    {!hasIssues ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                            <CheckCircle color={THEME_ACCENT_CSS} />
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
                </MsqdxMoleculeCard>

                <Box>
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
                    <MsqdxMoleculeCard
                        title={t('domainResult.eeatTitle')}
                        titleVariant="h6"
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        headerActions={<InfoTooltip title={t('info.eeat')} ariaLabel={t('common.info')} />}
                        sx={{ bgcolor: 'var(--color-card-bg)' }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                            <Box>
                                <MsqdxTypography variant="subtitle2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 0.5 }}>
                                    {t('domainResult.eeatTrust')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)' }}>
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatImpressum', { count: eeat.trust.pagesWithImpressum, total: eeat.trust.totalPages })}
                                        sx={eeat.trust.pagesWithImpressum > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatContact', { count: eeat.trust.pagesWithContact, total: eeat.trust.totalPages })}
                                        sx={eeat.trust.pagesWithContact > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatPrivacy', { count: eeat.trust.pagesWithPrivacy, total: eeat.trust.totalPages })}
                                        sx={eeat.trust.pagesWithPrivacy > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
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
                                        sx={eeat.experience.pagesWithAbout > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatTeam', { count: eeat.experience.pagesWithTeam, total: eeat.experience.totalPages })}
                                        sx={eeat.experience.pagesWithTeam > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatCaseStudy', {
                                            count: eeat.experience.pagesWithCaseStudyMention,
                                            total: eeat.experience.totalPages,
                                        })}
                                        sx={eeat.experience.pagesWithCaseStudyMention > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
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
                                        sx={eeat.expertise.pagesWithAuthorBio > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
                                    />
                                    <MsqdxChip
                                        size="small"
                                        label={t('domainResult.eeatArticleAuthor', {
                                            count: eeat.expertise.pagesWithArticleAuthor,
                                            total: eeat.expertise.totalPages,
                                        })}
                                        sx={eeat.expertise.pagesWithArticleAuthor > 0 ? EEAT_POSITIVE_CHIP_SX : undefined}
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
                    </MsqdxMoleculeCard>
            )}
            </Stack>
        </Box>
    );
});
