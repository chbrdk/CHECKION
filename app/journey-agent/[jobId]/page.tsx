'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxCard } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';
import type { UxJourneyAgentStep } from '@/lib/types';

type Status = 'idle' | 'loading' | 'running' | 'complete' | 'error' | 'unavailable';

export default function JourneyAgentStatusPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useI18n();
    const jobId = params.jobId as string;

    const [status, setStatus] = useState<Status>('loading');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        steps?: UxJourneyAgentStep[];
        success?: boolean;
        taskDescription?: string;
        siteDomain?: string;
        videoUrl?: string;
    } | null>(null);

    useEffect(() => {
        if (!jobId) return;

        let cancelled = false;
        const poll = async () => {
            try {
                const res = await fetch(`/api/scan/journey-agent/${encodeURIComponent(jobId)}`);
                const data = await res.json();
                if (cancelled) return;

                if (res.status === 501) {
                    setStatus('unavailable');
                    setError(data.error || null);
                    return;
                }
                if (!res.ok) {
                    setStatus('error');
                    setError(data.error || 'Unknown error');
                    return;
                }

                const st = data.status as string;
                if (st === 'complete' || data.result) {
                    setStatus('complete');
                    setResult(data.result || data);
                } else if (st === 'error') {
                    setStatus('error');
                    setError(data.error || 'Journey failed');
                } else {
                    setStatus('running');
                    setTimeout(poll, 2000);
                }
            } catch (e) {
                if (!cancelled) {
                    setStatus('error');
                    setError(e instanceof Error ? e.message : 'Network error');
                }
            }
        };

        poll();
        return () => {
            cancelled = true;
        };
    }, [jobId]);

    if (!jobId) {
        return (
            <Box sx={{ p: MSQDX_SPACING.scale.md, maxWidth: 800, mx: 'auto' }}>
                <MsqdxTypography variant="body1" color="text.secondary">
                    {t('results.errorNotFound')}
                </MsqdxTypography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: MSQDX_SPACING.scale.md, maxWidth: 900, mx: 'auto' }}>
            <MsqdxTypography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                {t('scan.journeyTab')} – {jobId.slice(0, 8)}…
            </MsqdxTypography>

            {status === 'loading' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                    <CircularProgress size={24} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                    <MsqdxTypography variant="body2" color="text.secondary">
                        Loading…
                    </MsqdxTypography>
                </Box>
            )}

            {status === 'running' && (
                <Box sx={{ py: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <CircularProgress size={24} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                        <MsqdxTypography variant="body2" color="text.secondary">
                            {t('scan.journeyStatusRunning')}
                        </MsqdxTypography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                        <MsqdxTypography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            Live-Ansicht
                        </MsqdxTypography>
                        <Box
                            sx={{
                                width: '100%',
                                maxWidth: 800,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: '#f5f5f5',
                                minHeight: 200,
                            }}
                        >
                            <Box
                                component="img"
                                src={`/api/scan/journey-agent/${encodeURIComponent(jobId)}/live/stream`}
                                alt="Agent-Browser Live-Ansicht"
                                sx={{ display: 'block', width: '100%', height: 'auto', verticalAlign: 'top' }}
                            />
                        </Box>
                    </Box>
                </Box>
            )}

            {status === 'unavailable' && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, bgcolor: '#fff' }}>
                    <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {error || t('scan.journeyNotConfigured')}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                        {t('scan.journeyBackToScan')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            {status === 'error' && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, bgcolor: '#fff', border: '1px solid', borderColor: 'error.light' }}>
                    <MsqdxTypography variant="body2" color="error" sx={{ mb: 1 }}>
                        {error}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                        {t('scan.journeyBackToScan')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            {status === 'complete' && result && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {result.success ? t('scan.journeyStatusComplete') : t('scan.journeyStatusFinished')}
                    </MsqdxTypography>
                    {result.taskDescription && (
                        <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {t('scan.journeyTaskLabel')}: {result.taskDescription}
                        </MsqdxTypography>
                    )}
                    {result.siteDomain && (
                        <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Site: {result.siteDomain}
                        </MsqdxTypography>
                    )}

                    {result.videoUrl && (
                        <Box sx={{ mt: 2, mb: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ mb: 1 }}>
                                Aufzeichnung
                            </MsqdxTypography>
                            <Box
                                component="video"
                                controls
                                playsInline
                                sx={{ width: '100%', maxWidth: 800, borderRadius: 1, bgcolor: '#000' }}
                                src={result.videoUrl}
                            >
                                Your browser does not support the video tag.
                            </Box>
                        </Box>
                    )}

                    {result.steps && result.steps.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ mb: 1 }}>
                                {t('scan.journeyStepsTitle')} ({result.steps.length})
                            </MsqdxTypography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {result.steps.map((s, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: '#e0e0e0',
                                            bgcolor: '#fafafa',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                                            <Box
                                                component="span"
                                                sx={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    px: 1,
                                                    py: 0.25,
                                                    borderRadius: 1,
                                                    bgcolor: s.action === 'done' ? 'success.light' : s.action === 'navigate' ? 'info.light' : 'primary.light',
                                                    color: s.action === 'done' ? 'success.dark' : s.action === 'navigate' ? 'info.dark' : 'primary.dark',
                                                }}
                                            >
                                                {s.action === 'navigate' ? 'Seite' : s.action === 'click' ? 'Klick' : s.action === 'done' ? 'Abgeschlossen' : s.action}
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 500 }}>
                                                {s.target && s.target !== '—' ? (s.target.length > 80 ? s.target.slice(0, 80) + '…' : s.target) : null}
                                            </MsqdxTypography>
                                        </Box>
                                        {s.reasoning && (
                                            <Box sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: 'action.hover', borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                                                    {t('scan.journeyReasoning')}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                    {s.reasoning.length > 800 ? s.reasoning.slice(0, 800) + '…' : s.reasoning}
                                                </MsqdxTypography>
                                            </Box>
                                        )}
                                        {s.result && (
                                            <MsqdxTypography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                {s.result.length > 400 ? s.result.slice(0, 400) + '…' : s.result}
                                            </MsqdxTypography>
                                        )}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')} sx={{ mt: 2 }}>
                        {t('scan.journeyNewJourney')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            <MsqdxButton variant="text" size="small" onClick={() => router.push('/')}>
                {t('results.dashboard')}
            </MsqdxButton>
        </Box>
    );
}
