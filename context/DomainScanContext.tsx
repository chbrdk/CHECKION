'use client';

import React, {
    createContext,
    startTransition,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { JourneyResult } from '@/lib/types';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import {
    apiScanDomainSummary,
    apiScanDomainSlimPages,
    apiJourneys,
    pathResults,
    DOMAIN_SLIM_PAGES_CHUNK,
    DOMAIN_SLIM_PAGES_MAX_CLIENT,
    DOMAIN_UX_BROKEN_LINKS_PREVIEW,
} from '@/lib/constants';
import {
    getDomainSectionFromPathname,
    pathDomainSection,
    type DomainResultSectionSlug,
} from '@/lib/domain-result-sections';

export type DomainScanContextValue = {
    domainId: string;
    activeSection: DomainResultSectionSlug;
    result: DomainSummaryApiResponse | null;
    setResult: React.Dispatch<React.SetStateAction<DomainSummaryApiResponse | null>>;
    loadError: string | null;
    projectId: string | null;
    setProjectId: React.Dispatch<React.SetStateAction<string | null>>;
    /** When `/domain/[id]?projectId=` is present: project context from URL (not necessarily equal to stored `projectId` until API sync). */
    fromProjectId: string | null;
    /** Merge into `pathDomainSection` third argument to keep `?projectId=` on tab links. */
    domainLinkQuery: Record<string, string>;
    seoPagesHydrating: boolean;
    summarizing: boolean;
    setSummarizing: React.Dispatch<React.SetStateAction<boolean>>;
    summarizeError: string | null;
    setSummarizeError: React.Dispatch<React.SetStateAction<string | null>>;
    journeyGoal: string;
    setJourneyGoal: React.Dispatch<React.SetStateAction<string>>;
    journeyLoading: boolean;
    setJourneyLoading: React.Dispatch<React.SetStateAction<boolean>>;
    journeyResult: JourneyResult | null;
    setJourneyResult: React.Dispatch<React.SetStateAction<JourneyResult | null>>;
    journeyError: string | null;
    setJourneyError: React.Dispatch<React.SetStateAction<string | null>>;
    journeySaving: boolean;
    setJourneySaving: React.Dispatch<React.SetStateAction<boolean>>;
    journeySaved: boolean;
    setJourneySaved: React.Dispatch<React.SetStateAction<boolean>>;
    journeySaveName: string;
    setJourneySaveName: React.Dispatch<React.SetStateAction<string>>;
    slimPagesOverride: SlimPage[] | null;
    setSlimPagesOverride: React.Dispatch<React.SetStateAction<SlimPage[] | null>>;
    slimPagesLoading: boolean;
    setSlimPagesLoading: React.Dispatch<React.SetStateAction<boolean>>;
    slimPagesRemoteTotal: number | null;
    setSlimPagesRemoteTotal: React.Dispatch<React.SetStateAction<number | null>>;
    pages: SlimPage[];
    totalPageCount: number;
    canLoadMoreSlimPages: boolean;
    loadMoreSlimPages: () => Promise<void>;
    aggregated: DomainSummaryApiResponse['aggregated'] | null;
    uxBrokenLinksPreview: NonNullable<NonNullable<NonNullable<DomainSummaryApiResponse['aggregated']>['ux']>['brokenLinks']>;
    pagesByUrl: Map<string, SlimPage>;
    pagesById: Map<string, SlimPage>;
    pagesByNormUrl: Map<string, SlimPage>;
    norm: (u: string) => string;
    handleIssuePageClick: (url: string, scanId?: string | null) => void;
    selectedGroupKey: string | null;
    selectedPageId: string | null;
    issuesType: string | null;
    issuesWcag: string | null;
    issuesQ: string | null;
    selectGroup: (groupKey: string) => void;
    selectPage: (pageId: string) => void;
    clearIssuesPageSelection: () => void;
    clearIssuesGroupSelection: () => void;
    setIssuesFilters: (next: { type?: string | null; wcag?: string | null; q?: string | null }) => void;
};

const DomainScanContext = createContext<DomainScanContextValue | null>(null);

export function useDomainScan(): DomainScanContextValue {
    const ctx = useContext(DomainScanContext);
    if (!ctx) throw new Error('useDomainScan must be used within DomainScanProvider');
    return ctx;
}

export function DomainScanProvider({
    domainId,
    children,
}: {
    domainId: string;
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useI18n();

    const activeSection = useMemo(
        () => getDomainSectionFromPathname(pathname, domainId),
        [pathname, domainId]
    );

    const [result, setResult] = useState<DomainSummaryApiResponse | null>(null);
    const [seoPagesHydrating, setSeoPagesHydrating] = useState(false);
    const fullSeoHydratedRef = useRef(false);
    const seoFullFetchInFlightRef = useRef(false);
    const [projectId, setProjectId] = useState<string | null>(null);
    const fromProjectId = searchParams.get('projectId');
    const domainLinkQuery = useMemo(
        () => (fromProjectId ? { projectId: fromProjectId } : ({} as Record<string, string>)),
        [fromProjectId]
    );
    const [loadError, setLoadError] = useState<string | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);
    const [journeyGoal, setJourneyGoal] = useState('');
    const [journeyLoading, setJourneyLoading] = useState(false);
    const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);
    const [journeyError, setJourneyError] = useState<string | null>(null);
    const [journeySaving, setJourneySaving] = useState(false);
    const [journeySaved, setJourneySaved] = useState(false);
    const [journeySaveName, setJourneySaveName] = useState('');
    const [slimPagesOverride, setSlimPagesOverride] = useState<SlimPage[] | null>(null);
    const [slimPagesLoading, setSlimPagesLoading] = useState(false);
    const [slimPagesRemoteTotal, setSlimPagesRemoteTotal] = useState<number | null>(null);
    const slimPagesInitialChunkDoneRef = useRef(false);

    const pages = useMemo(() => {
        const fromResult = result?.pages as SlimPage[] | undefined;
        if (fromResult && fromResult.length > 0) return fromResult;
        if (slimPagesOverride !== null) return slimPagesOverride;
        return [];
    }, [result?.pages, slimPagesOverride]);

    const totalPageCount = result?.totalPageCount ?? pages.length;

    const canLoadMoreSlimPages = useMemo(() => {
        if (result?.summaryMeta?.slimPagesOmitted !== true) return false;
        if (slimPagesOverride === null) return false;
        const len = pages.length;
        if (len === 0) return false;
        if (len >= DOMAIN_SLIM_PAGES_MAX_CLIENT) return false;
        if (slimPagesRemoteTotal !== null && len >= slimPagesRemoteTotal) return false;
        return true;
    }, [result?.summaryMeta?.slimPagesOmitted, slimPagesOverride, pages.length, slimPagesRemoteTotal]);

    const aggregated = result?.aggregated ?? null;

    const uxBrokenLinksPreview = useMemo(
        () => (aggregated?.ux?.brokenLinks ?? []).slice(0, DOMAIN_UX_BROKEN_LINKS_PREVIEW),
        [aggregated?.ux?.brokenLinks]
    );

    const pagesByUrl = useMemo(() => new Map(pages.map((p) => [p.url, p])), [pages]);
    const pagesById = useMemo(() => {
        const m = new Map<string, SlimPage>();
        for (const p of pages) {
            m.set(p.id, p);
            if (p.domainPageId) m.set(p.domainPageId, p);
        }
        return m;
    }, [pages]);

    const norm = useCallback((u: string) => {
        try {
            const x = new URL(u);
            return x.origin + (x.pathname.replace(/\/$/, '') || '/');
        } catch {
            return u;
        }
    }, []);

    const pagesByNormUrl = useMemo(() => {
        const m = new Map<string, SlimPage>();
        for (const p of pages) m.set(norm(p.url), p);
        return m;
    }, [pages, norm]);

    const handleIssuePageClick = useCallback(
        (url: string, scanId?: string | null) => {
            if (scanId) {
                router.push(pathResults(scanId));
                return;
            }
            const page = pagesByUrl.get(url);
            if (page) router.push(pathResults(page.id));
        },
        [pagesByUrl, router]
    );

    const selectedGroupKey = searchParams.get('group');
    const selectedPageId = searchParams.get('page');
    const issuesType = searchParams.get('itype');
    const issuesWcag = searchParams.get('wcag');
    const issuesQ = searchParams.get('q');

    const selectGroup = useCallback(
        (groupKey: string) => {
            const sp = new URLSearchParams(Array.from(searchParams.entries()));
            sp.set('group', groupKey);
            sp.delete('page');
            const q = sp.toString();
            const base = pathDomainSection(domainId, 'list-details');
            router.replace(q ? `${base}?${q}` : base);
        },
        [router, searchParams, domainId]
    );

    const selectPage = useCallback(
        (pageId: string) => {
            const sp = new URLSearchParams(Array.from(searchParams.entries()));
            sp.set('page', pageId);
            const q = sp.toString();
            const base = pathDomainSection(domainId, 'list-details');
            router.replace(q ? `${base}?${q}` : base);
        },
        [router, searchParams, domainId]
    );

    const clearIssuesPageSelection = useCallback(() => {
        const sp = new URLSearchParams(Array.from(searchParams.entries()));
        sp.delete('page');
        const q = sp.toString();
        const base = pathDomainSection(domainId, 'list-details');
        router.replace(q ? `${base}?${q}` : base);
    }, [router, searchParams, domainId]);

    const clearIssuesGroupSelection = useCallback(() => {
        const sp = new URLSearchParams(Array.from(searchParams.entries()));
        sp.delete('group');
        sp.delete('page');
        const q = sp.toString();
        const base = pathDomainSection(domainId, 'list-details');
        router.replace(q ? `${base}?${q}` : base);
    }, [router, searchParams, domainId]);

    const setIssuesFilters = useCallback(
        (next: { type?: string | null; wcag?: string | null; q?: string | null }) => {
            const sp = new URLSearchParams(Array.from(searchParams.entries()));
            if (next.type === null) sp.delete('itype');
            else if (typeof next.type === 'string') sp.set('itype', next.type);
            if (next.wcag === null) sp.delete('wcag');
            else if (typeof next.wcag === 'string') sp.set('wcag', next.wcag);
            if (next.q === null) sp.delete('q');
            else if (typeof next.q === 'string') sp.set('q', next.q);
            sp.delete('group');
            sp.delete('page');
            const q = sp.toString();
            const base = pathDomainSection(domainId, 'list-details');
            router.replace(q ? `${base}?${q}` : base);
        },
        [router, searchParams, domainId]
    );

    useEffect(() => {
        setLoadError(null);
        setSlimPagesOverride(null);
        setSlimPagesRemoteTotal(null);
        slimPagesInitialChunkDoneRef.current = false;
        fullSeoHydratedRef.current = false;
        seoFullFetchInFlightRef.current = false;
        fetch(apiScanDomainSummary(domainId, { light: true }))
            .then((res) => {
                if (!res.ok) {
                    setLoadError('not_found');
                    return null;
                }
                return res.json();
            })
            .then((data: DomainSummaryApiResponse & { projectId?: string | null }) => {
                if (data) {
                    setResult(data);
                    setProjectId(data.projectId ?? null);
                }
            })
            .catch(() => setLoadError('not_found'));
    }, [domainId]);

    useEffect(() => {
        const pr = result?.pages as SlimPage[] | undefined;
        if (pr && pr.length > 0) setSlimPagesOverride(null);
    }, [result?.pages]);

    useEffect(() => {
        if (activeSection !== 'overview' || result?.summaryMeta?.slimPagesOmitted !== true) return;
        const fromResult = result?.pages as SlimPage[] | undefined;
        if (fromResult && fromResult.length > 0) return;
        if (slimPagesInitialChunkDoneRef.current) return;

        let cancelled = false;
        setSlimPagesLoading(true);
        fetch(apiScanDomainSlimPages(domainId, { offset: 0, limit: DOMAIN_SLIM_PAGES_CHUNK }))
            .then(async (res) => {
                if (!res.ok) throw new Error('slim-pages failed');
                return res.json() as Promise<{ data?: SlimPage[]; total?: number }>;
            })
            .then((json) => {
                if (cancelled) return;
                const batch = json.data ?? [];
                slimPagesInitialChunkDoneRef.current = true;
                setSlimPagesOverride(batch);
                setSlimPagesRemoteTotal(json.total ?? batch.length);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setSlimPagesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [domainId, activeSection, result?.summaryMeta?.slimPagesOmitted, result?.pages]);

    const loadMoreSlimPages = useCallback(async () => {
        if (slimPagesOverride === null) return;
        const len = slimPagesOverride.length;
        if (len >= DOMAIN_SLIM_PAGES_MAX_CLIENT) return;
        if (slimPagesRemoteTotal !== null && len >= slimPagesRemoteTotal) return;
        setSlimPagesLoading(true);
        try {
            const res = await fetch(apiScanDomainSlimPages(domainId, { offset: len, limit: DOMAIN_SLIM_PAGES_CHUNK }));
            if (!res.ok) return;
            const json = (await res.json()) as { data?: SlimPage[]; total?: number };
            const batch = json.data ?? [];
            if (json.total != null) setSlimPagesRemoteTotal(json.total);
            setSlimPagesOverride((prev) => [...(prev ?? []), ...batch]);
        } finally {
            setSlimPagesLoading(false);
        }
    }, [domainId, slimPagesOverride, slimPagesRemoteTotal]);

    useEffect(() => {
        if (activeSection !== 'links-seo') return;
        if (result?.summaryMeta?.seoPageRowsOmitted !== true) return;
        if (fullSeoHydratedRef.current || seoFullFetchInFlightRef.current) return;
        seoFullFetchInFlightRef.current = true;
        setSeoPagesHydrating(true);
        fetch(apiScanDomainSummary(domainId, { seoFull: true }))
            .then((res) => {
                if (!res.ok) throw new Error('fetch failed');
                return res.json();
            })
            .then((data: { aggregated?: DomainSummaryApiResponse['aggregated']; summaryMeta?: DomainSummaryApiResponse['summaryMeta']; projectId?: string | null }) => {
                fullSeoHydratedRef.current = true;
                const seo = data.aggregated?.seo;
                setResult((prev) => {
                    if (!prev || !seo) return prev;
                    return {
                        ...prev,
                        aggregated: prev.aggregated ? { ...prev.aggregated, seo } : prev.aggregated,
                        summaryMeta: {
                            ...prev.summaryMeta,
                            ...data.summaryMeta,
                            seoPageRowsOmitted: false,
                        },
                    };
                });
                if (data.projectId != null) setProjectId(data.projectId);
            })
            .catch(() => {
                fullSeoHydratedRef.current = false;
            })
            .finally(() => {
                seoFullFetchInFlightRef.current = false;
                setSeoPagesHydrating(false);
            });
    }, [domainId, activeSection, result?.summaryMeta?.seoPageRowsOmitted]);

    const restoreJourneyId = searchParams.get('restoreJourney');
    useEffect(() => {
        if (!restoreJourneyId) return;
        fetch(apiJourneys(restoreJourneyId))
            .then((res) => {
                if (!res.ok) throw new Error(t('domainResult.journeyNotFound'));
                return res.json();
            })
            .then((row: { goal: string; result: JourneyResult }) => {
                setJourneyGoal(row.goal);
                setJourneyResult(row.result);
                router.replace(
                    pathDomainSection(domainId, 'journey', {
                        ...domainLinkQuery,
                        restoreJourney: restoreJourneyId,
                    })
                );
            })
            .catch(() => {});
    }, [restoreJourneyId, domainId, t, router, domainLinkQuery]);

    const hasIssuesDeepLink = Boolean(
        searchParams.get('group') ||
            searchParams.get('page') ||
            searchParams.get('itype') ||
            searchParams.get('wcag') ||
            searchParams.get('q')
    );

    useEffect(() => {
        if (restoreJourneyId) return;
        if (!hasIssuesDeepLink) return;
        startTransition(() => {
            const sp = new URLSearchParams(searchParams.toString());
            const q = sp.toString();
            const base = pathDomainSection(domainId, 'list-details');
            router.replace(q ? `${base}?${q}` : base);
        });
    }, [restoreJourneyId, hasIssuesDeepLink, domainId, router, searchParams]);

    const value = useMemo<DomainScanContextValue>(
        () => ({
            domainId,
            activeSection,
            result,
            setResult,
            loadError,
            projectId,
            setProjectId,
            fromProjectId,
            domainLinkQuery,
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
            slimPagesOverride,
            setSlimPagesOverride,
            slimPagesLoading,
            setSlimPagesLoading,
            slimPagesRemoteTotal,
            setSlimPagesRemoteTotal,
            pages,
            totalPageCount,
            canLoadMoreSlimPages,
            loadMoreSlimPages,
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
        }),
        [
            domainId,
            activeSection,
            result,
            loadError,
            projectId,
            fromProjectId,
            domainLinkQuery,
            seoPagesHydrating,
            summarizing,
            summarizeError,
            journeyGoal,
            journeyLoading,
            journeyResult,
            journeyError,
            journeySaving,
            journeySaved,
            journeySaveName,
            slimPagesOverride,
            slimPagesLoading,
            slimPagesRemoteTotal,
            pages,
            totalPageCount,
            canLoadMoreSlimPages,
            loadMoreSlimPages,
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
        ]
    );

    return <DomainScanContext.Provider value={value}>{children}</DomainScanContext.Provider>;
}
