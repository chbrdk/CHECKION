'use client';

import React, { memo, useCallback } from 'react';
import type { SlimPage } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useDomainScanChrome, useDomainScanCore } from '@/context/DomainScanContext';
import { pathResults } from '@/lib/constants';
import { useI18n } from '@/components/i18n/I18nProvider';
import { DomainResultOverviewSection } from '@/components/domain/DomainResultOverviewSection';
import { DomainResultListDetailsSection } from '@/components/domain/DomainResultListDetailsSection';
import { DomainResultUxAuditSection, DomainResultUxAuditEmpty } from '@/components/domain/DomainResultUxAuditSection';
import { DomainResultStructureSection, DomainResultStructureEmpty } from '@/components/domain/DomainResultStructureSection';
import { DomainResultLinksSeoSection, DomainResultLinksSeoEmpty } from '@/components/domain/DomainResultLinksSeoSection';
import { DomainResultInfraTab } from '@/components/domain/DomainResultInfraSection';
import { DomainResultGenerativeSection, DomainResultGenerativeEmpty } from '@/components/domain/DomainResultGenerativeSection';
import { DomainResultPageTopicsSection } from '@/components/domain/DomainResultPageTopicsSection';
import { DomainResultVisualMapSection } from '@/components/domain/DomainResultVisualMapSection';

/** Subscribes to full bundle context — only mount the active tab so heavy updates don’t re-run the orchestrator. */
const DomainTabOverview = memo(function DomainTabOverview() {
    const { t } = useI18n();
    const router = useRouter();
    const { result, domainId, totalPageCount, totalSlimRows, domainLinkQuery } = useDomainScanCore();
    const openScannedPage = useCallback(
        (page: SlimPage) => {
            router.push(pathResults(page.id));
        },
        [router]
    );
    if (!result) return null;
    return (
        <DomainResultOverviewSection
            t={t}
            result={result}
            domainId={domainId}
            totalPageCount={totalPageCount}
            totalSlimRows={totalSlimRows}
            domainLinkQuery={domainLinkQuery}
            onScannedPageOpen={openScannedPage}
        />
    );
});

/** No `aggregated` / bundle subscription — only chrome (domain id). */
const DomainTabVisualMap = memo(function DomainTabVisualMap() {
    const { t } = useI18n();
    const { domainId } = useDomainScanChrome();
    return <DomainResultVisualMapSection t={t} domainId={domainId} />;
});

const DomainTabListDetails = memo(function DomainTabListDetails() {
    const { t } = useI18n();
    const {
        domainId,
        totalPageCount,
        aggregated,
        pagesById,
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
        handleIssuePageClick,
    } = useDomainScanCore();
    const issueStats = aggregated?.issues?.stats ?? null;
    return (
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
    );
});

const DomainTabUxAudit = memo(function DomainTabUxAudit() {
    const { t } = useI18n();
    const { aggregated, openPageScanUrl } = useDomainScanCore();
    const ux = aggregated?.ux;
    if (ux == null) {
        return <DomainResultUxAuditEmpty t={t} />;
    }
    return <DomainResultUxAuditSection t={t} ux={ux} onOpenPageUrl={openPageScanUrl} />;
});

const DomainTabStructure = memo(function DomainTabStructure() {
    const { t } = useI18n();
    const { aggregated, openPageScanUrl } = useDomainScanCore();
    if (aggregated?.structure) {
        return <DomainResultStructureSection t={t} structure={aggregated.structure} onOpenPageUrl={openPageScanUrl} />;
    }
    return <DomainResultStructureEmpty t={t} />;
});

const DomainTabLinksSeo = memo(function DomainTabLinksSeo() {
    const { t, locale } = useI18n();
    const { domainId, aggregated, openPageScanUrl } = useDomainScanCore();
    if (!aggregated) return null;
    if (aggregated.seo || aggregated.links) {
        return (
            <DomainResultLinksSeoSection
                t={t}
                locale={locale}
                domainId={domainId}
                aggregated={aggregated}
                onOpenPageUrl={openPageScanUrl}
            />
        );
    }
    return <DomainResultLinksSeoEmpty t={t} />;
});

const DomainTabInfra = memo(function DomainTabInfra() {
    const { t } = useI18n();
    const { result, aggregated, openPageScanUrl } = useDomainScanCore();
    if (!result) return null;
    return (
        <DomainResultInfraTab
            t={t}
            domainHost={result.domain}
            infra={aggregated?.infra}
            onOpenPageUrl={openPageScanUrl}
        />
    );
});

const DomainTabGenerative = memo(function DomainTabGenerative() {
    const { t, locale } = useI18n();
    const { aggregated, openPageScanUrl } = useDomainScanCore();
    if (aggregated?.generative) {
        return (
            <DomainResultGenerativeSection
                t={t}
                locale={locale}
                generative={aggregated.generative}
                onOpenPageUrl={openPageScanUrl}
            />
        );
    }
    return <DomainResultGenerativeEmpty t={t} />;
});

const DomainTabPageTopics = memo(function DomainTabPageTopics() {
    const { t } = useI18n();
    const { aggregated } = useDomainScanCore();
    return <DomainResultPageTopicsSection t={t} pageClassification={aggregated?.pageClassification} />;
});

/**
 * Router-only: uses chrome (`activeSection`) — does not subscribe to heavy bundle context,
 * so aggregated/slim refetches don’t re-render this component tree root.
 */
export function DomainResultMain() {
    const { activeSection } = useDomainScanChrome();

    return (
        <>
            {activeSection === 'overview' && <DomainTabOverview />}
            {activeSection === 'visual-map' && <DomainTabVisualMap />}
            {activeSection === 'list-details' && <DomainTabListDetails />}
            {activeSection === 'ux-audit' && <DomainTabUxAudit />}
            {activeSection === 'structure' && <DomainTabStructure />}
            {activeSection === 'links-seo' && <DomainTabLinksSeo />}
            {activeSection === 'infra' && <DomainTabInfra />}
            {activeSection === 'generative' && <DomainTabGenerative />}
            {activeSection === 'page-topics' && <DomainTabPageTopics />}
        </>
    );
}
