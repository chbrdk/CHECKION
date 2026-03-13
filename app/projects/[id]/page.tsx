'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxMoleculeCard,
    MsqdxCard,
    MsqdxFormField,
    MsqdxChip,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiProjectSuggestCompetitors,
    apiProjectRankingSummary,
    apiProjectGeoSummary,
    pathGeoEeat,
    pathProjectRankings,
    pathProjectGeo,
    pathProjectResearch,
} from '@/lib/constants';
import Link from 'next/link';

interface ProjectData {
    id: string;
    name: string;
    domain: string | null;
    valueProposition?: string | null;
    competitors?: string[];
    geoQueries?: string[];
    counts: { domainScans: number; journeyRuns: number; geoEeatRuns: number; singleScans: number; rankTrackingKeywords: number };
}

interface RankingSummaryData {
    score: number | null;
    keywordCount: number;
    lastUpdated: string | null;
}

interface GeoSummaryData {
    score: number | null;
    runs: Array<{ id: string; url: string; status: string; createdAt: string }>;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<ProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [rankingSummary, setRankingSummary] = useState<RankingSummaryData | null>(null);
    const [geoSummary, setGeoSummary] = useState<GeoSummaryData | null>(null);
    const [listsLoading, setListsLoading] = useState(false);
    const [addCompetitorValue, setAddCompetitorValue] = useState('');
    const [suggestCompetitorsLoading, setSuggestCompetitorsLoading] = useState(false);
    const [suggestCompetitorsError, setSuggestCompetitorsError] = useState<string | null>(null);

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

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!id) return;
        setListsLoading(true);
        Promise.all([
            fetch(apiProjectRankingSummary(id), { credentials: 'same-origin' }).then((r) => r.json()),
            fetch(apiProjectGeoSummary(id), { credentials: 'same-origin' }).then((r) => r.json()),
        ])
            .then(([rankSummaryRes, geoSummaryRes]) => {
                if (rankSummaryRes?.success && rankSummaryRes?.data) {
                    setRankingSummary(rankSummaryRes.data as RankingSummaryData);
                } else {
                    setRankingSummary(null);
                }
                if (geoSummaryRes?.success && geoSummaryRes?.data) {
                    setGeoSummary(geoSummaryRes.data as GeoSummaryData);
                } else {
                    setGeoSummary(null);
                }
            })
            .catch(() => {
                setRankingSummary(null);
                setGeoSummary(null);
            })
            .finally(() => setListsLoading(false));
    }, [id]);

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
        <Box sx={{ p: 'var(--msqdx-spacing-md)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 320px) 1fr' }, gap: 2, alignItems: 'start' }}>
                {/* Left column: Company info + Competitors */}
                <Stack sx={{ gap: 2 }}>
                    <MsqdxCard
                        variant="flat"
                        borderRadius="button"
                        sx={{
                            p: 'var(--msqdx-spacing-md)',
                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            bgcolor: 'var(--color-card-bg)',
                            color: 'var(--color-text-on-light)',
                            minHeight: 254,
                        }}
                    >
                        <MsqdxTypography component="h1" variant="h4" weight="bold" sx={{ mb: 0.5 }}>
                            {project.name}
                        </MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                            {t('projects.companyInfo')}
                        </MsqdxTypography>
                        {project.domain && (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1 }}>
                                {project.domain}
                            </MsqdxTypography>
                        )}
                        {project.valueProposition && (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                                {project.valueProposition}
                            </MsqdxTypography>
                        )}
                        <Link href={id ? pathProjectResearch(id) : '#'} style={{ textDecoration: 'none' }}>
                            <MsqdxButton variant="outlined" size="small">
                                {t('projects.researchStart')}
                            </MsqdxButton>
                        </Link>
                    </MsqdxCard>

                    <MsqdxMoleculeCard
                        title={t('projects.competitors')}
                        variant="flat"
                        borderRadius="lg"
                        footerDivider={false}
                        sx={{ bgcolor: 'var(--color-card-bg)' }}
                    >
                        {competitors.length === 0 ? (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 1.5 }}>
                                {t('projects.noCompetitors')}
                            </MsqdxTypography>
                        ) : (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
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
                        {suggestCompetitorsError && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mb: 1 }}>
                                {suggestCompetitorsError}
                            </MsqdxTypography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            <MsqdxFormField
                                label={t('projects.competitorDomain')}
                                placeholder={t('projects.addCompetitorPlaceholder')}
                                value={addCompetitorValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddCompetitorValue(e.target.value)}
                                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddCompetitor()}
                                sx={{
                                    margin: 0,
                                    flex: 1,
                                    minWidth: 0,
                                    '& .MuiFormControl-root': { margin: 0, minHeight: 0 },
                                    '& .MuiInputBase-root': { minHeight: 40, maxHeight: 40, height: 40 },
                                    '& .MuiInputBase-input': { py: 0.5, height: 40, boxSizing: 'border-box' },
                                }}
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
                    </MsqdxMoleculeCard>
                </Stack>

                {/* Right column: 2-column grid (Ranking-Score | GEO) */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'stretch' }}>
                        {/* Ranking summary card – actions = button unten (DS-Variante) */}
                        <MsqdxMoleculeCard
                            title={t('projects.rankingScore')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider
                            actions={
                                id ? (
                                    <Link href={pathProjectRankings(id)} style={{ textDecoration: 'none' }}>
                                        <MsqdxButton variant="outlined" size="small">
                                            {t('projects.viewAllRankings')}
                                        </MsqdxButton>
                                    </Link>
                                ) : null
                            }
                            sx={{ bgcolor: 'var(--color-card-bg)' }}
                        >
                            {listsLoading ? (
                                <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                            ) : (
                                <>
                                    <MsqdxTypography variant="h4" weight="bold" sx={{ mb: 0.5 }}>
                                        {rankingSummary?.score != null ? `${rankingSummary.score}/100` : '—'}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {rankingSummary ? t('projects.keywordCount', { count: rankingSummary.keywordCount }) : ''}
                                        {rankingSummary?.lastUpdated ? ` · ${t('projects.lastUpdate')}: ${new Date(rankingSummary.lastUpdated).toLocaleDateString()}` : ''}
                                    </MsqdxTypography>
                                </>
                            )}
                        </MsqdxMoleculeCard>

                        {/* GEO summary card – actions = button unten (DS-Variante) */}
                        <MsqdxMoleculeCard
                            title={t('projects.geoScore')}
                            variant="flat"
                            borderRadius="lg"
                            footerDivider
                            actions={
                                id ? (
                                    <Link href={pathProjectGeo(id)} style={{ textDecoration: 'none' }}>
                                        <MsqdxButton variant="outlined" size="small">
                                            {t('projects.viewGeo')}
                                        </MsqdxButton>
                                    </Link>
                                ) : null
                            }
                            sx={{ bgcolor: 'var(--color-card-bg)' }}
                        >
                            {listsLoading ? (
                                <MsqdxTypography variant="body2" sx={{ py: 1 }}>{t('common.loading')}</MsqdxTypography>
                            ) : (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                                        <MsqdxTypography variant="h4" weight="bold">
                                            {geoSummary?.score != null ? `${geoSummary.score}/100` : '—'}
                                        </MsqdxTypography>
                                    </Box>
                                    {geoSummary?.runs && geoSummary.runs.length > 0 && (
                                        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                            {geoSummary.runs.slice(0, 5).map((g) => (
                                                <Box key={g.id} component="li" sx={listItemSx}>
                                                    <MsqdxTypography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                                                        {new Date(g.createdAt).toLocaleDateString()} · {g.status}
                                                    </MsqdxTypography>
                                                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push(pathGeoEeat(g.id))}>
                                                        {t('projects.open')}
                                                    </MsqdxButton>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </>
                            )}
                        </MsqdxMoleculeCard>
                </Box>
            </Box>
        </Box>
    );
}
