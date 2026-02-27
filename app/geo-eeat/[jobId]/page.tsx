'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard, MsqdxChip, MsqdxAccordion, MsqdxAccordionItem, MsqdxTooltip } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import { apiScanGeoEeat, PATH_SCAN } from '@/lib/constants';
import { SharePanel } from '@/components/SharePanel';
import type { GeoEeatIntensiveResult, GeoEeatPageResult, CompetitiveBenchmarkResult } from '@/lib/types';

const POLL_INTERVAL_MS = 2500;

export default function GeoEeatResultPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const jobId = params?.jobId as string | undefined;

    const [status, setStatus] = useState<'loading' | 'running' | 'complete' | 'error'>('loading');
    const [payload, setPayload] = useState<GeoEeatIntensiveResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [url, setUrl] = useState<string>('');

    useEffect(() => {
        if (!jobId) return;

        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | null = null;

        async function fetchRun() {
            try {
                const res = await fetch(apiScanGeoEeat(jobId));
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

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: payload?.competitive?.metrics?.length ? 1200 : 1000, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700 }}>
                    {t('geoEeat.title')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

            {payload?.recommendations && payload.recommendations.length > 0 && (
                <MsqdxMoleculeCard
                    title={t('geoEeat.recommendationsTitle')}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', mb: 2 }}
                    borderRadius="lg"
                >
                    <MsqdxAccordion allowMultiple size="small" borderRadius="md" sx={{ border: 'none', background: 'transparent' }}>
                        {payload.recommendations.map((rec, idx) => (
                            <MsqdxAccordionItem
                                key={idx}
                                id={`rec-${idx}`}
                                summary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <MsqdxChip size="small" label={`#${rec.priority ?? idx + 1}`} sx={{ minWidth: 32 }} />
                                        <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }}>{rec.title}</MsqdxTypography>
                                    </Box>
                                }
                            >
                                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', pl: 1 }}>
                                    {rec.description}
                                </MsqdxTypography>
                                {rec.affectedUrls && rec.affectedUrls.length > 0 && (
                                    <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, pl: 1, color: 'var(--color-text-muted-on-light)' }}>
                                        {t('geoEeat.urlsLabel')}: {rec.affectedUrls.slice(0, 3).join(', ')}{rec.affectedUrls.length > 3 ? '…' : ''}
                                    </MsqdxTypography>
                                )}
                            </MsqdxAccordionItem>
                        ))}
                    </MsqdxAccordion>
                </MsqdxMoleculeCard>
            )}

            {payload?.competitive && (payload.competitive as CompetitiveBenchmarkResult).metrics?.length > 0 && (() => {
                const comp = payload.competitive as CompetitiveBenchmarkResult;
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
                                                <Box
                                                    sx={{
                                                        flex: 1,
                                                        minWidth: 80,
                                                        height: 28,
                                                        borderRadius: 1,
                                                        bgcolor: 'var(--color-border)',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                    }}
                                                >
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
                                <MsqdxAccordion allowMultiple size="small" borderRadius="md" sx={{ border: '1px solid var(--color-border)' }}>
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

            {payload && (!payload.pages || payload.pages.length === 0) && !payload.recommendations?.length && !payload.competitive?.metrics?.length && (
                <MsqdxTypography variant="body2" color="text.secondary">
                    {t('geoEeat.noResultsDisplay')}
                </MsqdxTypography>
            )}
        </Box>
    );
}
