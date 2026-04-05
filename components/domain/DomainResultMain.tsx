'use client';

import React, { useCallback } from 'react';
import type { SlimPage } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useDomainScan } from '@/context/DomainScanContext';
import { pathResults } from '@/lib/constants';
import { DomainResultGenerativeEmpty, DomainResultGenerativeSection } from './DomainResultGenerativeSection';
import { DomainResultInfraTab } from './DomainResultInfraSection';
import { DomainResultJourneySection } from './DomainResultJourneySection';
import { DomainResultPageTopicsSection } from './DomainResultPageTopicsSection';
import { DomainResultLinksSeoEmpty, DomainResultLinksSeoSection } from './DomainResultLinksSeoSection';
import { DomainResultListDetailsSection } from './DomainResultListDetailsSection';
import { DomainResultOverviewSection } from './DomainResultOverviewSection';
import { DomainResultStructureEmpty, DomainResultStructureSection } from './DomainResultStructureSection';
import { DomainResultUxAuditEmpty, DomainResultUxAuditSection } from './DomainResultUxAuditSection';
import { DomainResultUxCxSection } from './DomainResultUxCxSection';
import { DomainResultVisualAnalysisSection } from './DomainResultVisualAnalysisSection';
import { DomainResultVisualMapSection } from './DomainResultVisualMapSection';
import { useI18n } from '@/components/i18n/I18nProvider';

export function DomainResultMain() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const {
        domainId,
        activeSection,
        result,
        setResult,
        seoPagesHydrating,
        summarizing,
        setSummarizing,
        summarizeError,
        setSummarizeError,
        journeyGoal,
        setJourneyGoal,
        journeyLoading,
        setJourneyLoading,
        journeyResult,
        setJourneyResult,
        journeyError,
        setJourneyError,
        journeySaving,
        setJourneySaving,
        journeySaved,
        setJourneySaved,
        journeySaveName,
        setJourneySaveName,
        slimPagesLoading,
        slimPagesRemoteTotal,
        loadMoreSlimPages,
        pages,
        totalPageCount,
        canLoadMoreSlimPages,
        aggregated,
        uxBrokenLinksPreview,
        pagesByUrl,
        pagesById,
        pagesByNormUrl,
        norm,
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
                    pages={pages}
                    slimPagesLoading={slimPagesLoading}
                    totalPageCount={totalPageCount}
                    canLoadMoreSlimPages={canLoadMoreSlimPages}
                    slimPagesRemoteTotal={slimPagesRemoteTotal}
                    loadMoreSlimPages={loadMoreSlimPages}
                    domainId={domainId}
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

            {activeSection === 'ux-cx' && (
                <DomainResultUxCxSection
                    t={t}
                    result={result}
                    summarizing={summarizing}
                    setSummarizing={setSummarizing}
                    summarizeError={summarizeError}
                    setSummarizeError={setSummarizeError}
                    setResult={setResult}
                />
            )}

            {activeSection === 'visual-analysis' && (
                <DomainResultVisualAnalysisSection
                    t={t}
                    domainId={domainId}
                    ux={aggregated?.ux ?? null}
                    pagesByUrl={pagesByUrl}
                />
            )}

            {activeSection === 'ux-audit' &&
                (aggregated?.ux ? (
                    <DomainResultUxAuditSection
                        t={t}
                        ux={aggregated.ux}
                        pagesByUrl={pagesByUrl}
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
                        pagesByUrl={pagesByUrl}
                        pagesByNormUrl={pagesByNormUrl}
                        norm={norm}
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
                        aggregated={aggregated}
                        pagesByUrl={pagesByUrl}
                        pagesByNormUrl={pagesByNormUrl}
                        norm={norm}
                        seoPagesHydrating={seoPagesHydrating}
                    />
                ) : (
                    <DomainResultLinksSeoEmpty t={t} />
                ))}

            {activeSection === 'infra' && (
                <DomainResultInfraTab t={t} domainHost={result.domain} infra={aggregated?.infra} pagesByUrl={pagesByUrl} />
            )}

            {activeSection === 'generative' &&
                (aggregated?.generative ? (
                    <DomainResultGenerativeSection t={t} generative={aggregated.generative} pagesByUrl={pagesByUrl} />
                ) : (
                    <DomainResultGenerativeEmpty t={t} />
                ))}

            {activeSection === 'page-topics' && (
                <DomainResultPageTopicsSection t={t} pageClassification={aggregated?.pageClassification} />
            )}

            {activeSection === 'journey' && (
                <DomainResultJourneySection
                    t={t}
                    domainId={domainId}
                    pages={pages}
                    pagesByNormUrl={pagesByNormUrl}
                    journeyGoal={journeyGoal}
                    setJourneyGoal={setJourneyGoal}
                    journeyLoading={journeyLoading}
                    setJourneyLoading={setJourneyLoading}
                    journeyResult={journeyResult}
                    setJourneyResult={setJourneyResult}
                    journeyError={journeyError}
                    setJourneyError={setJourneyError}
                    journeySaving={journeySaving}
                    setJourneySaving={setJourneySaving}
                    journeySaved={journeySaved}
                    setJourneySaved={setJourneySaved}
                    journeySaveName={journeySaveName}
                    setJourneySaveName={setJourneySaveName}
                />
            )}
        </>
    );
}
