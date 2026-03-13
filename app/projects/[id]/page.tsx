'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxCard,
    MsqdxFormField,
    MsqdxChip,
    MsqdxAccordion,
    MsqdxAccordionItem,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiProjectResearch,
    apiProjectSuggestCompetitors,
    apiProjectSuggestKeywords,
    apiScansDomainList,
    apiScanJourneyAgentHistory,
    apiScanGeoEeatHistory,
    apiScanList,
    API_RANK_TRACKING_KEYWORDS,
    apiRankTrackingKeywords,
    apiRankTrackingKeyword,
    apiRankTrackingRefresh,
    pathDomain,
    pathJourneyAgent,
    pathGeoEeat,
    pathResults,
    PATH_SCAN,
    PATH_SCAN_DOMAIN,
} from '@/lib/constants';
import { SERP_MAIN_MARKETS } from '@/lib/serp-markets';
import { RankTrackingChart } from '@/components/RankTrackingChart';
import type { ProjectResearchResult } from '@/lib/research/schema';

interface RankKeywordItem {
    id: string;
    domain: string;
    keyword: string;
    country?: string;
    language?: string;
    device?: string;
    lastPosition?: number;
    lastRecordedAt?: string;
    lastCompetitorPositions?: Record<string, number | null>;
}

interface ProjectData {
    id: string;
    name: string;
    domain: string | null;
    competitors?: string[];
    geoQueries?: string[];
    counts: { domainScans: number; journeyRuns: number; geoEeatRuns: number; singleScans: number; rankTrackingKeywords: number };
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [domainScans, setDomainScans] = useState<Array<{ id: string; domain: string; timestamp: string; status: string }>>([]);
    const [journeyRuns, setJourneyRuns] = useState<Array<{ id: string; url: string; task: string; status: string; createdAt: string }>>([]);
    const [geoRuns, setGeoRuns] = useState<Array<{ id: string; url: string; status: string; createdAt: string }>>([]);
    const [singleScans, setSingleScans] = useState<Array<{ id: string; url: string; timestamp: string }>>([]);
    const [rankKeywords, setRankKeywords] = useState<RankKeywordItem[]>([]);
    const [listsLoading, setListsLoading] = useState(false);
    const [addKeywordOpen, setAddKeywordOpen] = useState(false);
    const [addKeywordDomain, setAddKeywordDomain] = useState('');
    const [addKeywordKeyword, setAddKeywordKeyword] = useState('');
    const [addKeywordMarket, setAddKeywordMarket] = useState<string>(''); // value: "country-language" e.g. "de-de"
    const [addKeywordDevice, setAddKeywordDevice] = useState('');
    const [addKeywordSubmitting, setAddKeywordSubmitting] = useState(false);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [addCompetitorValue, setAddCompetitorValue] = useState('');
    const [suggestCompetitorsLoading, setSuggestCompetitorsLoading] = useState(false);
    const [suggestCompetitorsError, setSuggestCompetitorsError] = useState<string | null>(null);
    const [addGeoQueryValue, setAddGeoQueryValue] = useState('');
    const [suggestGeoQueriesLoading, setSuggestGeoQueriesLoading] = useState(false);
    const [suggestGeoQueriesError, setSuggestGeoQueriesError] = useState<string | null>(null);
    const [suggestKeywordsLoading, setSuggestKeywordsLoading] = useState(false);
    const [suggestKeywordsError, setSuggestKeywordsError] = useState<string | null>(null);
    const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
    const [selectedSuggestedKeywords, setSelectedSuggestedKeywords] = useState<Set<string>>(new Set());
    const [chartExpandedKeywordId, setChartExpandedKeywordId] = useState<string | null>(null);
    const [researchResult, setResearchResult] = useState<ProjectResearchResult | null>(null);
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchError, setResearchError] = useState<string | null>(null);
    const [selectedResearchKeywords, setSelectedResearchKeywords] = useState<Set<string>>(new Set());
    const [researchAddTargetGroup, setResearchAddTargetGroup] = useState('');
    const [researchAddKeyword, setResearchAddKeyword] = useState('');
    const [researchAddGeoQuery, setResearchAddGeoQuery] = useState('');
    const [researchAddCompetitor, setResearchAddCompetitor] = useState('');

    const loadProject = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await fetch(apiProject(id), { credentials: 'same-origin' });
            const data = await res.json();
            if (data?.data) setProject(data.data);
            else setProject(null);
        } catch {
            setProject(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const competitors = Array.isArray(project?.competitors) ? project.competitors : [];

    const normalizeDomainInput = useCallback((value: string) => {
        let v = value.trim().toLowerCase();
        v = v.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0] ?? '';
        return v;
    }, []);

    const handleAddCompetitor = useCallback(async () => {
        const domain = normalizeDomainInput(addCompetitorValue);
        if (!id || !domain) return;
        const next = [...competitors];
        if (next.includes(domain)) return;
        next.push(domain);
        setAddCompetitorValue('');
        try {
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ competitors: next }),
            });
            if (res.ok) loadProject();
        } catch {
            // ignore
        }
    }, [id, addCompetitorValue, competitors, normalizeDomainInput, loadProject]);

    const handleRemoveCompetitor = useCallback(
        async (domain: string) => {
            if (!id) return;
            const next = competitors.filter((c) => c !== domain);
            try {
                const res = await fetch(apiProject(id), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ competitors: next }),
                });
                if (res.ok) loadProject();
            } catch {
                // ignore
            }
        },
        [id, competitors, loadProject]
    );

    const handleSuggestCompetitors = useCallback(async () => {
        if (!id) return;
        setSuggestCompetitorsError(null);
        setSuggestCompetitorsLoading(true);
        try {
            const res = await fetch(apiProjectSuggestCompetitors(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && Array.isArray(data.competitors)) {
                const existing = new Set(competitors.map((c) => c.toLowerCase()));
                const toAdd = data.competitors
                    .map((c: string) => normalizeDomainInput(c))
                    .filter((c: string) => c && !existing.has(c));
                if (toAdd.length > 0) {
                    const next = [...competitors, ...toAdd];
                    const patchRes = await fetch(apiProject(id), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ competitors: next }),
                    });
                    if (patchRes.ok) loadProject();
                }
            } else if (!res.ok && typeof data?.error === 'string') {
                setSuggestCompetitorsError(data.error);
            } else if (!res.ok) {
                setSuggestCompetitorsError(t('common.error'));
            }
        } catch {
            setSuggestCompetitorsError(t('common.error'));
        } finally {
            setSuggestCompetitorsLoading(false);
        }
    }, [id, competitors, normalizeDomainInput, loadProject, t]);

    const geoQueries = Array.isArray(project?.geoQueries) ? project.geoQueries : [];

    const handleAddGeoQuery = useCallback(async () => {
        const q = addGeoQueryValue.trim();
        if (!id || !q) return;
        const next = [...geoQueries];
        if (next.includes(q)) return;
        next.push(q);
        setAddGeoQueryValue('');
        try {
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ geoQueries: next }),
            });
            if (res.ok) loadProject();
        } catch {
            // ignore
        }
    }, [id, addGeoQueryValue, geoQueries, loadProject]);

    const handleRemoveGeoQuery = useCallback(
        async (query: string) => {
            if (!id) return;
            const next = geoQueries.filter((x) => x !== query);
            try {
                const res = await fetch(apiProject(id), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ geoQueries: next }),
                });
                if (res.ok) loadProject();
            } catch {
                // ignore
            }
        },
        [id, geoQueries, loadProject]
    );

    const handleSuggestGeoQueries = useCallback(async () => {
        if (!id) return;
        setSuggestGeoQueriesError(null);
        setSuggestGeoQueriesLoading(true);
        try {
            const res = await fetch(apiProjectSuggestCompetitors(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && Array.isArray(data.queries)) {
                const existing = new Set(geoQueries.map((q) => q.toLowerCase()));
                const toAdd = data.queries
                    .filter((q: string) => typeof q === 'string' && q.trim() && !existing.has(q.trim().toLowerCase()))
                    .map((q: string) => q.trim())
                    .slice(0, 15);
                if (toAdd.length > 0) {
                    const next = [...geoQueries, ...toAdd];
                    const patchRes = await fetch(apiProject(id), {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ geoQueries: next }),
                    });
                    if (patchRes.ok) loadProject();
                }
            } else if (!res.ok && typeof data?.error === 'string') {
                setSuggestGeoQueriesError(data.error);
            } else if (!res.ok) {
                setSuggestGeoQueriesError(t('common.error'));
            }
        } catch {
            setSuggestGeoQueriesError(t('common.error'));
        } finally {
            setSuggestGeoQueriesLoading(false);
        }
    }, [id, geoQueries, loadProject, t]);

    const handleSuggestKeywords = useCallback(async () => {
        if (!id) return;
        setSuggestKeywordsError(null);
        setSuggestedKeywords([]);
        setSelectedSuggestedKeywords(new Set());
        setSuggestKeywordsLoading(true);
        try {
            const res = await fetch(apiProjectSuggestKeywords(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && Array.isArray(data.keywords)) {
                setSuggestedKeywords(data.keywords);
            } else if (!res.ok && typeof data?.error === 'string') {
                setSuggestKeywordsError(data.error);
            } else if (!res.ok) {
                setSuggestKeywordsError(t('common.error'));
            }
        } catch {
            setSuggestKeywordsError(t('common.error'));
        } finally {
            setSuggestKeywordsLoading(false);
        }
    }, [id, t]);

    const handleToggleSuggestedKeyword = useCallback((kw: string) => {
        setSelectedSuggestedKeywords((prev) => {
            const next = new Set(prev);
            if (next.has(kw)) next.delete(kw);
            else next.add(kw);
            return next;
        });
    }, []);

    const handleAddSelectedKeywords = useCallback(async () => {
        if (!id || !project?.domain || selectedSuggestedKeywords.size === 0) return;
        const market = SERP_MAIN_MARKETS[0];
        const [country, language] = market ? [market.country, market.language] : ['de', 'de'];
        const domain = project.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? project.domain;
        for (const keyword of selectedSuggestedKeywords) {
            try {
                await fetch(API_RANK_TRACKING_KEYWORDS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        projectId: id,
                        domain,
                        keyword: keyword.trim(),
                        country,
                        language,
                    }),
                });
            } catch {
                // continue
            }
        }
        setSuggestedKeywords([]);
        setSelectedSuggestedKeywords(new Set());
        loadProject();
        const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
        const listData = await listRes.json();
        setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
    }, [id, project?.domain, selectedSuggestedKeywords, loadProject]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!id) return;
        setListsLoading(true);
        Promise.all([
            fetch(apiScansDomainList({ limit: 100, page: 1, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiScanJourneyAgentHistory({ limit: 100, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiScanGeoEeatHistory({ limit: 100, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiScanList({ limit: 100, page: 1, projectId: id }), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' }).then((r) => r.json()),
        ])
            .then(([domainRes, journeyRes, geoRes, scanRes, rankRes]) => {
                setDomainScans(Array.isArray(domainRes?.data) ? domainRes.data : []);
                setJourneyRuns(Array.isArray(journeyRes?.runs) ? journeyRes.runs : Array.isArray(journeyRes?.data) ? journeyRes.data : []);
                setGeoRuns(Array.isArray(geoRes?.runs) ? geoRes.runs : Array.isArray(geoRes?.data) ? geoRes.data : []);
                setSingleScans(Array.isArray(scanRes?.data) ? scanRes.data : []);
                setRankKeywords(Array.isArray(rankRes?.data) ? rankRes.data : []);
            })
            .catch(() => {
                setDomainScans([]);
                setJourneyRuns([]);
                setGeoRuns([]);
                setSingleScans([]);
                setRankKeywords([]);
            })
            .finally(() => setListsLoading(false));
    }, [id]);

    const handleAddKeyword = useCallback(async () => {
        const [country, language] = addKeywordMarket ? addKeywordMarket.split('-') : ['', ''];
        if (!id || !addKeywordDomain.trim() || !addKeywordKeyword.trim() || !country || !language) return;
        setAddKeywordSubmitting(true);
        try {
            const res = await fetch(API_RANK_TRACKING_KEYWORDS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    projectId: id,
                    domain: addKeywordDomain.trim(),
                    keyword: addKeywordKeyword.trim(),
                    country,
                    language,
                    device: addKeywordDevice.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (data?.success) {
                setAddKeywordOpen(false);
                setAddKeywordDomain('');
                setAddKeywordKeyword('');
                setAddKeywordMarket('');
                setAddKeywordDevice('');
                loadProject();
                const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
                const listData = await listRes.json();
                setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
            }
        } finally {
            setAddKeywordSubmitting(false);
        }
    }, [id, addKeywordDomain, addKeywordKeyword, addKeywordMarket, addKeywordDevice, loadProject]);

    const handleRefreshRankings = useCallback(async () => {
        if (!id) return;
        setRefreshError(null);
        setRefreshLoading(true);
        try {
            const res = await fetch(apiRankTrackingRefresh(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ projectId: id }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.success) {
                loadProject();
                const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
                const listData = await listRes.json();
                setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
            } else if (!res.ok && typeof data?.error === 'string') {
                setRefreshError(data.error);
            } else if (!res.ok) {
                setRefreshError(res.status === 502 ? t('projects.rankingsRefresh502') : t('common.error'));
            }
        } catch {
            setRefreshError(t('common.error'));
        } finally {
            setRefreshLoading(false);
        }
    }, [id, loadProject, t]);

    const handleDeleteKeyword = useCallback(async (keywordId: string) => {
        if (!id) return;
        try {
            const res = await fetch(apiRankTrackingKeyword(keywordId), { method: 'DELETE', credentials: 'same-origin' });
            if (res.ok) {
                loadProject();
                setRankKeywords((prev) => prev.filter((k) => k.id !== keywordId));
            }
        } catch {
            // ignore
        }
    }, [id, loadProject]);

    const handleRunResearch = useCallback(async () => {
        if (!id) return;
        setResearchError(null);
        setResearchLoading(true);
        try {
            const res = await fetch(apiProjectResearch(id), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data && Array.isArray(data.targetGroups)) {
                setResearchResult(data as ProjectResearchResult);
                setSelectedResearchKeywords(new Set());
            } else if (!res.ok && typeof data?.error === 'string') {
                setResearchError(data.error);
            } else if (!res.ok) {
                setResearchError(t('common.error'));
            }
        } catch {
            setResearchError(t('common.error'));
        } finally {
            setResearchLoading(false);
        }
    }, [id, t]);

    const updateResearchArray = useCallback(
        (key: 'targetGroups' | 'seoKeywords' | 'geoQueries' | 'competitors', add: string | null, remove?: string) => {
            setResearchResult((prev) => {
                if (!prev) return prev;
                const arr = [...(prev[key] ?? [])];
                if (remove !== undefined) {
                    const i = arr.indexOf(remove);
                    if (i !== -1) arr.splice(i, 1);
                }
                if (add?.trim()) {
                    const trimmed = add.trim();
                    if (!arr.includes(trimmed)) arr.push(trimmed);
                }
                return { ...prev, [key]: arr };
            });
        },
        []
    );

    const handleApplyResearchCompetitors = useCallback(async () => {
        if (!id || !researchResult?.competitors?.length) return;
        const merged = [...new Set([...competitors, ...researchResult.competitors])];
        try {
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ competitors: merged }),
            });
            if (res.ok) loadProject();
        } catch {
            // ignore
        }
    }, [id, researchResult?.competitors, competitors, loadProject]);

    const handleApplyResearchGeoQueries = useCallback(async () => {
        if (!id || !researchResult?.geoQueries?.length) return;
        const merged = [...new Set([...geoQueries, ...researchResult.geoQueries])];
        try {
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ geoQueries: merged }),
            });
            if (res.ok) loadProject();
        } catch {
            // ignore
        }
    }, [id, researchResult?.geoQueries, geoQueries, loadProject]);

    const handleApplyResearchKeywords = useCallback(async () => {
        if (!id || !project?.domain || selectedResearchKeywords.size === 0) return;
        const market = SERP_MAIN_MARKETS[0];
        const [country, language] = market ? [market.country, market.language] : ['de', 'de'];
        const domain = project.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? project.domain;
        for (const keyword of selectedResearchKeywords) {
            try {
                await fetch(API_RANK_TRACKING_KEYWORDS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        projectId: id,
                        domain,
                        keyword: keyword.trim(),
                        country,
                        language,
                    }),
                });
            } catch {
                // continue
            }
        }
        setSelectedResearchKeywords(new Set());
        loadProject();
        const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
        const listData = await listRes.json();
        setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
    }, [id, project?.domain, selectedResearchKeywords, loadProject]);

    const handleToggleResearchKeyword = useCallback((kw: string) => {
        setSelectedResearchKeywords((prev) => {
            const next = new Set(prev);
            if (next.has(kw)) next.delete(kw);
            else next.add(kw);
            return next;
        });
    }, []);

    const handleResearchAddTargetGroupChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setResearchAddTargetGroup(e.target.value);
    }, []);
    const handleResearchValuePropositionChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setResearchResult((prev) => (prev ? { ...prev, valueProposition: e.target.value } : prev));
        },
        []
    );
    const handleResearchAddKeywordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setResearchAddKeyword(e.target.value);
    }, []);
    const handleResearchAddGeoQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setResearchAddGeoQuery(e.target.value);
    }, []);
    const handleResearchAddCompetitorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setResearchAddCompetitor(e.target.value);
    }, []);

    const handleResearchAddTargetGroupClick = useCallback(() => {
        updateResearchArray('targetGroups', researchAddTargetGroup);
        setResearchAddTargetGroup('');
    }, [researchAddTargetGroup, updateResearchArray]);
    const handleResearchAddKeywordClick = useCallback(() => {
        updateResearchArray('seoKeywords', researchAddKeyword);
        setResearchAddKeyword('');
    }, [researchAddKeyword, updateResearchArray]);
    const handleResearchAddGeoQueryClick = useCallback(() => {
        updateResearchArray('geoQueries', researchAddGeoQuery);
        setResearchAddGeoQuery('');
    }, [researchAddGeoQuery, updateResearchArray]);
    const handleResearchAddCompetitorClick = useCallback(() => {
        updateResearchArray('competitors', researchAddCompetitor);
        setResearchAddCompetitor('');
    }, [researchAddCompetitor, updateResearchArray]);

    const handleResearchRemoveTargetGroup = useCallback(
        (item: string) => updateResearchArray('targetGroups', null, item),
        [updateResearchArray]
    );
    const handleResearchRemoveGeoQuery = useCallback(
        (q: string) => updateResearchArray('geoQueries', null, q),
        [updateResearchArray]
    );
    const handleResearchRemoveCompetitor = useCallback(
        (c: string) => updateResearchArray('competitors', null, c),
        [updateResearchArray]
    );

    if (!id) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    if (loading || !project) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="body2">{loading ? t('common.loading') : t('common.error')}</MsqdxTypography>
            </Box>
        );
    }

    const listItemSx = {
        display: 'flex' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1,
        px: 1.5,
        borderBottom: '1px solid var(--color-border-subtle, #eee)',
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1200, mx: 'auto' }}>
            <Stack sx={{ gap: 'var(--msqdx-spacing-lg)' }}>
                {/* Card 1: Company info */}
                <MsqdxCard
                    variant="flat"
                    borderRadius="button"
                    sx={{ p: 'var(--msqdx-spacing-md)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                >
                    <MsqdxTypography variant="h6" weight="semibold" sx={{ mb: 0.5 }}>
                        {t('projects.companyInfo')}
                    </MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                        {project.name}
                    </MsqdxTypography>
                    {project.domain && (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {project.domain}
                        </MsqdxTypography>
                    )}
                </MsqdxCard>

                {/* Card: Projekt-Research */}
                <MsqdxMoleculeCard
                    title={t('projects.research')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
                        {t('projects.researchDescription')}
                    </MsqdxTypography>
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        size="small"
                        onClick={handleRunResearch}
                        disabled={researchLoading || !project.domain}
                    >
                        {researchLoading ? t('common.loading') : t('projects.researchStart')}
                    </MsqdxButton>
                    {researchError && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mt: 1 }}>
                            {researchError}
                        </MsqdxTypography>
                    )}
                    {!researchResult && !researchLoading && (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 2 }}>
                            {t('projects.researchEmpty')}
                        </MsqdxTypography>
                    )}
                    {researchResult && (
                        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Target groups */}
                            <Box>
                                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                                    {t('projects.researchTargetGroups')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                    {(researchResult.targetGroups ?? []).map((item) => (
                                        <MsqdxChip
                                            key={item}
                                            label={item}
                                            onDelete={() => handleResearchRemoveTargetGroup(item)}
                                            size="small"
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Box
                                        component="input"
                                        placeholder={t('projects.researchAdd')}
                                        value={researchAddTargetGroup}
                                        onChange={handleResearchAddTargetGroupChange}
                                        sx={{ minWidth: 180, flex: '1 1 180px', px: 1.5, py: 1, border: '1px solid var(--color-border-subtle)', borderRadius: 1, fontSize: 14 }}
                                    />
                                    <MsqdxButton
                                        variant="outlined"
                                        size="small"
                                        onClick={handleResearchAddTargetGroupClick}
                                        disabled={!researchAddTargetGroup.trim()}
                                    >
                                        {t('projects.researchAdd')}
                                    </MsqdxButton>
                                </Box>
                            </Box>
                            {/* Value proposition */}
                            <Box>
                                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                                    {t('projects.researchValueProposition')}
                                </MsqdxTypography>
                                <textarea
                                    value={researchResult.valueProposition ?? ''}
                                    onChange={handleResearchValuePropositionChange}
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid var(--color-border-subtle)',
                                        borderRadius: 4,
                                        fontSize: 14,
                                        resize: 'vertical',
                                    }}
                                />
                            </Box>
                            {/* SEO keywords */}
                            <Box>
                                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                                    {t('projects.researchSeoKeywords')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                    {(researchResult.seoKeywords ?? []).map((kw) => (
                                        <MsqdxChip
                                            key={kw}
                                            label={kw}
                                            onClick={() => handleToggleResearchKeyword(kw)}
                                            color={selectedResearchKeywords.has(kw) ? 'primary' : 'default'}
                                            variant={selectedResearchKeywords.has(kw) ? 'filled' : 'outlined'}
                                            size="small"
                                            sx={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Box
                                        component="input"
                                        placeholder={t('projects.researchAdd')}
                                        value={researchAddKeyword}
                                        onChange={handleResearchAddKeywordChange}
                                        sx={{ minWidth: 180, flex: '1 1 180px', px: 1.5, py: 1, border: '1px solid var(--color-border-subtle)', borderRadius: 1, fontSize: 14 }}
                                    />
                                    <MsqdxButton
                                        variant="outlined"
                                        size="small"
                                        onClick={handleResearchAddKeywordClick}
                                        disabled={!researchAddKeyword.trim()}
                                    >
                                        {t('projects.researchAdd')}
                                    </MsqdxButton>
                                    <MsqdxButton
                                        variant="contained"
                                        size="small"
                                        onClick={handleApplyResearchKeywords}
                                        disabled={selectedResearchKeywords.size === 0}
                                    >
                                        {t('projects.researchApplyKeywords')} ({selectedResearchKeywords.size})
                                    </MsqdxButton>
                                </Box>
                            </Box>
                            {/* GEO queries */}
                            <Box>
                                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                                    {t('projects.researchGeoQueries')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                    {(researchResult.geoQueries ?? []).map((q) => (
                                        <MsqdxChip
                                            key={q}
                                            label={q}
                                            onDelete={() => handleResearchRemoveGeoQuery(q)}
                                            size="small"
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Box
                                        component="input"
                                        placeholder={t('projects.researchAdd')}
                                        value={researchAddGeoQuery}
                                        onChange={handleResearchAddGeoQueryChange}
                                        sx={{ minWidth: 180, flex: '1 1 180px', px: 1.5, py: 1, border: '1px solid var(--color-border-subtle)', borderRadius: 1, fontSize: 14 }}
                                    />
                                    <MsqdxButton
                                        variant="outlined"
                                        size="small"
                                        onClick={handleResearchAddGeoQueryClick}
                                        disabled={!researchAddGeoQuery.trim()}
                                    >
                                        {t('projects.researchAdd')}
                                    </MsqdxButton>
                                    <MsqdxButton variant="contained" size="small" onClick={handleApplyResearchGeoQueries}>
                                        {t('projects.researchApplyGeoQueries')}
                                    </MsqdxButton>
                                </Box>
                            </Box>
                            {/* Competitors */}
                            <Box>
                                <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ mb: 0.5 }}>
                                    {t('projects.researchCompetitors')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                                    {(researchResult.competitors ?? []).map((c) => (
                                        <MsqdxChip
                                            key={c}
                                            label={c}
                                            onDelete={() => handleResearchRemoveCompetitor(c)}
                                            size="small"
                                        />
                                    ))}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Box
                                        component="input"
                                        placeholder={t('projects.researchAdd')}
                                        value={researchAddCompetitor}
                                        onChange={handleResearchAddCompetitorChange}
                                        sx={{ minWidth: 180, flex: '1 1 180px', px: 1.5, py: 1, border: '1px solid var(--color-border-subtle)', borderRadius: 1, fontSize: 14 }}
                                    />
                                    <MsqdxButton
                                        variant="outlined"
                                        size="small"
                                        onClick={handleResearchAddCompetitorClick}
                                        disabled={!researchAddCompetitor.trim()}
                                    >
                                        {t('projects.researchAdd')}
                                    </MsqdxButton>
                                    <MsqdxButton variant="contained" size="small" onClick={handleApplyResearchCompetitors}>
                                        {t('projects.researchApplyCompetitors')}
                                    </MsqdxButton>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>

                {/* Card 2: Competitors */}
                <MsqdxMoleculeCard
                    title={t('projects.competitors')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
                        {t('projects.competitorsDescription')}
                    </MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
                        <MsqdxFormField
                            label={t('projects.competitorDomain')}
                            placeholder={t('projects.addCompetitorPlaceholder')}
                            value={addCompetitorValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddCompetitorValue(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddCompetitor()}
                            sx={{ minWidth: 200, flex: '1 1 200px' }}
                        />
                        <MsqdxButton variant="outlined" size="small" onClick={handleAddCompetitor} disabled={!normalizeDomainInput(addCompetitorValue)}>
                            {t('projects.addCompetitor')}
                        </MsqdxButton>
                        <MsqdxButton
                            variant="outlined"
                            size="small"
                            onClick={handleSuggestCompetitors}
                            disabled={suggestCompetitorsLoading || !project.domain}
                        >
                            {suggestCompetitorsLoading ? t('common.loading') : t('projects.suggestCompetitorsWithAi')}
                        </MsqdxButton>
                    </Box>
                    {suggestCompetitorsError && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mb: 1 }}>
                            {suggestCompetitorsError}
                        </MsqdxTypography>
                    )}
                    {competitors.length === 0 ? (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.noCompetitors')}
                        </MsqdxTypography>
                    ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {competitors.map((domain) => (
                                <MsqdxChip
                                    key={domain}
                                    label={domain}
                                    onDelete={() => handleRemoveCompetitor(domain)}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                />
                            ))}
                        </Box>
                    )}
                </MsqdxMoleculeCard>

                {/* Card 3: Keywords (Rank-Tracking) */}
                <MsqdxMoleculeCard
                    title={t('projects.rankings')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    {listsLoading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 2 }}>{t('common.loading')}</MsqdxTypography>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => setAddKeywordOpen(true)}>
                                    {t('projects.addKeyword')}
                                </MsqdxButton>
                                <MsqdxButton
                                    variant="outlined"
                                    size="small"
                                    onClick={handleSuggestKeywords}
                                    disabled={suggestKeywordsLoading || !project.domain}
                                >
                                    {suggestKeywordsLoading ? t('common.loading') : t('projects.suggestKeywordsWithAi')}
                                </MsqdxButton>
                                <MsqdxButton variant="outlined" size="small" onClick={handleRefreshRankings} disabled={refreshLoading}>
                                    {refreshLoading ? t('common.loading') : t('projects.refreshRankings')}
                                </MsqdxButton>
                            </Box>
                            {suggestKeywordsError && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mb: 1 }}>
                                    {suggestKeywordsError}
                                </MsqdxTypography>
                            )}
                            {suggestedKeywords.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        {t('projects.suggestedKeywords')}
                                    </MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                        {suggestedKeywords.map((kw) => (
                                            <MsqdxChip
                                                key={kw}
                                                label={kw}
                                                onClick={() => handleToggleSuggestedKeyword(kw)}
                                                color={selectedSuggestedKeywords.has(kw) ? 'primary' : 'default'}
                                                variant={selectedSuggestedKeywords.has(kw) ? 'filled' : 'outlined'}
                                                size="small"
                                                sx={{ cursor: 'pointer', mb: 0.5 }}
                                            />
                                        ))}
                                    </Box>
                                    <MsqdxButton
                                        variant="contained"
                                        size="small"
                                        onClick={handleAddSelectedKeywords}
                                        disabled={selectedSuggestedKeywords.size === 0}
                                    >
                                        {t('projects.addSelectedKeywords')} ({selectedSuggestedKeywords.size})
                                    </MsqdxButton>
                                </Box>
                            )}
                            {refreshError && (
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-status-error)', mb: 1 }}>
                                    {refreshError}
                                </MsqdxTypography>
                            )}
                            {rankKeywords.length === 0 && suggestedKeywords.length === 0 ? (
                                <Box sx={{ py: 4, textAlign: 'center' }}>
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                        {t('projects.emptyRankings')}
                                    </MsqdxTypography>
                                    <MsqdxButton variant="contained" brandColor="green" onClick={() => setAddKeywordOpen(true)}>
                                        {t('projects.addKeyword')}
                                    </MsqdxButton>
                                </Box>
                            ) : (
                                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                    {rankKeywords.map((k) => (
                                        <Box
                                            key={k.id}
                                            component="li"
                                            sx={{
                                                borderBottom: '1px solid var(--color-border-subtle, #eee)',
                                            }}
                                        >
                                            <Box sx={{ ...listItemSx, flexWrap: 'wrap', gap: 1, borderBottom: 'none' }}>
                                                <Box sx={{ minWidth: 0, flex: '1 1 200px' }}>
                                                    <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {k.domain} — {k.keyword}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                        {k.country && k.language ? `${k.country}/${k.language} · ` : ''}
                                                        {t('projects.lastPosition')}: {k.lastPosition != null ? k.lastPosition : '—'}
                                                        {k.lastCompetitorPositions && Object.keys(k.lastCompetitorPositions).length > 0 && (
                                                            <> · {Object.entries(k.lastCompetitorPositions)
                                                                .filter(([, pos]) => pos != null)
                                                                .map(([dom, pos]) => `${dom}: ${pos}`)
                                                                .join(' · ')}
                                                            </>
                                                        )}
                                                        {' · '}{t('projects.lastUpdate')}: {k.lastRecordedAt ? new Date(k.lastRecordedAt).toLocaleDateString() : '—'}
                                                    </MsqdxTypography>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <MsqdxButton
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => setChartExpandedKeywordId((id) => (id === k.id ? null : k.id))}
                                                    >
                                                        {chartExpandedKeywordId === k.id ? t('projects.rankChartHide') : t('projects.rankChartShow')}
                                                    </MsqdxButton>
                                                    <MsqdxButton variant="outlined" size="small" color="error" onClick={() => handleDeleteKeyword(k.id)}>
                                                        {t('projects.deleteKeyword')}
                                                    </MsqdxButton>
                                                </Box>
                                            </Box>
                                            {chartExpandedKeywordId === k.id && (
                                                <Box sx={{ px: 1.5, pb: 2, pt: 0 }}>
                                                    <RankTrackingChart
                                                        keywordId={k.id}
                                                        keywordLabel={`${k.domain} — ${k.keyword}`}
                                                        ourDomain={k.domain}
                                                        competitorDomains={competitors}
                                                        t={t}
                                                    />
                                                </Box>
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </>
                    )}
                </MsqdxMoleculeCard>

                {/* Card 4: GEO-Fragen */}
                <MsqdxMoleculeCard
                    title={t('projects.geoQueries')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
                        {t('projects.geoQueriesDescription')}
                    </MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1.5 }}>
                        <MsqdxFormField
                            label={t('projects.geoQuery')}
                            placeholder={t('projects.addGeoQueryPlaceholder')}
                            value={addGeoQueryValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddGeoQueryValue(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddGeoQuery()}
                            sx={{ minWidth: 240, flex: '1 1 240px' }}
                        />
                        <MsqdxButton variant="outlined" size="small" onClick={handleAddGeoQuery} disabled={!addGeoQueryValue.trim()}>
                            {t('projects.addGeoQuery')}
                        </MsqdxButton>
                        <MsqdxButton
                            variant="outlined"
                            size="small"
                            onClick={handleSuggestGeoQueries}
                            disabled={suggestGeoQueriesLoading || !project.domain}
                        >
                            {suggestGeoQueriesLoading ? t('common.loading') : t('projects.suggestGeoQueriesWithAi')}
                        </MsqdxButton>
                    </Box>
                    {suggestGeoQueriesError && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mb: 1 }}>
                            {suggestGeoQueriesError}
                        </MsqdxTypography>
                    )}
                    {geoQueries.length === 0 ? (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {t('projects.emptyGeoQueries')}
                        </MsqdxTypography>
                    ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {geoQueries.map((query) => (
                                <MsqdxChip
                                    key={query}
                                    label={query}
                                    onDelete={() => handleRemoveGeoQuery(query)}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                />
                            ))}
                        </Box>
                    )}
                </MsqdxMoleculeCard>

                {/* Card 5: Aktivität */}
                <MsqdxMoleculeCard
                    title={t('projects.activity')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    {listsLoading ? (
                        <MsqdxTypography variant="body2" sx={{ py: 2 }}>{t('common.loading')}</MsqdxTypography>
                    ) : (
                        <MsqdxAccordion>
                            <MsqdxAccordionItem id="activity-domain-scans" summary={`${t('projects.domainScans')} (${domainScans.length})`}>
                                {domainScans.length === 0 ? (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                            {t('projects.emptyDomainScans')}
                                        </MsqdxTypography>
                                        <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => router.push(PATH_SCAN_DOMAIN)}>
                                            {t('projects.startDeepScan')}
                                        </MsqdxButton>
                                    </Box>
                                ) : (
                                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                        {domainScans.map((ds) => (
                                            <Box key={ds.id} component="li" sx={listItemSx}>
                                                <MsqdxTypography variant="body2">{ds.domain}</MsqdxTypography>
                                                <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathDomain(ds.id))}>
                                                    {t('projects.open')}
                                                </MsqdxButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </MsqdxAccordionItem>
                            <MsqdxAccordionItem id="activity-journey-runs" summary={`${t('projects.journeyRuns')} (${journeyRuns.length})`}>
                                {journeyRuns.length === 0 ? (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                            {t('projects.emptyJourneyRuns')}
                                        </MsqdxTypography>
                                        <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => router.push(PATH_SCAN)}>
                                            {t('projects.startJourney')}
                                        </MsqdxButton>
                                    </Box>
                                ) : (
                                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                        {journeyRuns.map((j) => (
                                            <Box key={j.id} component="li" sx={listItemSx}>
                                                <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                                    {j.task || j.url}
                                                </MsqdxTypography>
                                                <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathJourneyAgent(j.id))}>
                                                    {t('projects.open')}
                                                </MsqdxButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </MsqdxAccordionItem>
                            <MsqdxAccordionItem id="activity-geo-runs" summary={`${t('projects.geoEeatRuns')} (${geoRuns.length})`}>
                                {geoRuns.length === 0 ? (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                            {t('projects.emptyGeoEeatRuns')}
                                        </MsqdxTypography>
                                        <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => router.push(PATH_SCAN)}>
                                            {t('projects.startGeoEeat')}
                                        </MsqdxButton>
                                    </Box>
                                ) : (
                                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                        {geoRuns.map((g) => (
                                            <Box key={g.id} component="li" sx={listItemSx}>
                                                <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                                    {g.url}
                                                </MsqdxTypography>
                                                <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathGeoEeat(g.id))}>
                                                    {t('projects.open')}
                                                </MsqdxButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </MsqdxAccordionItem>
                            <MsqdxAccordionItem id="activity-single-scans" summary={`${t('projects.singleScans')} (${singleScans.length})`}>
                                {singleScans.length === 0 ? (
                                    <Box sx={{ py: 3, textAlign: 'center' }}>
                                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                                            {t('projects.emptySingleScans')}
                                        </MsqdxTypography>
                                        <MsqdxButton variant="contained" brandColor="green" size="small" onClick={() => router.push(PATH_SCAN)}>
                                            {t('projects.startScan')}
                                        </MsqdxButton>
                                    </Box>
                                ) : (
                                    <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                        {singleScans.map((s) => (
                                            <Box key={s.id} component="li" sx={listItemSx}>
                                                <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
                                                    {s.url}
                                                </MsqdxTypography>
                                                <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathResults(s.id))}>
                                                    {t('projects.open')}
                                                </MsqdxButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </MsqdxAccordionItem>
                        </MsqdxAccordion>
                    )}
                </MsqdxMoleculeCard>
            </Stack>

            <Dialog open={addKeywordOpen} onClose={() => setAddKeywordOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 'var(--msqdx-spacing-md, 8px)' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>{t('projects.addKeyword')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 0.5 }}>
                        <MsqdxFormField
                            label={t('projects.domain')}
                            placeholder={t('projects.domainPlaceholder')}
                            value={addKeywordDomain}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordDomain(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.keyword')}
                            placeholder={t('projects.keywordPlaceholder')}
                            value={addKeywordKeyword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordKeyword(e.target.value)}
                            fullWidth
                        />
                        <Box>
                            <MsqdxTypography component="label" variant="body2" sx={{ display: 'block', mb: 0.5, fontWeight: 500 }}>
                                {t('projects.market')}
                            </MsqdxTypography>
                            <Box
                                component="select"
                                value={addKeywordMarket}
                                onChange={(e) => setAddKeywordMarket(e.target.value)}
                                required
                                sx={{
                                    width: '100%',
                                    py: 1,
                                    px: 1.5,
                                    borderRadius: 'var(--msqdx-radius-sm, 4px)',
                                    border: '1px solid var(--color-border-subtle, #ccc)',
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <option value="">{t('projects.marketPlaceholder')}</option>
                                {SERP_MAIN_MARKETS.map((m) => (
                                    <option key={`${m.country}-${m.language}`} value={`${m.country}-${m.language}`}>
                                        {m.label} ({m.country}/{m.language})
                                    </option>
                                ))}
                            </Box>
                        </Box>
                        <MsqdxFormField
                            label={t('projects.device')}
                            placeholder={t('projects.devicePlaceholder')}
                            value={addKeywordDevice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordDevice(e.target.value)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2, pb: 2 }}>
                    <MsqdxButton variant="outlined" onClick={() => setAddKeywordOpen(false)}>
                        {t('projects.cancel')}
                    </MsqdxButton>
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        onClick={handleAddKeyword}
                        disabled={!addKeywordDomain.trim() || !addKeywordKeyword.trim() || !addKeywordMarket || addKeywordSubmitting}
                    >
                        {addKeywordSubmitting ? t('projects.creating') : t('projects.save')}
                    </MsqdxButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
