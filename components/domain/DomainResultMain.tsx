'use client';

import React, { memo, useCallback, useDeferredValue, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';
import type { SlimPage } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useDomainScanChrome, useDomainScanCore } from '@/context/DomainScanContext';
import { pathResults } from '@/lib/constants';
import { useI18n } from '@/components/i18n/I18nProvider';

function TabChunkFallback() {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} sx={{ color: 'var(--color-theme-accent)' }} />
        </Box>
    );
}

function scheduleIdleTask(fn: () => void, timeout: number): number {
    const w = typeof window !== 'undefined' ? window : undefined;
    if (!w) return 0;
    const ric = w.requestIdleCallback;
    if (typeof ric === 'function') {
        return ric.call(w, fn, { timeout });
    }
    return w.setTimeout(fn, Math.min(timeout, 600));
}

function cancelIdleTask(id: number): void {
    if (!id) return;
    const w = typeof window !== 'undefined' ? window : undefined;
    if (!w) return;
    const cic = w.cancelIdleCallback;
    if (typeof cic === 'function') {
        cic.call(w, id);
    } else {
        clearTimeout(id);
    }
}

/**
 * Warm tab code-split chunks after bundle load (idle). First open of Links & SEO / UX Audit
 * then spends less time in script parse on the critical path (Chrome Performance: FunctionCall on `links-seo`).
 */
function DomainTabChunksIdlePrefetch() {
    const { bundlePending, domainId } = useDomainScanChrome();

    useEffect(() => {
        if (bundlePending || !domainId?.trim()) return;
        const id1 = scheduleIdleTask(() => {
            void import('./DomainResultLinksSeoSection');
        }, 2000);
        const id2 = scheduleIdleTask(() => {
            void import('./DomainResultUxAuditSection');
            void import('./DomainResultStructureSection');
            void import('./DomainResultListDetailsSection');
        }, 4500);
        const id3 = scheduleIdleTask(() => {
            void import('./DomainResultGenerativeSection');
            void import('./DomainResultPageTopicsSection');
            void import('./DomainResultInfraSection');
            void import('./DomainResultVisualMapSection');
            void import('./DomainResultOverviewSection');
        }, 7000);
        return () => {
            cancelIdleTask(id1);
            cancelIdleTask(id2);
            cancelIdleTask(id3);
        };
    }, [bundlePending, domainId]);

    return null;
}

const DomainResultOverviewSection = dynamic(
    () => import('./DomainResultOverviewSection').then((m) => ({ default: m.DomainResultOverviewSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultListDetailsSection = dynamic(
    () => import('./DomainResultListDetailsSection').then((m) => ({ default: m.DomainResultListDetailsSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultUxAuditSection = dynamic(
    () => import('./DomainResultUxAuditSection').then((m) => ({ default: m.DomainResultUxAuditSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultUxAuditEmpty = dynamic(
    () => import('./DomainResultUxAuditSection').then((m) => ({ default: m.DomainResultUxAuditEmpty })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultStructureSection = dynamic(
    () => import('./DomainResultStructureSection').then((m) => ({ default: m.DomainResultStructureSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultStructureEmpty = dynamic(
    () => import('./DomainResultStructureSection').then((m) => ({ default: m.DomainResultStructureEmpty })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultLinksSeoSection = dynamic(
    () => import('./DomainResultLinksSeoSection').then((m) => ({ default: m.DomainResultLinksSeoSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultLinksSeoEmpty = dynamic(
    () => import('./DomainResultLinksSeoSection').then((m) => ({ default: m.DomainResultLinksSeoEmpty })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultInfraTab = dynamic(
    () => import('./DomainResultInfraSection').then((m) => ({ default: m.DomainResultInfraTab })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultGenerativeSection = dynamic(
    () => import('./DomainResultGenerativeSection').then((m) => ({ default: m.DomainResultGenerativeSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultGenerativeEmpty = dynamic(
    () => import('./DomainResultGenerativeSection').then((m) => ({ default: m.DomainResultGenerativeEmpty })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultPageTopicsSection = dynamic(
    () => import('./DomainResultPageTopicsSection').then((m) => ({ default: m.DomainResultPageTopicsSection })),
    { loading: TabChunkFallback, ssr: false }
);

const DomainResultVisualMapSection = dynamic(
    () => import('./DomainResultVisualMapSection').then((m) => ({ default: m.DomainResultVisualMapSection })),
    { loading: TabChunkFallback, ssr: false }
);

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
    const deferredUx = useDeferredValue(ux);
    if (ux == null) {
        return <DomainResultUxAuditEmpty t={t} />;
    }
    /** After null check, `deferredUx ?? ux` is always `AggregatedUx` (deferred may lag one frame). */
    const uxForTable = deferredUx ?? ux;
    return <DomainResultUxAuditSection t={t} ux={uxForTable} onOpenPageUrl={openPageScanUrl} />;
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
            <DomainTabChunksIdlePrefetch />
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
