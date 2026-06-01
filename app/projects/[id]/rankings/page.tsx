'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxCard,
    MsqdxFormField,
    MsqdxChip,
    MsqdxIconButton,
} from '@msqdx/react';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiProjectRankingSummary,
    apiRankTrackingKeywords,
    apiRankTrackingKeyword,
    apiRankTrackingRefresh,
    API_RANK_TRACKING_KEYWORDS,
    API_RANK_TRACKING_KEYWORDS_LOCALIZE,
} from '@/lib/constants';
import { SERP_MAIN_MARKETS, parseMarketKey } from '@/lib/serp-markets';
import { projectTrackDomain } from '@/lib/project-track-domain';
import { groupKeywordsByIntent, marketLabelForKeyword } from '@/lib/serp-intent';
import { MSQDX_BUTTON_THEME_ACCENT_SX, THEME_ACCENT_CSS, msqdxChipThemeAccentSx } from '@/lib/theme-accent';
import { RankTrackingChart } from '@/components/RankTrackingChart';
import { RankIntentCompareChart } from '@/components/RankIntentCompareChart';
import { SerpGooglePreviewModal } from '@/components/SerpGooglePreviewModal';
import { SerpMarketSelect } from '@/components/SerpMarketSelect';
import { VirtualChipList } from '@/components/VirtualChipList';

interface RankKeywordItem {
    id: string;
    domain: string;
    keyword: string;
    country?: string;
    language?: string;
    intentKey?: string;
    intentLabel?: string;
    device?: string;
    lastPosition?: number;
    lastRecordedAt?: string;
    lastCompetitorPositions?: Record<string, number | null>;
    lastSerpLeaderDomain?: string;
    lastSerpLeaderUrl?: string;
}

function normalizeRankDomain(domain: string): string {
    return domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
}

interface RankingSummaryData {
    score: number | null;
    keywordCount: number;
    lastUpdated: string | null;
    competitorScores?: Record<string, number>;
}

