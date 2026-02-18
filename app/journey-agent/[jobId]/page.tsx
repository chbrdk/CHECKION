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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
                    <CircularProgress size={24} sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
                    <MsqdxTypography variant="body2" color="text.secondary">
                        {t('scan.journeyStatusRunning')}
                    </MsqdxTypography>
                </Box>
            )}

            {status === 'unavailable' && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2 }}>
                    <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {error || t('scan.journeyNotConfigured')}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                        {t('scan.journeyBackToScan')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            {status === 'error' && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'error.light' }}>
                    <MsqdxTypography variant="body2" color="error" sx={{ mb: 1 }}>
                        {error}
                    </MsqdxTypography>
                    <MsqdxButton variant="outlined" size="small" onClick={() => router.push('/scan')}>
                        {t('scan.journeyBackToScan')}
                    </MsqdxButton>
                </MsqdxCard>
            )}

            {status === 'complete' && result && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2 }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        {result.success ? t('scan.journeyStatusComplete') : t('scan.journeyStatusFinished')}
                    </MsqdxTypography>
                    {result.taskDescription && (
                        <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('scan.journeyTaskLabel')}: {result.taskDescription}
                        </MsqdxTypography>
                    )}
                    {result.siteDomain && (
                        <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Site: {result.siteDomain}
                        </MsqdxTypography>
                    )}
                    {result.steps && result.steps.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ mb: 1 }}>
                                {t('scan.journeyStepsTitle')} ({result.steps.length})
                            </MsqdxTypography>
                            <Box component="ol" sx={{ pl: 2, m: 0 }}>
                                {result.steps.map((s, i) => (
                                    <li key={i} style={{ marginBottom: 8 }}>
                                        <MsqdxTypography variant="body2">
                                            {s.action}
                                            {s.target ? ` → ${s.target}` : ''}
                                            {s.reasoning ? ` — ${s.reasoning}` : ''}
                                        </MsqdxTypography>
                                    </li>
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
