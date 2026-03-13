'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Box, MenuItem, Select, FormControl, InputLabel, Dialog, DialogTitle, DialogContent } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxFormField,
    MsqdxChip,
} from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiProject,
    apiScanGeoEeat,
    apiScanGeoEeatCreate,
    apiScanGeoEeatHistory,
    pathGeoEeat,
} from '@/lib/constants';
import { buildPositionMatrix, extractHostname } from '@/components/CompetitivePositionDiagram';
import { GeoQuestionCard } from '@/components/GeoQuestionCard';
import type { GeoEeatIntensiveResult } from '@/lib/types';

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
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [runPayload, setRunPayload] = useState<GeoEeatIntensiveResult | null>(null);
    const [runPayloadLoading, setRunPayloadLoading] = useState(false);
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
                if (runs.length > 0) {
                    setSelectedRunId((prev) => {
                        const stillInList = prev && runs.some((r: { id: string }) => r.id === prev);
                        if (stillInList) return prev;
                        const completed = runs.find((r: { status: string }) => r.status === 'complete');
                        return completed?.id ?? runs[0]?.id ?? null;
                    });
                } else {
                    setSelectedRunId(null);
                }
            })
            .catch(() => setGeoRuns([]));
    }, [id]);

    useEffect(() => {
        if (!selectedRunId) {
            setRunPayload(null);
            return;
        }
        let cancelled = false;
        setRunPayloadLoading(true);
        setRunPayload(null);
        fetch(apiScanGeoEeat(selectedRunId), { credentials: 'same-origin' })
            .then((r) => r.json())
            .then((data: { payload?: GeoEeatIntensiveResult }) => {
                if (!cancelled && data?.payload) setRunPayload(data.payload);
            })
            .catch(() => {
                if (!cancelled) setRunPayload(null);
            })
            .finally(() => {
                if (!cancelled) setRunPayloadLoading(false);
            });
        return () => { cancelled = true; };
    }, [selectedRunId]);

    const geoQueries = Array.isArray(project?.geoQueries) ? project.geoQueries : [];
    const competitiveByModel = runPayload?.competitiveByModel && Object.keys(runPayload.competitiveByModel).length > 0
        ? runPayload.competitiveByModel
        : null;
    const targetUrl = project?.domain ? (project.domain.includes('://') ? project.domain : `https://${project.domain}`) : '';
    const targetDomain = useMemo(() => (targetUrl ? extractHostname(targetUrl) : ''), [targetUrl]);
    const { rows: positionRows, modelIds } = useMemo(() => {
        if (!competitiveByModel || !targetDomain) return { rows: [], modelIds: [] as string[] };
        return buildPositionMatrix(competitiveByModel, targetDomain);
    }, [competitiveByModel, targetDomain]);

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
            {/* Header: Lauf-Auswahl + Aktionen (wie SEO-Seite) */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                {geoRuns.length > 0 && (
                    <FormControl size="small" sx={{ minWidth: 260 }}>
                        <InputLabel id="geo-run-select-label">{t('projects.geoEeatRuns')}</InputLabel>
                        <Select
                            labelId="geo-run-select-label"
                            value={selectedRunId ?? ''}
                            label={t('projects.geoEeatRuns')}
                            onChange={(e) => setSelectedRunId((e.target.value as string) || null)}
                        >
                            {geoRuns.map((g) => (
                                <MenuItem key={g.id} value={g.id}>
                                    {new Date(g.createdAt).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · {g.status}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
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

            {/* Inhalt: nur Frage-Cards (wie Keywords auf SEO-Seite) */}
            {runPayloadLoading && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('common.loading')}
                    </MsqdxTypography>
                </Box>
            )}

            {!runPayloadLoading && positionRows.length > 0 && modelIds.length > 0 && (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)' },
                        gap: 2,
                    }}
                >
                    {positionRows.map((row) => (
                        <GeoQuestionCard key={row.queryIndex} row={row} modelIds={modelIds} t={t} />
                    ))}
                </Box>
            )}

            {!runPayloadLoading && positionRows.length === 0 && geoRuns.length > 0 && selectedRunId && (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                        {t('geoEeat.noResultsDisplay')}
                    </MsqdxTypography>
                    <Link href={pathGeoEeat(selectedRunId)} style={{ textDecoration: 'none' }}>
                        <MsqdxButton variant="outlined" size="small">
                            {t('projects.open')}
                        </MsqdxButton>
                    </Link>
                </Box>
            )}

            {!runPayloadLoading && geoRuns.length === 0 && project?.domain && (
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
        </Box>
    );
}
