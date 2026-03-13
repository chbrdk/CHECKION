'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, Dialog, DialogTitle, DialogContent, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxFormField,
    MsqdxChip,
    MsqdxMoleculeCard,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiProjectGeoSummary,
    apiScanGeoEeatCreate,
    apiScanGeoEeatHistory,
    apiProjectGeoQuestionHistory,
    pathGeoEeat,
} from '@/lib/constants';
import { GeoQuestionCard } from '@/components/GeoQuestionCard';
import type { GeoQuestionHistoryPoint } from '@/components/GeoQuestionCard';

interface GeoQuestionHistoryItem {
    queryText: string;
    queryIndex: number;
    points: GeoQuestionHistoryPoint[];
}

export default function ProjectGeoPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
    const [project, setProject] = useState<{
        id: string;
        name: string;
        domain: string | null;
        competitors?: string[];
        geoQueries?: string[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [geoRuns, setGeoRuns] = useState<Array<{ id: string; url: string; status: string; createdAt: string }>>([]);
    const [questionHistory, setQuestionHistory] = useState<GeoQuestionHistoryItem[]>([]);
    const [targetDomain, setTargetDomain] = useState('');
    const [competitorDomains, setCompetitorDomains] = useState<string[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [geoSummary, setGeoSummary] = useState<{ score: number | null; competitorScores: Record<string, number> }>({ score: null, competitorScores: {} });
    const [addGeoQueryValue, setAddGeoQueryValue] = useState('');
    const [suggestGeoQueriesLoading, setSuggestGeoQueriesLoading] = useState(false);
    const [suggestGeoQueriesError, setSuggestGeoQueriesError] = useState<string | null>(null);
    const [geoStartLoading, setGeoStartLoading] = useState(false);
    const [geoStartError, setGeoStartError] = useState<string | null>(null);
    const [manageQueriesOpen, setManageQueriesOpen] = useState(false);

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

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    useEffect(() => {
        if (!id) return;
        fetch(apiScanGeoEeatHistory({ limit: 100, projectId: id }), { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data) => {
                const runs = Array.isArray(data?.runs) ? data.runs : Array.isArray(data?.data) ? data.data : [];
                setGeoRuns(runs);
            })
            .catch(() => setGeoRuns([]));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        fetch(apiProjectGeoSummary(id), { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data: { success?: boolean; data?: { score?: number | null; competitorScores?: Record<string, number> } }) => {
                if (data?.success && data?.data) {
                    setGeoSummary({
                        score: data.data.score ?? null,
                        competitorScores: data.data.competitorScores ?? {},
                    });
                }
            })
            .catch(() => setGeoSummary({ score: null, competitorScores: {} }));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setHistoryLoading(true);
        setQuestionHistory([]);
        fetch(apiProjectGeoQuestionHistory(id, 90), { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data: { success?: boolean; questions?: GeoQuestionHistoryItem[]; targetDomain?: string; competitorDomains?: string[] }) => {
                if (!cancelled && data?.success) {
                    if (Array.isArray(data.questions)) setQuestionHistory(data.questions);
                    setTargetDomain(typeof data.targetDomain === 'string' ? data.targetDomain : '');
                    setCompetitorDomains(Array.isArray(data.competitorDomains) ? data.competitorDomains : []);
                }
            })
            .catch(() => {
                if (!cancelled) setQuestionHistory([]);
            })
            .finally(() => {
                if (!cancelled) setHistoryLoading(false);
            });
        return () => { cancelled = true; };
    }, [id]);

    const geoQueries = Array.isArray(project?.geoQueries) ? project.geoQueries : [];

    const allModelIds = useMemo(() => {
        const set = new Set<string>();
        for (const q of questionHistory) {
            for (const p of q.points) {
                for (const k of Object.keys(p.positionsByModel)) set.add(k);
            }
        }
        return Array.from(set);
    }, [questionHistory]);

    const effectiveModelId = selectedModelId && allModelIds.includes(selectedModelId)
        ? selectedModelId
        : (allModelIds[0] ?? null);

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
            const res = await fetch(`/api/projects/${id}/suggest-competitors`, {
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

    const handleStartGeoEeat = useCallback(async () => {
        if (!project?.id || !project.domain) return;
        setGeoStartError(null);
        setGeoStartLoading(true);
        try {
            const url = project.domain.includes('://') ? project.domain : `https://${project.domain}`;
            const comps = Array.isArray(project.competitors) ? project.competitors : [];
            const queries = Array.isArray(project.geoQueries) ? project.geoQueries : [];
            const runCompetitive = comps.length > 0 || queries.length > 0;
            const body: { url: string; projectId: string; runCompetitive?: boolean; competitors?: string[]; queries?: string[] } = {
                url,
                projectId: project.id,
            };
            if (runCompetitive) {
                body.runCompetitive = true;
                if (comps.length > 0) body.competitors = comps;
                if (queries.length > 0) body.queries = queries;
            }
            const res = await fetch(apiScanGeoEeatCreate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                credentials: 'same-origin',
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setGeoStartError(data.error ?? t('common.error'));
                return;
            }
            const jobId = data.jobId as string;
            if (jobId) router.push(pathGeoEeat(jobId));
        } catch (e) {
            setGeoStartError(e instanceof Error ? e.message : t('common.error'));
        } finally {
            setGeoStartLoading(false);
        }
    }, [project?.id, project?.domain, project?.competitors, project?.geoQueries, router, t]);

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
                {/* Score-Karte: Unser GEO-Score + Competitor-Scores (wie SEO-Seite) */}
                <MsqdxMoleculeCard
                    title={t('projects.geoScore')}
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
                                        geoSummary.score != null
                                            ? geoSummary.score >= 70
                                                ? 'var(--color-status-success)'
                                                : geoSummary.score >= 40
                                                  ? 'var(--color-status-warning)'
                                                  : 'var(--color-status-error)'
                                            : undefined,
                                }}
                            >
                                {geoSummary.score != null ? `${geoSummary.score}/100` : '—'}
                            </MsqdxTypography>
                        </Box>
                        {geoSummary.competitorScores && Object.keys(geoSummary.competitorScores).length > 0 &&
                            Object.entries(geoSummary.competitorScores).map(([domain, score]) => (
                                <Box key={domain}>
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                        {domain}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="h4" weight="bold" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {score}/100
                                    </MsqdxTypography>
                                </Box>
                            ))}
                    </Box>
                </MsqdxMoleculeCard>

                {/* Header: Aktionen (wie SEO-Seite) */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
                <MsqdxButton
                    variant="contained"
                    brandColor="green"
                    size="small"
                    onClick={handleStartGeoEeat}
                    disabled={!project.domain || geoStartLoading}
                >
                    {geoStartLoading ? t('common.loading') : geoRuns.length === 0 ? t('projects.startGeoEeat') : t('projects.startNewGeoEeat')}
                </MsqdxButton>
                <MsqdxButton variant="outlined" size="small" onClick={() => setManageQueriesOpen(true)}>
                    {t('projects.geoQueries')}
                </MsqdxButton>
                {geoStartError && (
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)' }}>
                        {geoStartError}
                    </MsqdxTypography>
                )}
            </Box>

            {/* Zentrale Modell-Auswahl (gilt für alle Karten) */}
            {!historyLoading && questionHistory.length > 0 && allModelIds.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 2 }}>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mr: 1 }}>
                        {t('geoEeat.competitiveModelLabel', { model: '' }).replace(': ', '')}:
                    </MsqdxTypography>
                    {allModelIds.map((modelId) => (
                        <MsqdxChip
                            key={modelId}
                            label={modelId}
                            variant={effectiveModelId === modelId ? 'filled' : 'outlined'}
                            size="small"
                            onClick={() => setSelectedModelId(modelId)}
                            sx={{ cursor: 'pointer', fontSize: 11 }}
                        />
                    ))}
                </Box>
            )}

            {/* Inhalt: Frage-Cards mit Verlauf über alle Analysen (wie SEO Keywords mit Chart) */}
            {historyLoading && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('common.loading')}
                    </MsqdxTypography>
                </Box>
            )}

            {!historyLoading && questionHistory.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)' },
                        gap: 2,
                    }}
                >
                    {questionHistory.map((q, idx) => (
                        <GeoQuestionCard
                            key={q.queryText || `q-${q.queryIndex}-${idx}`}
                            queryText={q.queryText}
                            queryIndex={q.queryIndex}
                            points={q.points}
                            targetDomain={targetDomain}
                            competitorDomains={competitorDomains}
                            selectedModelId={effectiveModelId}
                            t={t}
                        />
                    ))}
                </Box>
            )}

            {!historyLoading && questionHistory.length === 0 && geoRuns.length > 0 && project?.domain && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                        {t('geoEeat.noResultsDisplay')}
                    </MsqdxTypography>
                    <Link href={pathGeoEeat(geoRuns[0]!.id)} style={{ textDecoration: 'none' }}>
                        <MsqdxButton variant="outlined" size="small">
                            {t('projects.open')}
                        </MsqdxButton>
                    </Link>
                </Box>
            )}

            {!historyLoading && questionHistory.length === 0 && geoRuns.length === 0 && project?.domain && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                        {t('projects.emptyGeoEeatRuns')}
                    </MsqdxTypography>
                    <MsqdxButton
                        variant="contained"
                        brandColor="green"
                        size="small"
                        onClick={handleStartGeoEeat}
                        disabled={!project.domain || geoStartLoading}
                    >
                        {geoStartLoading ? t('common.loading') : t('projects.startGeoEeat')}
                    </MsqdxButton>
                </Box>
            )}

            {/* Dialog: Fragen verwalten (Frage hinzufügen, Mit KI vorschlagen, Chips) */}
            <Dialog open={manageQueriesOpen} onClose={() => setManageQueriesOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('projects.geoQueries')}</DialogTitle>
                <DialogContent>
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
                </DialogContent>
            </Dialog>
            </Stack>
        </Box>
    );
}
