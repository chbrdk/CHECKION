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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { JourneyResult } from '@/lib/types';
import type { DomainSummaryApiResponse } from '@/lib/domain-summary';
import type { SlimPage } from '@/lib/types';
import {
    apiScanDomainBundle,
    apiScanDomainPageResolve,
    apiJourneys,
    pathResults,
    DOMAIN_UX_BROKEN_LINKS_PREVIEW,
} from '@/lib/constants';
import {
    getDomainSectionFromPathname,
    pathDomainSection,
    type DomainResultSectionSlug,
} from '@/lib/domain-result-sections';

const BUNDLE_QUERY_KEY = (domainId: string) => ['domain-scan-bundle', domainId] as const;

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
    /** From bundle: total rows for slim-pages pagination (DB or payload). */
    totalSlimRows: number | null;
    /** Legacy: embedded pages when present (bundle uses light payload → usually empty). */
    pages: SlimPage[];
    totalPageCount: number;
    aggregated: DomainSummaryApiResponse['aggregated'] | null;
    uxBrokenLinksPreview: NonNullable<NonNullable<NonNullable<DomainSummaryApiResponse['aggregated']>['ux']>['brokenLinks']>;
    /** Fast lookup when embedded slim rows exist; often empty — use `openPageScanUrl`. */
    pagesByUrl: Map<string, SlimPage>;
    pagesById: Map<string, SlimPage>;
    pagesByNormUrl: Map<string, SlimPage>;
    norm: (u: string) => string;
    /** Navigate to single-page scan for a URL (uses cached slim map when possible, else GET page-resolve). */
    openPageScanUrl: (url: string) => void;
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
    const queryClient = useQueryClient();

    const activeSection = useMemo(
        () => getDomainSectionFromPathname(pathname, domainId),
        [pathname, domainId]
    );

    const bundleQuery = useQuery({
        queryKey: BUNDLE_QUERY_KEY(domainId),
        queryFn: async () => {
            const res = await fetch(apiScanDomainBundle(domainId), { credentials: 'same-origin' });
            if (!res.ok) throw new Error('not_found');
            return (await res.json()) as DomainSummaryApiResponse & {
                projectId?: string | null;
                totalSlimRows?: number;
            };
        },
        enabled: Boolean(domainId?.trim()),
    });

    const result = bundleQuery.data ?? null;
    const loadError = bundleQuery.isError ? 'not_found' : null;

    const setResult = useCallback<React.Dispatch<React.SetStateAction<DomainSummaryApiResponse | null>>>(
        (action) => {
            queryClient.setQueryData(BUNDLE_QUERY_KEY(domainId), (prev: DomainSummaryApiResponse | undefined) => {
                const base = prev ?? null;
                const next =
                    typeof action === 'function'
                        ? (action as (p: DomainSummaryApiResponse | null) => DomainSummaryApiResponse | null)(base)
                        : action;
                if (next === null) return prev;
                return next ?? prev;
            });
        },
        [queryClient, domainId]
    );

    const [projectId, setProjectId] = useState<string | null>(null);
    const fromProjectId = searchParams.get('projectId');
    const domainLinkQuery = useMemo(
        () => (fromProjectId ? { projectId: fromProjectId } : ({} as Record<string, string>)),
        [fromProjectId]
    );

    useEffect(() => {
        if (result?.projectId != null) setProjectId(result.projectId);
    }, [result?.projectId]);

    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);
    const [journeyGoal, setJourneyGoal] = useState('');
    const [journeyLoading, setJourneyLoading] = useState(false);
    const [journeyResult, setJourneyResult] = useState<JourneyResult | null>(null);
    const [journeyError, setJourneyError] = useState<string | null>(null);
    const [journeySaving, setJourneySaving] = useState(false);
    const [journeySaved, setJourneySaved] = useState(false);
    const [journeySaveName, setJourneySaveName] = useState('');

    const totalSlimRows = result?.totalSlimRows ?? null;

    const pages = useMemo(() => {
        const fromResult = result?.pages as SlimPage[] | undefined;
        return fromResult && fromResult.length > 0 ? fromResult : [];
    }, [result?.pages]);

    const totalPageCount = result?.totalPageCount ?? result?.totalPages ?? pages.length;

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

    const resolveCacheRef = useRef<Map<string, string>>(new Map());

    const openPageScanUrl = useCallback(
        (url: string) => {
            const direct = pagesByUrl.get(url) ?? pagesByNormUrl.get(norm(url));
            if (direct) {
                router.push(pathResults(direct.id));
                return;
            }
            const cached = resolveCacheRef.current.get(url);
            if (cached) {
                router.push(pathResults(cached));
                return;
            }
            void (async () => {
                const res = await fetch(apiScanDomainPageResolve(domainId, url), { credentials: 'same-origin' });
                if (!res.ok) return;
                const data = (await res.json()) as { scanId?: string };
                if (data.scanId) {
                    resolveCacheRef.current.set(url, data.scanId);
                    router.push(pathResults(data.scanId));
                }
            })();
        },
        [domainId, norm, pagesByNormUrl, pagesByUrl, router]
    );

    const handleIssuePageClick = useCallback(
        (url: string, scanId?: string | null) => {
            if (scanId) {
                router.push(pathResults(scanId));
                return;
            }
            openPageScanUrl(url);
        },
        [openPageScanUrl, router]
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
            totalSlimRows,
            pages,
            totalPageCount,
            aggregated,
            uxBrokenLinksPreview,
            pagesByUrl,
            pagesById,
            pagesByNormUrl,
            norm,
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
        }),
        [
            domainId,
            activeSection,
            result,
            setResult,
            loadError,
            projectId,
            fromProjectId,
            domainLinkQuery,
            summarizing,
            summarizeError,
            journeyGoal,
            journeyLoading,
            journeyResult,
            journeyError,
            journeySaving,
            journeySaved,
            journeySaveName,
            totalSlimRows,
            pages,
            totalPageCount,
            aggregated,
            uxBrokenLinksPreview,
            pagesByUrl,
            pagesById,
            pagesByNormUrl,
            norm,
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
        ]
    );

    return <DomainScanContext.Provider value={value}>{children}</DomainScanContext.Provider>;
}
