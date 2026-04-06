'use client';

import React, { useCallback } from 'react';
import type { SlimPage } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useDomainScan } from '@/context/DomainScanContext';
import { pathResults } from '@/lib/constants';
import { DomainResultGenerativeEmpty, DomainResultGenerativeSection } from './DomainResultGenerativeSection';
import { DomainResultInfraTab } from './DomainResultInfraSection';
import { DomainResultPageTopicsSection } from './DomainResultPageTopicsSection';
import { DomainResultLinksSeoEmpty, DomainResultLinksSeoSection } from './DomainResultLinksSeoSection';
import { DomainResultListDetailsSection } from './DomainResultListDetailsSection';
import { DomainResultOverviewSection } from './DomainResultOverviewSection';
import { DomainResultStructureEmpty, DomainResultStructureSection } from './DomainResultStructureSection';
import { DomainResultUxAuditEmpty, DomainResultUxAuditSection } from './DomainResultUxAuditSection';
import { DomainResultVisualMapSection } from './DomainResultVisualMapSection';
import { useI18n } from '@/components/i18n/I18nProvider';

export function DomainResultMain() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const {
        domainId,
        activeSection,
        result,
        totalPageCount,
        totalSlimRows,
        aggregated,
        uxBrokenLinksPreview,
        pagesById,
        openPageScanUrl,
        handleIssuePageClick,
        selectedGroupKey,
        selectedPageId,
        issuesType,
        issuesWcag,
        issuesQ,
        selectGroup,
        selectPage,
        clearIssuesPageSelection,
        clearIssuesGroupSelection,
        setIssuesFilters,
        domainLinkQuery,
    } = useDomainScan();

    const openScannedPage = useCallback(
        (page: SlimPage) => {
            router.push(pathResults(page.id));
        },
        [router]
    );

    if (!result) return null;

    const issueStats = aggregated?.issues?.stats ?? null;

    return (
        <>
            {activeSection === 'overview' && (
                <DomainResultOverviewSection
                    t={t}
                    result={result}
                    domainId={domainId}
                    totalPageCount={totalPageCount}
                    totalSlimRows={totalSlimRows}
                    domainLinkQuery={domainLinkQuery}
                    onScannedPageOpen={openScannedPage}
                />
            )}

            {activeSection === 'visual-map' && <DomainResultVisualMapSection t={t} graph={result.graph} />}

            {activeSection === 'list-details' && (
                <DomainResultListDetailsSection
                    t={t}
                    domainId={domainId}
                    totalPageCount={totalPageCount}
                    issueStats={issueStats}
                    pagesById={pagesById}
                    selectedGroupKey={selectedGroupKey}
                    selectedPageId={selectedPageId}
                    issuesType={issuesType}
                    issuesWcag={issuesWcag}
                    issuesQ={issuesQ}
                    onChangeFilters={setIssuesFilters}
                    onSelectGroup={selectGroup}
                    onSelectPage={selectPage}
                    onOpenPageScan={handleIssuePageClick}
                    onBackToGroups={clearIssuesGroupSelection}
                    onBackToPages={clearIssuesPageSelection}
                />
            )}

            {activeSection === 'ux-audit' &&
                (aggregated?.ux ? (
                    <DomainResultUxAuditSection
                        t={t}
                        ux={aggregated.ux}
                        onOpenPageUrl={openPageScanUrl}
                        uxBrokenLinksPreview={uxBrokenLinksPreview}
                    />
                ) : (
                    <DomainResultUxAuditEmpty t={t} />
                ))}

            {activeSection === 'structure' &&
                (aggregated?.structure ? (
                    <DomainResultStructureSection
                        t={t}
                        structure={aggregated.structure}
                        onOpenPageUrl={openPageScanUrl}
                    />
                ) : (
                    <DomainResultStructureEmpty t={t} />
                ))}

            {activeSection === 'links-seo' &&
                aggregated &&
                ((aggregated.seo || aggregated.links) ? (
                    <DomainResultLinksSeoSection
                        t={t}
                        locale={locale}
                        domainId={domainId}
                        aggregated={aggregated}
                        onOpenPageUrl={openPageScanUrl}
                    />
                ) : (
                    <DomainResultLinksSeoEmpty t={t} />
                ))}

            {activeSection === 'infra' && (
                <DomainResultInfraTab t={t} domainHost={result.domain} infra={aggregated?.infra} onOpenPageUrl={openPageScanUrl} />
            )}

            {activeSection === 'generative' &&
                (aggregated?.generative ? (
                    <DomainResultGenerativeSection t={t} generative={aggregated.generative} onOpenPageUrl={openPageScanUrl} />
                ) : (
                    <DomainResultGenerativeEmpty t={t} />
                ))}

            {activeSection === 'page-topics' && (
                <DomainResultPageTopicsSection t={t} pageClassification={aggregated?.pageClassification} />
            )}

        </>
    );
}
