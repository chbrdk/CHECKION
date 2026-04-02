'use client';

import React, { memo } from 'react';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxChip, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import dynamic from 'next/dynamic';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { DomainScanContextValue } from '@/context/DomainScanContext';
import type { SlimPage } from '@/lib/types';

const DomainIssuesMasterDetail = dynamic(
    () => import('@/components/DomainIssuesMasterDetail').then((m) => ({ default: m.DomainIssuesMasterDetail })),
    { ssr: false, loading: () => <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box> }
);

export type DomainResultListDetailsSectionProps = {
    t: (key: string, values?: Record<string, string | number>) => string;
    domainId: string;
    totalPageCount: number;
    issueStats: { errors: number; warnings: number; notices: number } | null;
    pagesById: ReadonlyMap<string, SlimPage>;
    selectedGroupKey: string | null;
    selectedPageId: string | null;
    issuesType: string | null;
    issuesWcag: string | null;
    issuesQ: string | null;
    onChangeFilters: DomainScanContextValue['setIssuesFilters'];
    onSelectGroup: DomainScanContextValue['selectGroup'];
    onSelectPage: DomainScanContextValue['selectPage'];
    onOpenPageScan: DomainScanContextValue['handleIssuePageClick'];
    onBackToGroups: DomainScanContextValue['clearIssuesGroupSelection'];
    onBackToPages: DomainScanContextValue['clearIssuesPageSelection'];
};

function DomainResultListDetailsSectionInner(props: DomainResultListDetailsSectionProps) {
    const {
        t,
        domainId,
        totalPageCount,
        issueStats,
        pagesById,
        selectedGroupKey,
        selectedPageId,
        issuesType,
        issuesWcag,
        issuesQ,
        onChangeFilters,
        onSelectGroup,
        onSelectPage,
        onOpenPageScan,
        onBackToGroups,
        onBackToPages,
    } = props;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
            <MsqdxMoleculeCard
                title="Gefundene Issues (Domain)"
                headerActions={<InfoTooltip title={t('info.issuesList')} ariaLabel={t('common.info')} />}
                subtitle={`Paged (DB) · aggregiert über ${totalPageCount} Seite(n)`}
                variant="flat"
                sx={{ bgcolor: 'var(--color-card-bg)', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
                borderRadius="lg"
            >
                {issueStats && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, flexShrink: 0 }}>
                        <MsqdxChip label={`Errors: ${issueStats.errors}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }} />
                        <MsqdxChip label={`Warnings: ${issueStats.warnings}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                        <MsqdxChip label={`Notices: ${issueStats.notices}`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                    </Box>
                )}
                {domainId && (
                    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <DomainIssuesMasterDetail
                            domainId={domainId}
                            pagesById={pagesById}
                            selectedGroupKey={selectedGroupKey}
                            selectedPageId={selectedPageId}
                            issuesType={issuesType}
                            issuesWcag={issuesWcag}
                            issuesQ={issuesQ}
                            onChangeFilters={onChangeFilters}
                            onSelectGroup={onSelectGroup}
                            onSelectPage={onSelectPage}
                            onOpenPageScan={onOpenPageScan}
                            onBackToGroups={onBackToGroups}
                            onBackToPages={onBackToPages}
                        />
                    </Box>
                )}
            </MsqdxMoleculeCard>
        </Box>
    );
}

export const DomainResultListDetailsSection = memo(DomainResultListDetailsSectionInner);
