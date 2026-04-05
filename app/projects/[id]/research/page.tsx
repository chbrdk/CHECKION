'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, Stack } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { MSQDX_BUTTON_THEME_ACCENT_SX } from '@/lib/theme-accent';
import { apiProject, apiProjectResearch, API_RANK_TRACKING_KEYWORDS } from '@/lib/constants';
import { SERP_MAIN_MARKETS } from '@/lib/serp-markets';
import { ProjectResearchResultForm } from '@/components/ProjectResearchResultForm';
import type { ProjectResearchResult } from '@/lib/research/schema';

export default function ProjectResearchPage() {
    const params = useParams();
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

    useEffect(() => {
        loadProject();
    }, [loadProject]);

    const competitors = Array.isArray(project?.competitors) ? project.competitors : [];
    const geoQueries = Array.isArray(project?.geoQueries) ? project.geoQueries : [];

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
    }, [id, project?.domain, selectedResearchKeywords, loadProject]);

    const handleToggleResearchKeyword = useCallback((kw: string) => {
        setSelectedResearchKeywords((prev) => {
            const next = new Set(prev);
            if (next.has(kw)) next.delete(kw);
            else next.add(kw);
            return next;
        });
    }, []);

    const handleResearchValuePropositionChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setResearchResult((prev) => (prev ? { ...prev, valueProposition: e.target.value } : prev));
        },
        []
    );

    const handleSaveValueProposition = useCallback(async () => {
        if (!id || !researchResult) return;
        const value = researchResult.valueProposition ?? '';
        try {
            const res = await fetch(apiProject(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ valueProposition: value || null }),
            });
            if (res.ok) loadProject();
        } catch {
            // ignore
        }
    }, [id, researchResult?.valueProposition, loadProject]);

    const projectResearchResultFormProps =
        researchResult
            ? {
                  researchResult,
                  addTargetGroup: researchAddTargetGroup,
                  addKeyword: researchAddKeyword,
                  addGeoQuery: researchAddGeoQuery,
                  addCompetitor: researchAddCompetitor,
                  selectedKeywords: selectedResearchKeywords,
                  onAddTargetGroupChange: (e: React.ChangeEvent<HTMLInputElement>) => setResearchAddTargetGroup(e.target.value),
                  onValuePropositionChange: handleResearchValuePropositionChange,
                  onAddKeywordChange: (e: React.ChangeEvent<HTMLInputElement>) => setResearchAddKeyword(e.target.value),
                  onAddGeoQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => setResearchAddGeoQuery(e.target.value),
                  onAddCompetitorChange: (e: React.ChangeEvent<HTMLInputElement>) => setResearchAddCompetitor(e.target.value),
                  onAddTargetGroupClick: () => {
                      updateResearchArray('targetGroups', researchAddTargetGroup);
                      setResearchAddTargetGroup('');
                  },
                  onAddKeywordClick: () => {
                      updateResearchArray('seoKeywords', researchAddKeyword);
                      setResearchAddKeyword('');
                  },
                  onAddGeoQueryClick: () => {
                      updateResearchArray('geoQueries', researchAddGeoQuery);
                      setResearchAddGeoQuery('');
                  },
                  onAddCompetitorClick: () => {
                      updateResearchArray('competitors', researchAddCompetitor);
                      setResearchAddCompetitor('');
                  },
                  onRemoveTargetGroup: (item: string) => updateResearchArray('targetGroups', null, item),
                  onRemoveGeoQuery: (q: string) => updateResearchArray('geoQueries', null, q),
                  onRemoveCompetitor: (c: string) => updateResearchArray('competitors', null, c),
                  onToggleKeyword: handleToggleResearchKeyword,
                  onApplyKeywords: handleApplyResearchKeywords,
                  onApplyGeoQueries: handleApplyResearchGeoQueries,
                  onApplyCompetitors: handleApplyResearchCompetitors,
                  t,
              }
            : null;

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
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto' }}>
            <Stack sx={{ gap: 2 }}>
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
                        size="small"
                        onClick={handleRunResearch}
                        disabled={researchLoading || !project.domain}
                        sx={MSQDX_BUTTON_THEME_ACCENT_SX}
                    >
                        {researchLoading ? t('common.loading') : t('projects.researchStart')}
                    </MsqdxButton>
                    {researchError ? (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-status-error)', display: 'block', mt: 1 }}>
                            {researchError}
                        </MsqdxTypography>
                    ) : null}
                    {!researchResult && !researchLoading ? (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 2 }}>
                            {t('projects.researchEmpty')}
                        </MsqdxTypography>
                    ) : null}
                    {projectResearchResultFormProps != null ? (
                        <Box sx={{ mt: 2 }}>
                            {researchResult?.valueProposition != null && (
                                <MsqdxButton variant="outlined" size="small" onClick={handleSaveValueProposition} sx={{ mb: 1 }}>
                                    {t('projects.saveValueProposition')}
                                </MsqdxButton>
                            )}
                            <ProjectResearchResultForm {...projectResearchResultFormProps} />
                        </Box>
                    ) : null}
                </MsqdxMoleculeCard>
            </Stack>
        </Box>
    );
}
