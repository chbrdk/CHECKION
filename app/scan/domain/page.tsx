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
import { apiScanDomainStatus, apiScanDomainCreate, pathDomain, pathScanDomain } from '@/lib/constants';

function ScanContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useI18n();
    const [scanId, setScanId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<DomainScanStatus>('queued');
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [scannedCount, setScannedCount] = useState(0);
    const [maxPages, setMaxPages] = useState(1000);

    const startUrl = searchParams.get('url');
    const maxPagesParam = searchParams.get('maxPages');

    // Scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Initial Start
    useEffect(() => {
        if (startUrl && !scanId) {
            const limit = maxPagesParam ? Math.min(10000, Math.max(1, Number(maxPagesParam))) : 1000;
            startScan(startUrl, limit);
        }
    }, [startUrl, maxPagesParam]);

    // Polling Loop
    useEffect(() => {
        if (!scanId || status === 'complete' || status === 'error') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(apiScanDomainStatus(scanId));
                if (res.ok) {
                    const data = await res.json();

                    // Update State
                    setStatus(data.status);

                    if (data.progress) {
                        setScannedCount(data.progress.scanned);
                        if (data.progress.currentUrl) {
                            setLogs(prev => {
                                const msg = `Scanning: ${data.progress.currentUrl}`;
                                // Simple dedup
                                if (prev[prev.length - 1] !== msg) return [...prev, msg];
                                return prev;
                            });
                        }
                    }

                    if (data.status === 'complete') {
                        setLogs(prev => [...prev, t('domain.completeLog')]);

                        setTimeout(() => {
                            router.push(pathDomain(data.id));
                        }, 1000);
                    } else if (data.status === 'error') {
                        setLogs(prev => [...prev, `${t('domain.errorLog')}: ${data.error || 'Unknown error'}`]);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [scanId, status, router]);

    async function startScan(url: string, pageLimit?: number) {
        setStatus('queued');
        setLogs([t('domain.initLog')]);

        try {
            const response = await fetch(apiScanDomainCreate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, maxPages: pageLimit ?? 1000 })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setScanId(data.data.id);
                    setLogs(prev => [...prev, t('domain.startedLog')]);
                    setStatus('scanning');
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
                            router.push(pathScanDomain({ url: inputUrl, maxPages: limit }));
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
                    {t('domain.status')}: {status.toUpperCase()} | {t('domain.scannedPages')}: {scannedCount} {t('domain.pages')}
                </MsqdxTypography>
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
                    {(status === 'queued' || status === 'scanning') && <LinearProgress sx={{ mb: 'var(--msqdx-spacing-sm)' }} />}

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
