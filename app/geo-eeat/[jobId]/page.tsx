'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
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
                const res = await fetch(`/api/scan/geo-eeat/${jobId}`);
                if (!res.ok) {
                    if (!cancelled) {
                        if (res.status === 404) setError('Run not found.');
                        else setError('Failed to load run.');
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
                    setError('Network error.');
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
    }, [jobId]);

    if (!jobId) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto' }}>
                <MsqdxTypography variant="body1" color="text.secondary">
                    Missing job ID.
                </MsqdxTypography>
                <Link href="/scan">
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
                        {error || 'Unknown error'}
                    </MsqdxTypography>
                    <Box sx={{ mt: 2 }}>
                        <Link href="/scan">
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
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700 }}>
                    {t('geoEeat.title')}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SharePanel resourceType="geo_eeat" resourceId={jobId} />
                    <Link href="/scan">
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
                    {payload.pages.map((page: GeoEeatPageResult, idx: number) => (
                        <Box key={idx} sx={{ mb: idx < payload.pages!.length - 1 ? 2 : 0, pb: idx < payload.pages!.length - 1 ? 2 : 0, borderBottom: idx < payload.pages!.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                {page.title || page.url}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', wordBreak: 'break-all' }}>
                                {page.url}
                            </MsqdxTypography>
                            {page.technical?.generative && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                    <MsqdxChip size="small" label={`${t('geoEeat.geoScore')}: ${page.technical.generative.score}`} />
                                    {page.technical.generative.technical?.hasLlmsTxt != null && (
                                        <MsqdxChip size="small" label={page.technical.generative.technical.hasLlmsTxt ? 'llms.txt' : 'No llms.txt'} />
                                    )}
                                </Box>
                            )}
                            {page.eeatScores && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                    <MsqdxChip size="small" label={`${t('geoEeat.trust')}: ${page.eeatScores.trust.score}/5`} />
                                    <MsqdxChip size="small" label={`${t('geoEeat.experience')}: ${page.eeatScores.experience.score}/5`} />
                                    <MsqdxChip size="small" label={`${t('geoEeat.expertise')}: ${page.eeatScores.expertise.score}/5`} />
                                </Box>
                            )}
                            {page.geoFitnessScore != null && (
                                <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}>
                                    GEO Fitness: {page.geoFitnessScore} — {page.geoFitnessReasoning ?? ''}
                                </MsqdxTypography>
                            )}
                        </Box>
                    ))}
                </MsqdxMoleculeCard>
            )}

            {payload?.recommendations && payload.recommendations.length > 0 && (
                <MsqdxMoleculeCard
                    title={t('geoEeat.recommendationsTitle')}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', mb: 2 }}
                    borderRadius="lg"
                >
                    <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                        {payload.recommendations.map((rec, idx) => (
                            <MsqdxTypography key={idx} component="li" variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{rec.title}</strong>: {rec.description}
                            </MsqdxTypography>
                        ))}
                    </Box>
                </MsqdxMoleculeCard>
            )}

            {payload?.competitive && (payload.competitive as CompetitiveBenchmarkResult).metrics?.length > 0 && (
                <MsqdxMoleculeCard
                    title={t('geoEeat.competitiveTitle')}
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                    borderRadius="lg"
                >
                    <Box sx={{ overflowX: 'auto' }}>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 1 }}>
                            {t('geoEeat.shareOfVoice')} / {t('geoEeat.avgPosition')}
                        </MsqdxTypography>
                        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
                            {(payload.competitive as CompetitiveBenchmarkResult).metrics.map((m, idx) => (
                                <Box key={idx} component="li" sx={{ py: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <MsqdxChip size="small" label={m.domain} />
                                    <MsqdxTypography variant="caption">
                                        SoV: {(m.shareOfVoice * 100).toFixed(0)}% · Ø Pos: {m.avgPosition.toFixed(1)}
                                    </MsqdxTypography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </MsqdxMoleculeCard>
            )}

            {payload && (!payload.pages || payload.pages.length === 0) && !payload.recommendations?.length && !payload.competitive?.metrics?.length && (
                <MsqdxTypography variant="body2" color="text.secondary">
                    No results to display.
                </MsqdxTypography>
            )}
        </Box>
    );
}
