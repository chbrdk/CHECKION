'use client';

import React, { useEffect, useState, useRef, Suspense, useMemo } from 'react';
import {
    MsqdxMoleculeCard,
    MsqdxTypography,
    MsqdxButton,
    MsqdxFormField,
    MsqdxCheckboxField,
} from '@msqdx/react';
import { Box, LinearProgress } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { MSQDX_SPACING } from '@msqdx/tokens';
import type { DomainScanStatus } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';
import { DomainScanMaxPagesSelect } from '@/components/DomainScanMaxPagesSelect';
import { apiScanDomainCreate, pathDomain, pathScanDomain } from '@/lib/constants';
import { useStatusUi } from '@/components/status/StatusUiContext';
import { useDomainScanMaxPages } from '@/hooks/useDomainScanMaxPages';
import {
    DOMAIN_SCAN_DEFAULT_MAX_PAGES,
    parseDomainScanMaxPagesParam,
} from '@/lib/domain-scan-max-pages';

function ScanContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useI18n();
    const { domainScan } = useStatusUi();

    const [scanId, setScanId] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const navigatedCompleteRef = useRef(false);
    const prevUrlRef = useRef<string | null>(null);

    const startUrl = searchParams.get('url');
    const maxPagesParam = searchParams.get('maxPages');
    const { maxPages, setMaxPages } = useDomainScanMaxPages(maxPagesParam);
    const projectIdParam = searchParams.get('projectId');
    const scanIdParam = searchParams.get('scanId');
    const classifyPageTopicsParam = searchParams.get('classifyPageTopics') === 'true';
    const [classifyPageTopics, setClassifyPageTopics] = useState(classifyPageTopicsParam);

    const aiFillProjectMetadataParam = searchParams.get('aiFillProjectMetadata') !== 'false';
    const [aiFillProjectMetadata, setAiFillProjectMetadata] = useState(
        projectIdParam ? aiFillProjectMetadataParam : true
    );

    useEffect(() => {
        setClassifyPageTopics(classifyPageTopicsParam);
    }, [classifyPageTopicsParam]);

    useEffect(() => {
        if (projectIdParam) {
            setAiFillProjectMetadata(aiFillProjectMetadataParam);
        }
    }, [aiFillProjectMetadataParam, projectIdParam]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const attachPayload = useMemo(() => {
        if (!startUrl || !scanIdParam) return null;
        return {
            scanId: scanIdParam,
            startUrl,
            maxPages: parseDomainScanMaxPagesParam(maxPagesParam) ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES,
            projectId: projectIdParam ? projectIdParam : null,
            classifyPageTopics: classifyPageTopicsParam,
            aiFillProjectMetadata: projectIdParam ? aiFillProjectMetadataParam : true,
        };
    }, [
        startUrl,
        scanIdParam,
        maxPagesParam,
        projectIdParam,
        classifyPageTopicsParam,
        aiFillProjectMetadataParam,
    ]);

    useEffect(() => {
        if (!attachPayload) return;
        domainScan.attach(attachPayload);
        setScanId(attachPayload.scanId);
        setLogs((prev) => (prev.length === 0 ? [t('domain.resumedLog')] : prev));
    }, [attachPayload, domainScan.attach, t]);

    useEffect(() => {
        if (!startUrl) return;
        if (scanIdParam) return;
        if (!scanId) {
            const limit = parseDomainScanMaxPagesParam(maxPagesParam) ?? maxPages;
            void startScan(
                startUrl,
                limit,
                projectIdParam,
                classifyPageTopicsParam,
                projectIdParam ? aiFillProjectMetadataParam : true
            );
        }
    }, [startUrl, maxPagesParam, projectIdParam, scanIdParam, classifyPageTopicsParam, aiFillProjectMetadataParam, scanId]);

    const active = Boolean(scanId && domainScan.scanId === scanId);
    const status: DomainScanStatus = active ? domainScan.status : 'queued';
    const scannedCount = active ? domainScan.scannedCount : 0;
    const progressTotal = active ? domainScan.progressTotal : 0;

    useEffect(() => {
        if (!scanId || !active) return;
        const u = domainScan.currentUrl;
        if (u && u !== prevUrlRef.current) {
            prevUrlRef.current = u;
            setLogs((prev) => {
                const msg = `Scanning: ${u}`;
                if (prev[prev.length - 1] === msg) return prev;
                return [...prev, msg];
            });
        }
    }, [domainScan.currentUrl, scanId, active]);

    useEffect(() => {
        if (!active || domainScan.status !== 'complete' || !scanId) return;
        if (navigatedCompleteRef.current) return;
        navigatedCompleteRef.current = true;
        setLogs((prev) => [...prev, t('domain.completeLog')]);
        const tmr = setTimeout(() => {
            router.push(pathDomain(domainScan.scanId!, projectIdParam ? { projectId: projectIdParam } : undefined));
        }, 1000);
        return () => clearTimeout(tmr);
    }, [active, domainScan.status, domainScan.scanId, scanId, router, t, projectIdParam]);

    const sendScanControl = async (action: 'pause' | 'resume' | 'cancel') => {
        if (!scanId) return;
        await domainScan.sendControl(action);
        if (action === 'pause') setLogs((prev) => [...prev, t('domain.pauseLog')]);
        if (action === 'resume') setLogs((prev) => [...prev, t('domain.resumeLog')]);
        if (action === 'cancel') {
            setLogs((prev) => [...prev, t('domain.cancelRequestLog')]);
        }
    };

    async function startScan(
        url: string,
        pageLimit?: number,
        projectId?: string | null,
        runClassifyPageTopics?: boolean,
        runAiFillProjectMetadata?: boolean
    ) {
        setLogs([t('domain.initLog')]);

        try {
            const response = await fetch(apiScanDomainCreate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    maxPages: pageLimit ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES,
                    ...(projectId ? { projectId } : {}),
                    ...(runClassifyPageTopics ? { classifyPageTopics: true } : {}),
                    ...(projectId && runAiFillProjectMetadata === false
                        ? { aiFillProjectMetadata: false }
                        : {}),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    const newId = data.data.id as string;
                    setScanId(newId);
                    domainScan.attach({
                        scanId: newId,
                        startUrl: url,
                        maxPages: pageLimit ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES,
                        projectId: projectId ?? null,
                        classifyPageTopics: !!runClassifyPageTopics,
                        aiFillProjectMetadata: projectId ? runAiFillProjectMetadata !== false : true,
                    });
                    setLogs((prev) => [...prev, t('domain.startedLog')]);
                    router.replace(
                        pathScanDomain({
                            url,
                            maxPages: pageLimit ?? DOMAIN_SCAN_DEFAULT_MAX_PAGES,
                            ...(projectId ? { projectId } : {}),
                            ...(runClassifyPageTopics ? { classifyPageTopics: true } : {}),
                            ...(projectId && runAiFillProjectMetadata === false
                                ? { aiFillProjectMetadata: false }
                                : {}),
                            scanId: newId,
                        })
                    );
                } else {
                    throw new Error(data.error || t('domain.failedStart'));
                }
            } else {
                throw new Error(t('domain.failedStart'));
            }
        } catch {
            setLogs((prev) => [...prev, t('domain.failedConnection')]);
        }
    }

    useEffect(() => {
        navigatedCompleteRef.current = false;
    }, [scanId]);

    if (!startUrl && !scanId) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-xl)', maxWidth: 800, mx: 'auto', mt: 'var(--msqdx-spacing-xxl)' }}>
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--msqdx-spacing-xs)',
                        mb: 'var(--msqdx-spacing-md)',
                    }}
                >
                    <MsqdxTypography variant="h3" weight="bold">
                        {t('domain.title')}
                    </MsqdxTypography>
                    <InfoTooltip title={t('info.domainScan')} ariaLabel={t('common.info')} />
                </Box>
                <MsqdxTypography variant="body1" sx={{ mb: 'var(--msqdx-spacing-xl)', color: 'var(--color-text-secondary)' }}>
                    {t('domain.subtitle')}
                </MsqdxTypography>

                <Box
                    component="form"
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
                                    ...(classifyPageTopics ? { classifyPageTopics: true } : {}),
                                    ...(projectIdParam && aiFillProjectMetadata === false
                                        ? { aiFillProjectMetadata: false }
                                        : {}),
                                })
                            );
                        }
                    }}
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--msqdx-spacing-md)',
                        alignItems: 'flex-end',
                    }}
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
                        <DomainScanMaxPagesSelect value={maxPages} onChange={setMaxPages} />
                    </Box>
                    <Box sx={{ flex: '1 1 100%', minWidth: 200 }}>
                        <MsqdxCheckboxField
                            label={t('domain.classifyPageTopicsLabel')}
                            options={[{ value: 'on', label: t('domain.classifyPageTopicsOption') }]}
                            value={classifyPageTopics ? ['on'] : []}
                            onChange={(val) => setClassifyPageTopics(Array.isArray(val) && val.includes('on'))}
                        />
                    </Box>
                    {projectIdParam ? (
                        <Box sx={{ flex: '1 1 100%', minWidth: 200 }}>
                            <MsqdxCheckboxField
                                label={t('domain.aiFillProjectMetadataLabel')}
                                options={[{ value: 'on', label: t('domain.aiFillProjectMetadataOption') }]}
                                value={aiFillProjectMetadata ? ['on'] : []}
                                onChange={(val) =>
                                    setAiFillProjectMetadata(Array.isArray(val) && val.includes('on'))
                                }
                            />
                        </Box>
                    ) : null}
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
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'var(--msqdx-spacing-xs)',
                            mt: 'var(--msqdx-spacing-sm)',
                        }}
                    >
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
                        {(status === 'scanning' || status === 'queued' || status === 'paused' || status === 'cancelling') && (
                            <MsqdxButton variant="outlined" size="small" onClick={() => void sendScanControl('cancel')}>
                                {status === 'cancelling' ? t('domain.finalizeCancelScan') : t('domain.cancelScan')}
                            </MsqdxButton>
                        )}
                    </Box>
                )}
            </Box>

            <Box sx={{ maxWidth: 800, mx: 'auto', mt: MSQDX_SPACING.scale.md }}>
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
                            borderRadius: 'var(--msqdx-radius-sm)',
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
