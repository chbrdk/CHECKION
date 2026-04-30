'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import {
    MsqdxMoleculeCard,
    MsqdxTypography,
    MsqdxButton,
    MsqdxFormField,
    MsqdxSelect
} from '@msqdx/react';
import type { SelectChangeEvent } from '@mui/material';
import { Box, LinearProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { MSQDX_COLORS, MSQDX_SPACING } from '@msqdx/tokens';
import type { DomainScanStatus } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { apiScanDomainStatus, apiScanDomainCreate, apiScanDomainControl, pathDomain, pathScanDomain } from '@/lib/constants';

function ScanContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useI18n();
    const [scanId, setScanId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<DomainScanStatus>('queued');
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [scannedCount, setScannedCount] = useState(0);
    const [progressTotal, setProgressTotal] = useState(0);
    const [maxPages, setMaxPages] = useState(1000);

    const startUrl = searchParams.get('url');
    const maxPagesParam = searchParams.get('maxPages');
    const projectIdParam = searchParams.get('projectId');
    const scanIdParam = searchParams.get('scanId');

    // Scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Resume existing scan (scanId in URL) or start new one
    useEffect(() => {
        if (!startUrl) return;
        if (scanIdParam) {
            setScanId(scanIdParam);
            setLogs((prev) => (prev.length === 0 ? [t('domain.resumedLog')] : prev));
            return;
        }
        if (!scanId) {
            const limit = maxPagesParam ? Math.min(10000, Math.max(1, Number(maxPagesParam))) : 1000;
            void startScan(startUrl, limit, projectIdParam);
        }
    }, [startUrl, maxPagesParam, projectIdParam, scanIdParam, t]);

    const pollOnce = async (sid: string) => {
        const res = await fetch(apiScanDomainStatus(sid), { credentials: 'same-origin' });
        if (!res.ok) return null;
        return res.json();
    };

    // Polling Loop (runs until terminal status from API)
    useEffect(() => {
        if (!scanId) return;

        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | undefined;

        const tick = async () => {
            if (cancelled) return;
            try {
                const data = await pollOnce(scanId);
                if (!data || cancelled) return;

                setStatus(data.status);
                if (data.progress) {
                    setScannedCount(typeof data.progress.scanned === 'number' ? data.progress.scanned : 0);
                    setProgressTotal(typeof data.progress.total === 'number' ? data.progress.total : 0);
                    if (data.progress.currentUrl) {
                        setLogs((prev) => {
                            const msg = `Scanning: ${data.progress.currentUrl}`;
                            if (prev[prev.length - 1] !== msg) return [...prev, msg];
                            return prev;
                        });
                    }
                }

                if (data.status === 'complete') {
                    setLogs((prev) => [...prev, t('domain.completeLog')]);
                    if (intervalId) clearInterval(intervalId);
                    setTimeout(() => {
                        router.push(pathDomain(data.id, projectIdParam ? { projectId: projectIdParam } : undefined));
                    }, 1000);
                } else if (data.status === 'error') {
                    setLogs((prev) => [...prev, `${t('domain.errorLog')}: ${data.error || 'Unknown error'}`]);
                    if (intervalId) clearInterval(intervalId);
                } else if (data.status === 'cancelled') {
                    setLogs((prev) => [...prev, t('domain.cancelledLog')]);
                    if (intervalId) clearInterval(intervalId);
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        };

        intervalId = setInterval(tick, 2000);
        void tick();
        return () => {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        };
    }, [scanId, router, t, projectIdParam]);

    const sendScanControl = async (action: 'pause' | 'resume' | 'cancel') => {
        if (!scanId) return;
        try {
            const res = await fetch(apiScanDomainControl(scanId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ action }),
            });
            if (res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j?.status) setStatus(j.status);
                if (action === 'pause') setLogs((prev) => [...prev, t('domain.pauseLog')]);
                if (action === 'resume') setLogs((prev) => [...prev, t('domain.resumeLog')]);
                if (action === 'cancel') setLogs((prev) => [...prev, t('domain.cancelRequestLog')]);
            }
        } catch {
            // ignore
        }
    };

    async function startScan(url: string, pageLimit?: number, projectId?: string | null) {
        setStatus('queued');
        setLogs([t('domain.initLog')]);

        try {
            const response = await fetch(apiScanDomainCreate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    maxPages: pageLimit ?? 1000,
                    ...(projectId ? { projectId } : {}),
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const newId = data.data.id as string;
                    setScanId(newId);
                    setProgressTotal(pageLimit ?? 1000);
                    setLogs(prev => [...prev, t('domain.startedLog')]);
                    setStatus('scanning');
                    router.replace(
                        pathScanDomain({
                            url,
                            maxPages: pageLimit ?? 1000,
                            ...(projectId ? { projectId } : {}),
                            scanId: newId,
                        })
                    );
                } else {
                    throw new Error(data.error || t('domain.failedStart'));
                }
            } else {
                throw new Error(t('domain.failedStart'));
            }
        } catch (e) {
            setStatus('error');
            setLogs(prev => [...prev, t('domain.failedConnection')]);
        }
    }

    // Input Form
    if (!startUrl && !scanId) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-xl)', maxWidth: 800, mx: 'auto', mt: 'var(--msqdx-spacing-xxl)' }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxTypography variant="h3" weight="bold">
                        {t('domain.title')}
                    </MsqdxTypography>
                    <InfoTooltip title={t('info.domainScan')} ariaLabel={t('common.info')} />
                </Box>
                <MsqdxTypography variant="body1" sx={{ mb: 'var(--msqdx-spacing-xl)', color: 'var(--color-text-secondary)' }}>
                    {t('domain.subtitle')}
                </MsqdxTypography>

                <Box component="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const inputUrl = formData.get('url') as string;
                        if (inputUrl) {
                            const limit = maxPages;
                            router.push(
                                pathScanDomain({
                                    url: inputUrl,
                                    maxPages: limit,
                                    ...(projectIdParam ? { projectId: projectIdParam } : {}),
                                })
                            );
                        }
                    }}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-md)', alignItems: 'flex-end' }}
                >
                    <Box sx={{ flex: '1 1 280px', minWidth: 200 }}>
                        <MsqdxFormField
                            label={t('domain.urlLabel')}
                            name="url"
                            placeholder={t('domain.urlPlaceholder')}
                            required
                        />
                    </Box>
                    <Box sx={{ minWidth: 160 }}>
                        <MsqdxSelect
                            label={t('domain.maxPagesLabel')}
                            value={String(maxPages)}
                            onChange={(e: SelectChangeEvent<unknown>) => setMaxPages(Number((e.target as HTMLSelectElement).value))}
                            options={[
                                { value: '50', label: '50' },
                                { value: '100', label: '100' },
                                { value: '250', label: '250' },
                                { value: '500', label: '500' },
                                { value: '1000', label: '1000' },
                                { value: '10000', label: t('domain.maxPagesAll') },
                            ]}
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ pt: '28px' }}>
                        <MsqdxButton type="submit" variant="contained" size="large">
                            {t('domain.startCta')}
                        </MsqdxButton>
                    </Box>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            <Box sx={{ mb: 'var(--msqdx-spacing-xl)' }}>
                <MsqdxTypography variant="h4" weight="bold" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                    {t('domain.scanningTitle').replace('{url}', startUrl || '')}
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                    {t('domain.status')}: {status.toUpperCase()} | {t('domain.scannedPages')}: {scannedCount}
                    {progressTotal > 0 ? ` / ${progressTotal}` : ''} {t('domain.pages')}
                </MsqdxTypography>
                {(status === 'scanning' || status === 'queued' || status === 'paused' || status === 'cancelling') && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xs)', mt: 'var(--msqdx-spacing-sm)' }}>
                        {(status === 'scanning' || status === 'queued') && (
                            <MsqdxButton variant="outlined" size="small" onClick={() => void sendScanControl('pause')}>
                                {t('domain.pauseScan')}
                            </MsqdxButton>
                        )}
                        {status === 'paused' && (
                            <MsqdxButton variant="outlined" size="small" onClick={() => void sendScanControl('resume')}>
                                {t('domain.resumeScan')}
                            </MsqdxButton>
                        )}
                        {(status === 'scanning' || status === 'queued' || status === 'paused') && (
                            <MsqdxButton variant="outlined" size="small" onClick={() => void sendScanControl('cancel')}>
                                {t('domain.cancelScan')}
                            </MsqdxButton>
                        )}
                    </Box>
                )}
            </Box>

            <Box sx={{ maxWidth: 800, mx: 'auto', mt: 'var(--msqdx-spacing-md)' }}>
                <MsqdxMoleculeCard
                    title={t('domain.liveProgress')}
                    headerActions={<InfoTooltip title={t('info.liveProgress')} ariaLabel={t('common.info')} />}
                    variant="flat"
                    borderRadius="lg"
                    footerDivider={false}
                    sx={{ bgcolor: 'var(--color-card-bg)' }}
                >
                    {(status === 'queued' || status === 'scanning' || status === 'cancelling' || status === 'paused') && (
                        <LinearProgress
                            variant={progressTotal > 0 ? 'determinate' : 'indeterminate'}
                            value={progressTotal > 0 ? Math.min(100, (scannedCount / progressTotal) * 100) : undefined}
                            sx={{ mb: 'var(--msqdx-spacing-sm)' }}
                        />
                    )}

                    <Box
                        sx={{
                            height: 400,
                            overflowY: 'auto',
                            p: 'var(--msqdx-spacing-md)',
                            bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                            color: 'var(--color-text-on-light)',
                            fontFamily: 'monospace',
                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            borderRadius: 'var(--msqdx-radius-sm)'
                        }}
                    >
                        {logs.map((log, i) => (
                            <Box key={i} sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                                {log}
                            </Box>
                        ))}
                        <div ref={logsEndRef} />
                    </Box>
                </MsqdxMoleculeCard>
            </Box>
        </Box>
    );
}

export default function DomainScanLivePage() {
    return (
        <Suspense fallback={<LinearProgress />}>
            <ScanContent />
        </Suspense>
    );
}
