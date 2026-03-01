'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard, MsqdxChip, MsqdxAccordion, MsqdxAccordionItem, MsqdxTooltip, MsqdxTabs } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    apiScanGeoEeat,
    apiScanGeoEeatRerunCompetitive,
    apiScanGeoEeatCompetitiveHistory,
    apiScanGeoEeatCompetitiveRun,
    PATH_SCAN,
} from '@/lib/constants';
import { SharePanel } from '@/components/SharePanel';
import { CompetitivePositionDiagram } from '@/components/CompetitivePositionDiagram';
import type { GeoEeatIntensiveResult, GeoEeatPageResult, CompetitiveBenchmarkResult } from '@/lib/types';

const POLL_INTERVAL_MS = 2500;

interface CompetitiveHistoryRun {
    id: string;
    started_at: string;
    completed_at: string | null;
    status: string;
    queryCount: number;
    competitorCount: number;
    modelCount?: number;
}

export default function GeoEeatResultPage() {
    const params = useParams();
    const { t } = useI18n();
    const rawJobId = params?.jobId;
    const jobId = typeof rawJobId === 'string' ? rawJobId : Array.isArray(rawJobId) ? rawJobId[0] : undefined;

    const [status, setStatus] = useState<'loading' | 'running' | 'complete' | 'error'>('loading');
    const [payload, setPayload] = useState<GeoEeatIntensiveResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState<string>('');
    const [competitiveModelIndex, setCompetitiveModelIndex] = useState(0);
    const [rerunLoading, setRerunLoading] = useState(false);
    const [competitiveHistory, setCompetitiveHistory] = useState<CompetitiveHistoryRun[]>([]);
    const [selectedCompetitiveRunId, setSelectedCompetitiveRunId] = useState<string | null>(null);
    const [historyCompetitiveByModel, setHistoryCompetitiveByModel] = useState<Record<string, CompetitiveBenchmarkResult> | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (!jobId) return;
        const id = jobId;

        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        async function fetchRun() {
            try {
                const res = await fetch(apiScanGeoEeat(id));
                if (!res.ok) {
                    if (!cancelled) {
                        if (res.status === 404) setError(t('geoEeat.runNotFound'));
                        else setError(t('geoEeat.failedToLoadRun'));
                        setStatus('error');
                    }
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                setUrl(data.url ?? '');
                const nextStatus = data.status === 'queued' ? 'running' : data.status;
                setStatus(nextStatus);
                if (data.payload) setPayload(data.payload);
                if (data.error) setError(data.error);
                if (nextStatus === 'complete' || nextStatus === 'error') {
                    if (intervalId) clearInterval(intervalId);
                }
            } catch {
                if (!cancelled) {
                    setError(t('geoEeat.networkError'));
                    setStatus('error');
                    if (intervalId) clearInterval(intervalId);
                }
            }
        }

        fetchRun();
        intervalId = setInterval(fetchRun, POLL_INTERVAL_MS);

        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [jobId, t]);

    const sourceByModel =
        selectedCompetitiveRunId != null ? historyCompetitiveByModel : payload?.competitiveByModel;
    const hasMultiModelFromSource = sourceByModel && Object.keys(sourceByModel).length > 0;
    const competitiveModelsFromSource = hasMultiModelFromSource ? Object.keys(sourceByModel!) : [];

    useEffect(() => {
        if (hasMultiModelFromSource && competitiveModelsFromSource.length > 0 && competitiveModelIndex >= competitiveModelsFromSource.length) {
            setCompetitiveModelIndex(competitiveModelsFromSource.length - 1);
        }
    }, [hasMultiModelFromSource, competitiveModelsFromSource.length, competitiveModelIndex]);

    useEffect(() => {
        if (!jobId || status !== 'complete') return;
        const hasCompetitiveData =
            (payload?.competitiveByModel && Object.keys(payload.competitiveByModel).length > 0) ||
            !!payload?.competitive?.metrics?.length;
        if (!hasCompetitiveData) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(apiScanGeoEeatCompetitiveHistory(jobId, 20));
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setCompetitiveHistory(data.runs ?? []);
            } catch {
                if (!cancelled) setCompetitiveHistory([]);
            }
        })();
        return () => { cancelled = true; };
    }, [jobId, status, payload?.competitiveByModel, payload?.competitive?.metrics?.length]);

    useEffect(() => {
        if (!jobId || selectedCompetitiveRunId == null) {
            setHistoryCompetitiveByModel(null);
            return;
        }
        setHistoryLoading(true);
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(apiScanGeoEeatCompetitiveRun(jobId, selectedCompetitiveRunId));
                if (!res.ok || cancelled) {
                    if (!cancelled) setHistoryCompetitiveByModel(null);
                    return;
                }
                const data = await res.json();
                if (cancelled) return;
                setHistoryCompetitiveByModel(data.competitiveByModel ?? null);
            } catch {
                if (!cancelled) setHistoryCompetitiveByModel(null);
            } finally {
                if (!cancelled) setHistoryLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [jobId, selectedCompetitiveRunId]);

    if (!jobId) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto' }}>
                <MsqdxTypography variant="body1" color="text.secondary">
                    {t('geoEeat.missingJobId')}
                </MsqdxTypography>
                <Link href={PATH_SCAN}>
                    <MsqdxButton variant="text" size="small" sx={{ mt: 1 }}>
                        {t('geoEeat.backToScan')}
                    </MsqdxButton>
                </Link>
            </Box>
        );
    }

    if (status === 'loading' || status === 'running') {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto', textAlign: 'center', py: 6 }}>
                <CircularProgress size={40} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                <MsqdxTypography variant="body1" sx={{ mt: 2, color: 'var(--color-text-muted-on-light)' }}>
                    {t('geoEeat.statusRunning')}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}>
                    {url || jobId}
                </MsqdxTypography>
            </Box>
        );
    }

    if (status === 'error') {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto' }}>
                <MsqdxMoleculeCard
                    title={t('geoEeat.statusError')}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', borderColor: MSQDX_STATUS.error.base }}
                >
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {error || t('geoEeat.unknownError')}
                    </MsqdxTypography>
                    <Box sx={{ mt: 2 }}>
                        <Link href={PATH_SCAN}>
                            <MsqdxButton variant="outlined" size="medium">
                                {t('geoEeat.backToScan')}
                            </MsqdxButton>
                        </Link>
                    </Box>
                </MsqdxMoleculeCard>
            </Box>
        );
    }

    const hasCompetitive = payload?.competitive?.metrics?.length;
    const hasAnyCompetitive = hasCompetitive || (sourceByModel && Object.keys(sourceByModel).length > 0);
    const maxWidth = hasAnyCompetitive ? 1200 : 1000;
    const canRerunCompetitive = hasAnyCompetitive && jobId;

    const handleRerunCompetitive = async () => {
        if (!jobId || rerunLoading) return;
        setRerunLoading(true);
        try {
            const res = await fetch(apiScanGeoEeatRerunCompetitive(jobId), { method: 'POST' });
            if (res.ok) {
                setError(null);
                setStatus('running');
            } else {
                const err = await res.json().catch(() => ({}));
                setError((err as { error?: string })?.error ?? t('geoEeat.rerunCompetitiveError'));
                setStatus('error');
            }
        } catch {
            setError(t('geoEeat.rerunCompetitiveError'));
            setStatus('error');
        } finally {
            setRerunLoading(false);
        }
    };

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700 }}>
                    {t('geoEeat.title')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {canRerunCompetitive && (
                        <MsqdxButton
                            variant="outlined"
                            size="small"
                            onClick={handleRerunCompetitive}
                            disabled={rerunLoading}
                            sx={{ minWidth: rerunLoading ? 140 : undefined }}
                        >
                            {rerunLoading ? (
                                <>
                                    <CircularProgress size={14} sx={{ mr: 0.5, color: 'inherit' }} />
                                    {t('geoEeat.rerunCompetitiveRunning')}
                                </>
                            ) : (
                                t('geoEeat.rerunCompetitiveButton')
                            )}
                        </MsqdxButton>
                    )}
                    <SharePanel resourceType="geo_eeat" resourceId={jobId} />
                    <Link href={PATH_SCAN}>
                        <MsqdxButton variant="text" size="small">
                            {t('geoEeat.backToScan')}
                        </MsqdxButton>
                    </Link>
                </Box>
            </Box>

            {url && (
                <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {url}
                </MsqdxTypography>
            )}

            {payload?.pages && payload.pages.length > 0 && (
                <MsqdxMoleculeCard
                    title={t('geoEeat.onPageTitle')}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', mb: 2 }}
                    borderRadius="lg"
                >
                    {payload.pages.map((page: GeoEeatPageResult, idx: number) => {
                        const tech = page.technical;
                        const gen = tech?.generative;
                        const eeatSignals = tech?.eeatSignals;
                        return (
                            <Box key={idx} sx={{ mb: idx < payload.pages!.length - 1 ? 2 : 0, pb: idx < payload.pages!.length - 1 ? 2 : 0, borderBottom: idx < payload.pages!.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                    {page.title || page.url}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', wordBreak: 'break-all' }}>
                                    {page.url}
                                </MsqdxTypography>

                                {/* Technical (Stufe 1): GEO / Schema / Crawl */}
                                {gen && (
                                    <Box sx={{ mt: 1.5 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>{t('geoEeat.geoAndTech')}</MsqdxTypography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            <MsqdxChip size="small" label={`${t('geoEeat.geoScore')}: ${gen.score}`} />
                                            {gen.technical?.hasLlmsTxt != null && (
                                                <MsqdxChip size="small" label={gen.technical.hasLlmsTxt ? t('geoEeat.hasLlmsTxt') : t('geoEeat.noLlmsTxt')} />
                                            )}
                                            {gen.technical?.hasRobotsAllowingAI != null && (
                                                <MsqdxChip size="small" label={gen.technical.hasRobotsAllowingAI ? t('geoEeat.robotsAiAllowed') : t('geoEeat.robotsAiRestricted')} />
                                            )}
                                            {gen.technical?.schemaCoverage?.length ? (
                                                <MsqdxChip size="small" label={`${t('geoEeat.schemaLabel')}: ${gen.technical.schemaCoverage.slice(0, 3).join(', ')}${gen.technical.schemaCoverage.length > 3 ? '…' : ''}`} />
                                            ) : null}
                                            {gen.content?.faqCount != null && gen.content.faqCount > 0 && (
                                                <MsqdxChip size="small" label={`${t('geoEeat.faqLabel')}: ${gen.content.faqCount}`} />
                                            )}
                                            {gen.content?.citationDensity != null && (
                                                <MsqdxChip size="small" label={`${t('geoEeat.citationsLabel')}: ${typeof gen.content.citationDensity === 'number' ? gen.content.citationDensity.toFixed(1) : gen.content.citationDensity}`} />
                                            )}
                                            {gen.expertise?.hasAuthorBio != null && (
                                                <MsqdxChip size="small" label={gen.expertise.hasAuthorBio ? t('geoEeat.hasAuthorBio') : t('geoEeat.noAuthorBio')} />
                                            )}
                                        </Box>
                                    </Box>
                                )}

                                {/* E-E-A-T Signale (Stufe 1: regelbasiert) */}
                                {(eeatSignals || tech?.hasImpressum != null || tech?.hasPrivacy != null) && (
                                    <Box sx={{ mt: 1 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>{t('geoEeat.eeatSignalsPage')}</MsqdxTypography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {eeatSignals?.hasImpressum != null && <MsqdxChip size="small" label={eeatSignals.hasImpressum ? t('geoEeat.hasImpressum') : t('geoEeat.noImpressum')} sx={eeatSignals.hasImpressum ? { bgcolor: alpha(MSQDX_STATUS.success.base, 0.12), color: MSQDX_STATUS.success.base } : {}} />}
                                            {eeatSignals?.hasContact != null && <MsqdxChip size="small" label={eeatSignals.hasContact ? t('geoEeat.hasContact') : t('geoEeat.noContact')} sx={eeatSignals.hasContact ? { bgcolor: alpha(MSQDX_STATUS.success.base, 0.12), color: MSQDX_STATUS.success.base } : {}} />}
                                            {eeatSignals?.hasAboutLink != null && <MsqdxChip size="small" label={eeatSignals.hasAboutLink ? t('geoEeat.hasAboutLink') : t('geoEeat.noAboutLink')} sx={eeatSignals.hasAboutLink ? { bgcolor: alpha(MSQDX_STATUS.success.base, 0.12), color: MSQDX_STATUS.success.base } : {}} />}
                                            {eeatSignals?.hasTeamLink != null && <MsqdxChip size="small" label={eeatSignals.hasTeamLink ? t('geoEeat.hasTeamLink') : t('geoEeat.noTeamLink')} sx={eeatSignals.hasTeamLink ? { bgcolor: alpha(MSQDX_STATUS.success.base, 0.12), color: MSQDX_STATUS.success.base } : {}} />}
                                            {tech?.hasPrivacy != null && <MsqdxChip size="small" label={tech.hasPrivacy ? t('geoEeat.hasPrivacy') : t('geoEeat.noPrivacy')} sx={tech.hasPrivacy ? { bgcolor: alpha(MSQDX_STATUS.success.base, 0.12), color: MSQDX_STATUS.success.base } : {}} />}
                                        </Box>
                                    </Box>
                                )}

                                {/* LLM: E-E-A-T Bewertung (Stufe 2) */}
                                {page.eeatScores && (
                                    <Box sx={{ mt: 1 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>{t('geoEeat.eeatEvalAi')}</MsqdxTypography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                            {[
                                                { key: 'trust', label: t('geoEeat.trust'), score: page.eeatScores.trust },
                                                { key: 'experience', label: t('geoEeat.experience'), score: page.eeatScores.experience },
                                                { key: 'expertise', label: t('geoEeat.expertise'), score: page.eeatScores.expertise },
                                                ...(page.eeatScores.authoritativeness ? [{ key: 'authoritativeness', label: t('geoEeat.authoritativeness'), score: page.eeatScores.authoritativeness }] : []),
                                            ].map(({ key, label, score }) => (
                                                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <MsqdxTypography variant="caption" sx={{ minWidth: 90 }}>{label}</MsqdxTypography>
                                                    <Box sx={{ flex: 1, maxWidth: 120, height: 8, borderRadius: 1, bgcolor: 'var(--color-border)', overflow: 'hidden', display: 'flex' }}>
                                                        <Box
                                                            sx={{
                                                                width: `${(score.score / 5) * 100}%`,
                                                                height: '100%',
                                                                bgcolor: score.score >= 4 ? MSQDX_STATUS.success.base : score.score >= 3 ? MSQDX_STATUS.warning.base : MSQDX_STATUS.error.base,
                                                                borderRadius: 1,
                                                            }}
                                                        />
                                                    </Box>
                                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>{score.score}/5</MsqdxTypography>
                                                </Box>
                                            ))}
                                        </Box>
                                        {(page.eeatScores.trust.reasoning || page.eeatScores.experience.reasoning) && (
                                            <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}>
                                                {page.eeatScores.trust.reasoning ? `${t('geoEeat.trustReasoningPrefix')}: ${page.eeatScores.trust.reasoning}` : ''}
                                                {page.eeatScores.experience.reasoning ? ` · ${t('geoEeat.experienceReasoningPrefix')}: ${page.eeatScores.experience.reasoning}` : ''}
                                            </MsqdxTypography>
                                        )}
                                    </Box>
                                )}

                                {/* LLM: GEO-Fitness (Stufe 3) */}
                                {page.geoFitnessScore != null && (
                                    <Box sx={{ mt: 1 }}>
                                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>{t('geoEeat.geoFitnessAi')}</MsqdxTypography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <Box sx={{ flex: 1, maxWidth: 200, height: 12, borderRadius: 1, bgcolor: 'var(--color-border)', overflow: 'hidden', display: 'flex' }}>
                                                <Box
                                                    sx={{
                                                        width: `${page.geoFitnessScore}%`,
                                                        height: '100%',
                                                        bgcolor: page.geoFitnessScore >= 60 ? MSQDX_STATUS.success.base : page.geoFitnessScore >= 30 ? MSQDX_STATUS.warning.base : MSQDX_STATUS.error.base,
                                                        borderRadius: 1,
                                                    }}
                                                />
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }}>{page.geoFitnessScore}/100</MsqdxTypography>
                                        </Box>
                                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>
                                            {page.geoFitnessReasoning ?? ''}
                                        </MsqdxTypography>
                                        {page.missingGeoElements && page.missingGeoElements.length > 0 && (
                                            <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}>
                                                {t('geoEeat.missingWeakLabel')}: {page.missingGeoElements.join(', ')}
                                            </MsqdxTypography>
                                        )}
                                    </Box>
                                )}

                                {!page.eeatScores && page.geoFitnessScore == null && (gen || eeatSignals) && (
                                    <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic', color: 'var(--color-text-muted-on-light)' }}>
                                        {t('geoEeat.llmUnavailableHint')}
                                    </MsqdxTypography>
                                )}
                            </Box>
                        );
                    })}
                </MsqdxMoleculeCard>
            )}

            {(hasMultiModelFromSource || hasCompetitive) && (() => {
                if (selectedCompetitiveRunId != null && historyLoading) {
                    return (
                        <MsqdxMoleculeCard
                            title={t('geoEeat.competitiveTitle')}
                            variant="flat"
                            sx={{ bgcolor: 'var(--color-card-bg)', mb: 2 }}
                            borderRadius="lg"
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                                <CircularProgress size={24} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {t('geoEeat.competitiveHistoryLoading')}
                                </MsqdxTypography>
                            </Box>
                        </MsqdxMoleculeCard>
                    );
                }
                const modelIndex = hasMultiModelFromSource
                    ? Math.min(competitiveModelIndex, competitiveModelsFromSource.length - 1)
                    : 0;
                const comp: CompetitiveBenchmarkResult | undefined =
                    hasMultiModelFromSource && sourceByModel
                        ? sourceByModel[competitiveModelsFromSource[modelIndex]!]
                        : (payload?.competitive as CompetitiveBenchmarkResult | undefined);
                const currentModelLabel = hasMultiModelFromSource ? competitiveModelsFromSource[modelIndex] ?? '' : null;
                if (!comp?.metrics) {
                    return (
                        <MsqdxMoleculeCard
                            title={t('geoEeat.competitiveTitle')}
                            variant="flat"
                            sx={{ bgcolor: 'var(--color-card-bg)', mb: 2 }}
                            borderRadius="lg"
                        >
                            <MsqdxTypography variant="body2" color="text.secondary">
                                {selectedCompetitiveRunId != null ? t('geoEeat.noResultsDisplay') : t('geoEeat.noResultsDisplay')}
                            </MsqdxTypography>
                        </MsqdxMoleculeCard>
                    );
                }
                const maxSoV = Math.max(...comp.metrics.map((m) => m.shareOfVoice), 0.01);
                const DOMAIN_COLORS = [
                    MSQDX_BRAND_PRIMARY.green,
                    MSQDX_BRAND_PRIMARY.purple ?? '#7c3aed',
                    '#0ea5e9',
                    '#f59e0b',
                    '#ef4444',
                    '#ec4899',
                    '#14b8a6',
                    '#6366f1',
                ];
                return (
                    <MsqdxMoleculeCard
                        title={t('geoEeat.competitiveTitle')}
                        variant="flat"
                        sx={{ bgcolor: 'var(--color-card-bg)', mb: 2 }}
                        borderRadius="lg"
                    >
                        {(competitiveHistory.length > 0 || hasMultiModelFromSource) && (
                            <Box sx={{ mb: 2 }}>
                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                                    {t('geoEeat.competitiveRunHistoryLabel')}
                                </MsqdxTypography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
                                    <MsqdxChip
                                        size="small"
                                        label={t('geoEeat.competitiveRunCurrentLabel')}
                                        onClick={() => setSelectedCompetitiveRunId(null)}
                                        sx={{
                                            cursor: 'pointer',
                                            bgcolor: selectedCompetitiveRunId == null ? 'var(--color-border)' : undefined,
                                        }}
                                    />
                                    {competitiveHistory.map((run) => {
                                        const dateStr = run.started_at
                                            ? new Date(run.started_at).toLocaleString(undefined, {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })
                                            : '';
                                        return (
                                            <MsqdxChip
                                                key={run.id}
                                                size="small"
                                                label={dateStr ? t('geoEeat.competitiveRunFromDate', { date: dateStr }) : run.id.slice(0, 8)}
                                                onClick={() => setSelectedCompetitiveRunId(run.id)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    bgcolor: selectedCompetitiveRunId === run.id ? 'var(--color-border)' : undefined,
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                                {historyLoading && selectedCompetitiveRunId != null && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CircularProgress size={16} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                            {t('geoEeat.competitiveHistoryLoading')}
                                        </MsqdxTypography>
                                    </Box>
                                )}
                                {hasMultiModelFromSource && competitiveModelsFromSource.length > 0 && (
                                    <Box sx={{ borderBottom: '1px solid var(--color-border)', mb: 2 }}>
                                        <MsqdxTabs
                                            value={modelIndex}
                                            onChange={(v) => setCompetitiveModelIndex(Number(v))}
                                            tabs={competitiveModelsFromSource.map((model, i) => ({ label: model, value: i }))}
                                        />
                                    </Box>
                                )}
                            </Box>
                        )}
                        {currentModelLabel && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                                {t('geoEeat.competitiveModelLabel', { model: currentModelLabel })}
                            </MsqdxTypography>
                        )}
                        {hasMultiModelFromSource && sourceByModel && url && (
                            <CompetitivePositionDiagram
                                competitiveByModel={sourceByModel}
                                targetUrl={url}
                                t={t}
                            />
                        )}
                        <Box sx={{ mb: 3 }}>
                            <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'var(--color-text-on-light)' }}>
                                {t('geoEeat.competitiveOverview')}
                            </MsqdxTypography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {comp.metrics.map((m, idx) => (
                                    <MsqdxTooltip
                                        key={idx}
                                        title={t('geoEeat.tooltipSoVDetail', {
                                            domain: m.domain,
                                            sov: (m.shareOfVoice * 100).toFixed(0),
                                            avgPos: m.avgPosition > 0 ? m.avgPosition.toFixed(1) : '–',
                                            mentions: m.mentionCount,
                                            queries: m.queryCount,
                                            queriesLabel: t('geoEeat.queriesLabel'),
                                        })}
                                        placement="top"
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                flexWrap: 'wrap',
                                                p: 1,
                                                borderRadius: 1,
                                                cursor: 'default',
                                                '&:hover': { bgcolor: alpha(DOMAIN_COLORS[idx % DOMAIN_COLORS.length], 0.06) },
                                            }}
                                        >
                                            <Box sx={{ minWidth: 140, flexShrink: 0 }}>
                                                <MsqdxChip size="small" label={m.domain} sx={{ fontWeight: 600 }} />
                                            </Box>
                                            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ flex: 1, minWidth: 80, height: 28, borderRadius: 1, bgcolor: 'var(--color-border)', overflow: 'hidden', display: 'flex' }}>
                                                    <Box
                                                        sx={{
                                                            width: `${(m.shareOfVoice / maxSoV) * 100}%`,
                                                            minWidth: m.shareOfVoice > 0 ? 4 : 0,
                                                            height: '100%',
                                                            bgcolor: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
                                                            borderRadius: 1,
                                                            transition: 'width 0.3s ease',
                                                        }}
                                                    />
                                                </Box>
                                                <MsqdxTypography variant="body2" sx={{ fontWeight: 600, minWidth: 48, color: 'var(--color-text-on-light)' }}>
                                                    {(m.shareOfVoice * 100).toFixed(0)}%
                                                </MsqdxTypography>
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', minWidth: 90 }}>
                                                {t('geoEeat.avgPosition')}: {m.avgPosition > 0 ? m.avgPosition.toFixed(1) : '–'}
                                            </MsqdxTypography>
                                        </Box>
                                    </MsqdxTooltip>
                                ))}
                            </Box>
                        </Box>

                        {comp.runs && comp.runs.length > 0 && (
                            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid var(--color-border)' }}>
                                <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'var(--color-text-on-light)' }}>
                                    {t('geoEeat.competitivePerQuery')}
                                </MsqdxTypography>
                                <MsqdxAccordion
                                    allowMultiple
                                    size="small"
                                    borderRadius="md"
                                    sx={{
                                        border: '1px solid var(--color-border)',
                                        bgcolor: 'var(--color-card-bg)',
                                        background: 'var(--color-card-bg)',
                                    }}
                                >
                                    {comp.runs.map((run, runIdx) => (
                                        <MsqdxAccordionItem
                                            key={run.queryId ?? runIdx}
                                            id={`query-${runIdx}`}
                                            summary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                                                        {t('geoEeat.queryN', { n: runIdx + 1 })}
                                                    </MsqdxTypography>
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {run.query}
                                                    </MsqdxTypography>
                                                    {run.citations?.length ? (
                                                        <MsqdxChip size="small" label={t('geoEeat.competitiveCitationsCount', { count: run.citations.length })} />
                                                    ) : null}
                                                </Box>
                                            }
                                        >
                                            <Box sx={{ pt: 1 }}>
                                                <MsqdxTypography variant="body2" sx={{ mb: 1.5, color: 'var(--color-text-on-light)' }}>
                                                    {run.query}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                                                    {t('geoEeat.citedDomains')}:
                                                </MsqdxTypography>
                                                {run.citations && run.citations.length > 0 ? (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
                                                        {[...run.citations]
                                                            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                                                            .map((c, cIdx) => (
                                                                <Box
                                                                    key={cIdx}
                                                                    sx={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: 0.5,
                                                                        px: 1,
                                                                        py: 0.5,
                                                                        borderRadius: 1,
                                                                        bgcolor: 'var(--color-card-bg)',
                                                                        border: '1px solid var(--color-border)',
                                                                    }}
                                                                >
                                                                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-muted-on-light)' }}>
                                                                        {t('geoEeat.positionShort')} {c.position ?? cIdx + 1}
                                                                    </MsqdxTypography>
                                                                    <MsqdxChip size="small" label={c.domain} sx={{ height: 22 }} />
                                                                </Box>
                                                            ))}
                                                    </Box>
                                                ) : (
                                                    <MsqdxTypography variant="caption" sx={{ fontStyle: 'italic', color: 'var(--color-text-muted-on-light)' }}>
                                                        {t('geoEeat.noCitations')}
                                                    </MsqdxTypography>
                                                )}
                                            </Box>
                                        </MsqdxAccordionItem>
                                    ))}
                                </MsqdxAccordion>
                            </Box>
                        )}
                    </MsqdxMoleculeCard>
                );
            })()}

            {payload && (!payload.pages || payload.pages.length === 0) && !hasCompetitive && !hasMultiModelFromSource && (
                <MsqdxTypography variant="body2" color="text.secondary">
                    {t('geoEeat.noResultsDisplay')}
                </MsqdxTypography>
            )}
        </Box>
    );
}
