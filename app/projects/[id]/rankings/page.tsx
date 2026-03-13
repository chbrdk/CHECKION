'use client';

import { useCallback, useEffect, useState } from 'react';
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
import Link from 'next/link';
import {
    apiProject,
    apiProjectRankingSummary,
    apiRankTrackingKeywords,
    apiRankTrackingKeyword,
    apiRankTrackingRefresh,
    API_RANK_TRACKING_KEYWORDS,
    pathProject,
} from '@/lib/constants';
import { SERP_MAIN_MARKETS } from '@/lib/serp-markets';
import { RankTrackingChart } from '@/components/RankTrackingChart';

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
    const [addKeywordDomain, setAddKeywordDomain] = useState('');
    const [addKeywordKeyword, setAddKeywordKeyword] = useState('');
    const [addKeywordMarket, setAddKeywordMarket] = useState('');
    const [addKeywordDevice, setAddKeywordDevice] = useState('');
    const [addKeywordSubmitting, setAddKeywordSubmitting] = useState(false);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [refreshError, setRefreshError] = useState<string | null>(null);
    const [suggestKeywordsLoading, setSuggestKeywordsLoading] = useState(false);
    const [suggestKeywordsError, setSuggestKeywordsError] = useState<string | null>(null);
    const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
    const [selectedSuggestedKeywords, setSelectedSuggestedKeywords] = useState<Set<string>>(new Set());
    const [rankingSummary, setRankingSummary] = useState<RankingSummaryData | null>(null);

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
                loadKeywords();
                loadRankingSummary();
            }
        } finally {
            setAddKeywordSubmitting(false);
        }
    }, [id, addKeywordDomain, addKeywordKeyword, addKeywordMarket, addKeywordDevice, loadProject, loadKeywords, loadRankingSummary]);

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
        loadKeywords();
        loadRankingSummary();
    }, [id, project?.domain, selectedSuggestedKeywords, loadProject, loadKeywords, loadRankingSummary]);

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
        <Box sx={{ p: 'var(--msqdx-spacing-md)', width: '100%', maxWidth: '100%' }}>
            <Stack sx={{ gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Link href={pathProject(id)} style={{ textDecoration: 'none' }}>
                        <MsqdxButton variant="outlined" size="small">
                            ← {project.name}
                        </MsqdxButton>
                    </Link>
                </Box>

                {/* Score card: our score + competitor scores */}
                <MsqdxMoleculeCard
                    title={t('projects.rankingScore')}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'baseline' }}>
                        <Box>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                {t('projects.ourScore')}
                            </MsqdxTypography>
                            <MsqdxTypography variant="h4" weight="bold">
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
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
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
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                                gap: 2,
                            }}
                        >
                            {rankKeywords.map((k) => (
                                <MsqdxCard
                                    key={k.id}
                                    variant="flat"
                                    borderRadius="button"
                                    sx={{
                                        p: 'var(--msqdx-spacing-md)',
                                        border: '1px solid var(--color-border-subtle, #eee)',
                                        bgcolor: 'var(--color-card-bg)',
                                        color: 'var(--color-text-on-light)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: 320,
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                        <MsqdxTypography variant="subtitle2" weight="semibold" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                                            {k.domain} — {k.keyword}
                                        </MsqdxTypography>
                                        <MsqdxIconButton
                                            size="xs"
                                            color="error"
                                            onClick={() => handleDeleteKeyword(k.id)}
                                            aria-label={t('projects.deleteKeyword')}
                                            sx={{ flexShrink: 0 }}
                                        >
                                            <Trash2 size={14} />
                                        </MsqdxIconButton>
                                    </Box>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1.5 }}>
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
                                    <Box sx={{ flex: 1, minHeight: 200, width: '100%' }}>
                                        <RankTrackingChart
                                            keywordId={k.id}
                                            keywordLabel={`${k.domain} — ${k.keyword}`}
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