export default function ProjectRankingsPage() {
    const params = useParams();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<{ id: string; name: string; domain: string | null; competitors?: string[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [rankKeywords, setRankKeywords] = useState<RankKeywordItem[]>([]);
    const [addKeywordOpen, setAddKeywordOpen] = useState(false);
    const [addKeywordKeyword, setAddKeywordKeyword] = useState('');
    const [addKeywordMarket, setAddKeywordMarket] = useState('');
    const [addKeywordMarkets, setAddKeywordMarkets] = useState<string[]>(['de-de']);
    const [addKeywordMultiMarket, setAddKeywordMultiMarket] = useState(false);
    const [addIntentLabel, setAddIntentLabel] = useState('');
    const [addKeywordDevice, setAddKeywordDevice] = useState('');
    const [rankingsView, setRankingsView] = useState<'flat' | 'intent'>('intent');
    const [bulkMarketKeys, setBulkMarketKeys] = useState<string[]>(['de-de', 'us-en', 'gb-en']);
    const [addKeywordSubmitting, setAddKeywordSubmitting] = useState(false);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [suggestKeywordsLoading, setSuggestKeywordsLoading] = useState(false);
    const [suggestKeywordsError, setSuggestKeywordsError] = useState<string | null>(null);
    const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
    const [selectedSuggestedKeywords, setSelectedSuggestedKeywords] = useState<Set<string>>(new Set());
    const [rankingSummary, setRankingSummary] = useState<RankingSummaryData | null>(null);
    const [serpPreviewOpen, setSerpPreviewOpen] = useState(false);
    const [serpPreviewKeyword, setSerpPreviewKeyword] = useState<RankKeywordItem | null>(null);

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

    const loadKeywords = useCallback(async () => {
        if (!id) return;
        const listRes = await fetch(apiRankTrackingKeywords(id), { credentials: 'same-origin' });
        const listData = await listRes.json();
        setRankKeywords(Array.isArray(listData?.data) ? listData.data : []);
    }, [id]);

    const loadRankingSummary = useCallback(async () => {
        if (!id) return;
        const res = await fetch(apiProjectRankingSummary(id), { credentials: 'same-origin' });
        const data = await res.json();
        if (data?.success && data?.data) setRankingSummary(data.data as RankingSummaryData);
        else setRankingSummary(null);
    }, [id]);

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!id) return;
        loadKeywords();
    }, [id, loadKeywords]);

    useEffect(() => {
        loadRankingSummary();
    }, [loadRankingSummary]);

    const competitors = Array.isArray(project?.competitors) ? project.competitors : [];
    const trackDomain = useMemo(() => projectTrackDomain(project?.domain), [project?.domain]);

    const intentGroups = useMemo(() => groupKeywordsByIntent(rankKeywords), [rankKeywords]);

    const handleAddKeyword = useCallback(async () => {
        if (!id || !trackDomain || !addKeywordKeyword.trim()) return;
        const markets = addKeywordMultiMarket
            ? addKeywordMarkets
            : addKeywordMarket
              ? [addKeywordMarket]
              : [];
        if (markets.length === 0) return;

        setAddKeywordSubmitting(true);
        try {
            const domain = trackDomain;
            const seed = addKeywordKeyword.trim();
            const device = addKeywordDevice.trim() || undefined;

            if (markets.length === 1) {
                const mk = parseMarketKey(markets[0]);
                if (!mk) return;
                const res = await fetch(API_RANK_TRACKING_KEYWORDS, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        projectId: id,
                        domain,
                        keyword: seed,
                        country: mk.country,
                        language: mk.language,
                        intentLabel: addIntentLabel.trim() || undefined,
                        device,
                    }),
                });
                const data = await res.json();
                if (!data?.success) return;
            } else {
                const res = await fetch(API_RANK_TRACKING_KEYWORDS_LOCALIZE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        projectId: id,
                        domain,
                        seedKeyword: seed,
                        intentLabel: addIntentLabel.trim() || seed,
                        marketKeys: markets,
                        device,
                        persist: true,
                    }),
                });
                const data = await res.json();
                if (!data?.success) return;
            }

            setAddKeywordOpen(false);
            setAddKeywordKeyword('');
            setAddKeywordMarket('');
            setAddKeywordMarkets(['de-de']);
            setAddIntentLabel('');
            setAddKeywordDevice('');
            loadProject();
            loadKeywords();
            loadRankingSummary();
        } finally {
            setAddKeywordSubmitting(false);
        }
    }, [
        id,
        trackDomain,
        addKeywordKeyword,
        addKeywordMarket,
        addKeywordMarkets,
        addKeywordMultiMarket,
        addIntentLabel,
        addKeywordDevice,
        loadProject,
        loadKeywords,
        loadRankingSummary,
    ]);

    const handleSuggestKeywords = useCallback(async () => {
        if (!id) return;
        setSuggestKeywordsError(null);
        setSuggestedKeywords([]);
        setSelectedSuggestedKeywords(new Set());
        setSuggestKeywordsLoading(true);
        try {
            const res = await fetch(`/api/projects/${id}/suggest-keywords`, {
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

    const renderSuggestedKeywordChip = useCallback(
        (kw: string) => (
            <MsqdxChip
                label={kw}
                onClick={() => handleToggleSuggestedKeyword(kw)}
                color={selectedSuggestedKeywords.has(kw) ? 'primary' : 'default'}
                variant={selectedSuggestedKeywords.has(kw) ? 'filled' : 'outlined'}
                size="small"
                sx={{ mb: 0.5, ...msqdxChipThemeAccentSx(selectedSuggestedKeywords.has(kw)) }}
            />
        ),
        [handleToggleSuggestedKeyword, selectedSuggestedKeywords]
    );

    const handleAddSelectedKeywords = useCallback(async () => {
        if (!id || !trackDomain || selectedSuggestedKeywords.size === 0 || bulkMarketKeys.length === 0) return;
        const domain = trackDomain;
        for (const keyword of selectedSuggestedKeywords) {
            try {
                if (bulkMarketKeys.length === 1) {
                    const mk = parseMarketKey(bulkMarketKeys[0]);
                    if (!mk) continue;
                    await fetch(API_RANK_TRACKING_KEYWORDS, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            projectId: id,
                            domain,
                            keyword: keyword.trim(),
                            country: mk.country,
                            language: mk.language,
                        }),
                    });
                } else {
                    await fetch(API_RANK_TRACKING_KEYWORDS_LOCALIZE, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            projectId: id,
                            domain,
                            seedKeyword: keyword.trim(),
                            intentLabel: keyword.trim(),
                            marketKeys: bulkMarketKeys,
                            persist: true,
                        }),
                    });
                }
            } catch {
                // continue
            }
        }
        setSuggestedKeywords([]);
        setSelectedSuggestedKeywords(new Set());
        loadProject();
        loadKeywords();
        loadRankingSummary();
    }, [id, trackDomain, selectedSuggestedKeywords, bulkMarketKeys, loadProject, loadKeywords, loadRankingSummary]);

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
                loadKeywords();
                loadRankingSummary();
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
    }, [id, loadProject, loadKeywords, loadRankingSummary, t]);

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

    return (
        <Box sx={{ py: 'var(--msqdx-spacing-md)', px: 1.5, width: '100%', maxWidth: '100%' }}>
            <Stack sx={{ gap: 2 }}>
                {/* Score card: our score + competitor scores */}
                <MsqdxMoleculeCard
                    title={t('projects.rankingScore')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'baseline' }}>
                        <Box>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                {t('projects.ourScore')}
                            </MsqdxTypography>
                            <MsqdxTypography
                                variant="h4"
                                weight="bold"
                                sx={{
                                    color:
                                        rankingSummary?.score != null
                                            ? rankingSummary.score >= 70
                                                ? 'var(--color-status-success)'
                                                : rankingSummary.score >= 40
                                                  ? 'var(--color-status-warning)'
                                                  : 'var(--color-status-error)'
                                            : undefined,
                                }}
                            >
                                {rankingSummary?.score != null ? `${rankingSummary.score}/100` : '—'}
                            </MsqdxTypography>
                        </Box>
                        {rankingSummary?.competitorScores && Object.keys(rankingSummary.competitorScores).length > 0 && (
                            <>
                                {Object.entries(rankingSummary.competitorScores).map(([domain, score]) => (
                                    <Box key={domain}>
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                            {domain}
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="h4" weight="bold" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                            {score}/100
                                        </MsqdxTypography>
                                    </Box>
                                ))}
                            </>
                        )}
                    </Box>
                </MsqdxMoleculeCard>

                <MsqdxMoleculeCard
                    title={t('projects.rankings')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    headerActions={
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <MsqdxButton
                                variant="contained"
                                size="small"
                                onClick={() => setAddKeywordOpen(true)}
                                disabled={!trackDomain}
                                sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                            >
                                {t('projects.addKeyword')}
                            </MsqdxButton>
                            <MsqdxButton
                                variant="outlined"
                                size="small"
                                onClick={handleSuggestKeywords}
                                disabled={suggestKeywordsLoading || !trackDomain}
                            >
                                {suggestKeywordsLoading ? t('common.loading') : t('projects.suggestKeywordsWithAi')}
                            </MsqdxButton>
                            <MsqdxButton variant="outlined" size="small" onClick={handleRefreshRankings} disabled={refreshLoading}>
                                {refreshLoading ? t('common.loading') : t('projects.refreshRankings')}
                            </MsqdxButton>
                        </Box>
                    }
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
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
                            <Box sx={{ mb: 1 }}>
                                <VirtualChipList items={suggestedKeywords} getItemKey={(kw) => kw} renderChip={renderSuggestedKeywordChip} />
                            </Box>
                            <Box sx={{ mb: 1.5 }}>
                                <SerpMarketSelect
                                    label={t('projects.bulkMarkets')}
                                    multiple
                                    selectedKeys={bulkMarketKeys}
                                    onSelectedKeysChange={setBulkMarketKeys}
                                />
                            </Box>
                            <MsqdxButton
                                variant="contained"
                                size="small"
                                onClick={handleAddSelectedKeywords}
                                disabled={selectedSuggestedKeywords.size === 0 || bulkMarketKeys.length === 0}
                                sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                            >
                                {t('projects.addSelectedKeywords')} ({selectedSuggestedKeywords.size})
                            </MsqdxButton>
                        </Box>
                    )}
                    {rankKeywords.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <MsqdxChip
                                label={t('projects.rankingsViewIntent')}
                                variant={rankingsView === 'intent' ? 'filled' : 'outlined'}
                                size="small"
                                onClick={() => setRankingsView('intent')}
                                sx={msqdxChipThemeAccentSx(rankingsView === 'intent')}
                            />
                            <MsqdxChip
                                label={t('projects.rankingsViewFlat')}
                                variant={rankingsView === 'flat' ? 'filled' : 'outlined'}
                                size="small"
                                onClick={() => setRankingsView('flat')}
                                sx={msqdxChipThemeAccentSx(rankingsView === 'flat')}
                            />
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
                            <MsqdxButton
                                variant="contained"
                                onClick={() => setAddKeywordOpen(true)}
                                disabled={!trackDomain}
                                sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                            >
                                {t('projects.addKeyword')}
                            </MsqdxButton>
                        </Box>
                    ) : rankingsView === 'intent' ? (
                        <Stack sx={{ gap: 2 }}>
                            {intentGroups.map((group) => (
                                <MsqdxCard
                                    key={group.intentKey}
                                    variant="flat"
                                    borderRadius="button"
                                    sx={{
                                        p: 2,
                                        border: `1px solid ${THEME_ACCENT_CSS}`,
                                        bgcolor: 'var(--color-card-bg)',
                                    }}
                                >
                                    <MsqdxTypography variant="subtitle1" weight="semibold" sx={{ mb: 1 }}>
                                        {group.intentLabel}
                                    </MsqdxTypography>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: `repeat(${Math.min(group.variants.length, 4)}, 1fr)` },
                                            gap: 1,
                                            mb: 2,
                                        }}
                                    >
                                        {group.variants.map((v) => (
                                            <Box
                                                key={v.id}
                                                sx={{
                                                    p: 1,
                                                    borderRadius: 1,
                                                    border: '1px solid var(--color-border-subtle, #eee)',
                                                }}
                                            >
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {v.country && v.language
                                                        ? marketLabelForKeyword(v.country, v.language, SERP_MAIN_MARKETS)
                                                        : ''}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="body2" weight="semibold" sx={{ wordBreak: 'break-word' }}>
                                                    {v.keyword}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                                                    {t('projects.lastPosition')}: {v.lastPosition != null ? v.lastPosition : '—'}
                                                </MsqdxTypography>
                                                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                                                    <MsqdxButton
                                                        variant="outlined"
                                                        size="small"
                                                        onClick={() => {
                                                            setSerpPreviewKeyword(v);
                                                            setSerpPreviewOpen(true);
                                                        }}
                                                    >
                                                        {t('projects.viewSerpPreview')}
                                                    </MsqdxButton>
                                                    <MsqdxIconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteKeyword(v.id)}
                                                        aria-label={t('projects.deleteKeyword')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </MsqdxIconButton>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                    {group.variants.length > 1 && (
                                        <RankIntentCompareChart
                                            variants={group.variants.map((v) => ({
                                                keywordId: v.id,
                                                seriesLabel:
                                                    v.country && v.language
                                                        ? marketLabelForKeyword(v.country, v.language, SERP_MAIN_MARKETS)
                                                        : v.keyword,
                                            }))}
                                            t={t}
                                        />
                                    )}
                                </MsqdxCard>
                            ))}
                        </Stack>
                    ) : (
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)' },
                                gap: 2,
                            }}
                        >
                            {rankKeywords.map((k) => (
                                <MsqdxCard
                                    key={k.id}
                                    variant="flat"
                                    borderRadius="button"
                                    sx={{
                                        p: 0,
                                        border: `1px solid ${THEME_ACCENT_CSS}`,
                                        bgcolor: 'var(--color-card-bg)',
                                        color: 'var(--color-text-on-light)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: 320,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                        <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                            {k.keyword}
                                        </MsqdxTypography>
                                        <MsqdxIconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteKeyword(k.id)}
                                            aria-label={t('projects.deleteKeyword')}
                                            sx={{
                                                flexShrink: 0,
                                                color: 'var(--color-status-error)',
                                                borderColor: 'var(--color-status-error)',
                                                '&:hover': {
                                                    backgroundColor: 'var(--color-status-error)',
                                                    color: '#fff',
                                                    borderColor: 'var(--color-status-error)',
                                                },
                                                '& svg': { color: 'inherit' },
                                            }}
                                        >
                                            <Trash2 size={16} strokeWidth={2} />
                                        </MsqdxIconButton>
                                    </Box>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
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
                                    <Box sx={{ mb: 1.5 }}>
                                        <MsqdxButton
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                setSerpPreviewKeyword(k);
                                                setSerpPreviewOpen(true);
                                            }}
                                        >
                                            {t('projects.viewSerpPreview')}
                                        </MsqdxButton>
                                    </Box>
                                    {k.lastSerpLeaderDomain && (
                                        <Box sx={{ mb: 1.5 }}>
                                            {k.lastPosition === 1 && normalizeRankDomain(k.domain) === normalizeRankDomain(k.lastSerpLeaderDomain) ? (
                                                <MsqdxChip
                                                    label={t('projects.serpLeaderYou')}
                                                    size="small"
                                                    color="success"
                                                    variant="filled"
                                                    sx={{ maxWidth: '100%' }}
                                                />
                                            ) : (
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                    {t('projects.serpLeader')}:{' '}
                                                    {k.lastSerpLeaderUrl ? (
                                                        <Box
                                                            component="a"
                                                            href={k.lastSerpLeaderUrl.startsWith('http') ? k.lastSerpLeaderUrl : `https://${k.lastSerpLeaderUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            sx={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}
                                                        >
                                                            {k.lastSerpLeaderDomain}
                                                        </Box>
                                                    ) : (
                                                        <Box component="span" sx={{ fontWeight: 600 }}>
                                                            {k.lastSerpLeaderDomain}
                                                        </Box>
                                                    )}
                                                </MsqdxTypography>
                                            )}
                                        </Box>
                                    )}
                                    <Box sx={{ flex: 1, minHeight: 200, width: '100%' }}>
                                        <RankTrackingChart
                                            keywordId={k.id}
                                            keywordLabel={k.keyword}
                                            ourDomain={k.domain}
                                            competitorDomains={competitors}
                                            t={t}
                                        />
                                    </Box>
                                </MsqdxCard>
                            ))}
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            </Stack>

            <SerpGooglePreviewModal
                open={serpPreviewOpen}
                onClose={() => {
                    setSerpPreviewOpen(false);
                    setSerpPreviewKeyword(null);
                }}
                keywordId={serpPreviewKeyword?.id ?? null}
                ourDomain={serpPreviewKeyword?.domain ?? project.domain ?? ''}
                competitorDomains={competitors}
                projectId={id}
            />

            <Dialog open={addKeywordOpen} onClose={() => setAddKeywordOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 'var(--msqdx-spacing-md, 8px)' } }}>
                <DialogTitle sx={{ fontWeight: 600 }}>{t('projects.addKeyword')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320, pt: 0.5 }}>
                        {trackDomain ? (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {t('projects.rankTrackingDomainHint').replace('{{domain}}', trackDomain)}
                                {project?.name ? ` · ${project.name}` : ''}
                            </MsqdxTypography>
                        ) : (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-status-error)' }}>
                                {t('projects.domainRequiredForRankings')}
                            </MsqdxTypography>
                        )}
                        <MsqdxFormField
                            label={t('projects.intentLabel')}
                            placeholder={t('projects.intentLabelPlaceholder')}
                            value={addIntentLabel}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddIntentLabel(e.target.value)}
                            fullWidth
                        />
                        <MsqdxFormField
                            label={t('projects.keyword')}
                            placeholder={t('projects.keywordPlaceholder')}
                            value={addKeywordKeyword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddKeywordKeyword(e.target.value)}
                            fullWidth
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <input
                                type="checkbox"
                                id="add-keyword-multi-market"
                                checked={addKeywordMultiMarket}
                                onChange={(e) => setAddKeywordMultiMarket(e.target.checked)}
                            />
                            <Box component="label" htmlFor="add-keyword-multi-market" sx={{ cursor: 'pointer' }}>
                                <MsqdxTypography variant="body2">{t('projects.compareAcrossMarkets')}</MsqdxTypography>
                            </Box>
                        </Box>
                        {addKeywordMultiMarket ? (
                            <SerpMarketSelect
                                label={t('projects.marketsCompare')}
                                multiple
                                selectedKeys={addKeywordMarkets}
                                onSelectedKeysChange={setAddKeywordMarkets}
                            />
                        ) : (
                            <SerpMarketSelect
                                label={t('projects.market')}
                                value={addKeywordMarket}
                                onChange={setAddKeywordMarket}
                                required
                                placeholder={t('projects.marketPlaceholder')}
                            />
                        )}
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
                        onClick={handleAddKeyword}
                        disabled={
                            !trackDomain ||
                            !addKeywordKeyword.trim() ||
                            (addKeywordMultiMarket ? addKeywordMarkets.length === 0 : !addKeywordMarket) ||
                            addKeywordSubmitting
                        }
                        sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                    >
                        {addKeywordSubmitting ? t('projects.creating') : t('projects.save')}
                    </MsqdxButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
