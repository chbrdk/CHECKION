'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import {
    MsqdxCard,
    MsqdxTypography,
    MsqdxButton,
    MsqdxFormField
} from '@msqdx/react';
import { Box, LinearProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { MSQDX_COLORS, MSQDX_SPACING } from '@msqdx/tokens';
import type { DomainScanStatus } from '@/lib/types';

function ScanContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [scanId, setScanId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<DomainScanStatus>('queued');
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [scannedCount, setScannedCount] = useState(0);

    const startUrl = searchParams.get('url');

    // Scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Initial Start
    useEffect(() => {
        if (startUrl && !scanId) {
            startScan(startUrl);
        }
    }, [startUrl]);

    // Polling Loop
    useEffect(() => {
        if (!scanId || status === 'complete' || status === 'error') return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/scan/domain/${scanId}/status`);
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
                        setLogs(prev => [...prev, 'Scan Complete! Redirecting...']);

                        setTimeout(() => {
                            router.push(`/domain/${data.id}`);
                        }, 1000);
                    } else if (data.status === 'error') {
                        setLogs(prev => [...prev, `Error: ${data.error || 'Unknown error'}`]);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [scanId, status, router]);

    async function startScan(url: string) {
        setStatus('queued');
        setLogs(['Initializing Async Deep Scan...']);

        try {
            const response = await fetch('/api/scan/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    setScanId(data.data.id);
                    setLogs(prev => [...prev, 'Scan started in background. Polling for updates...']);
                    setStatus('scanning');
                } else {
                    throw new Error(data.error || 'Failed to start scan');
                }
            } else {
                throw new Error('Failed to start scan');
            }
        } catch (e) {
            setStatus('error');
            setLogs(prev => [...prev, 'Failed to initiate scan connection.']);
        }
    }

    // Input Form
    if (!startUrl && !scanId) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-xl)', maxWidth: 800, mx: 'auto', mt: 'var(--msqdx-spacing-xxl)' }}>
                <MsqdxTypography variant="h3" weight="bold" sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                    Deep Domain Scan (Async)
                </MsqdxTypography>
                <MsqdxTypography variant="body1" sx={{ mb: 'var(--msqdx-spacing-xl)', color: 'var(--color-text-secondary)' }}>
                    Crawls your website background job. Capable of scanning unlimited pages without timeout.
                </MsqdxTypography>

                <Box component="form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const inputUrl = formData.get('url') as string;
                        if (inputUrl) {
                            router.push(`/scan/domain?url=${encodeURIComponent(inputUrl)}`);
                        }
                    }}
                    sx={{ display: 'flex', gap: 'var(--msqdx-spacing-md)' }}
                >
                    <Box sx={{ flex: 1 }}>
                        <MsqdxFormField
                            label="Domain URL (e.g. https://example.com)"
                            name="url"
                            placeholder="https://"
                            required
                        />
                    </Box>
                    <Box sx={{ pt: '28px' }}>
                        <MsqdxButton type="submit" variant="contained" size="large">
                            Start Deep Scan
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
                    Deep Scanning {startUrl}...
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-secondary)' }}>
                    Status: {status.toUpperCase()} | Scanned: {scannedCount} pages
                </MsqdxTypography>
            </Box>

            <Box sx={{ maxWidth: 800, mx: 'auto', mt: 'var(--msqdx-spacing-md)' }}>
                <MsqdxCard title="Live Scan Progress" sx={{ bgcolor: 'var(--color-card-bg)' }}>
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
                </MsqdxCard>
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
