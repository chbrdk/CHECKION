'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { Box } from '@mui/material';
import type { Device, ScanDevicePhase } from '@/lib/types';
import type { ScanMetaPhase, ScanNdjsonLine } from '@/lib/scan-progress';
import {
    initialSinglePageScanUi,
    initialDomainScanUi,
    type SinglePageScanUiState,
    type DomainScanUiState,
    type DomainScanSessionPayload,
} from '@/lib/status-ui/types';
import {
    clearDomainScanSession,
    readDomainScanSession,
    writeDomainScanSession,
} from '@/lib/status-ui/domain-scan-session-storage';
import { isTerminalDomainScanStatus } from '@/lib/status-ui/domain-scan-utils';
import { apiScanDomainControl, apiScanDomainStatus } from '@/lib/constants';
import { ScanProgressSnackbar } from '@/components/ScanProgressSnackbar';
import { DomainScanProgressSnackbar } from '@/components/DomainScanProgressSnackbar';
import { useI18n } from '@/components/i18n/I18nProvider';

export type StatusUiContextValue = {
    singlePageScan: SinglePageScanUiState & {
        openSession: () => void;
        resetPhases: () => void;
        setMetaPhase: (phase: ScanMetaPhase | null) => void;
        setDevicePhase: (device: Device, phase: ScanDevicePhase) => void;
        close: () => void;
        applyProgressLine: (line: ScanNdjsonLine) => void;
    };
    /** Global deep (domain) scan: polling + sessionStorage; snackbar in chrome. */
    domainScan: DomainScanUiState & {
        attach: (payload: DomainScanSessionPayload) => void;
        dismiss: () => void;
        sendControl: (action: 'pause' | 'resume' | 'cancel') => Promise<void>;
    };
};

const StatusUiContext = createContext<StatusUiContextValue | null>(null);

export function useStatusUi(): StatusUiContextValue {
    const ctx = useContext(StatusUiContext);
    if (!ctx) {
        throw new Error('useStatusUi must be used within StatusUiProvider');
    }
    return ctx;
}

export function StatusUiProvider({ children }: { children: ReactNode }) {
    const [single, setSingle] = useState<SinglePageScanUiState>(() => initialSinglePageScanUi());
    const [domain, setDomain] = useState<DomainScanUiState>(() => initialDomainScanUi());

    const openSession = useCallback(() => {
        setSingle({
            kind: 'single_page_scan',
            open: true,
            metaPhase: null,
            devicePhaseByDevice: {},
        });
    }, []);

    const resetPhases = useCallback(() => {
        setSingle((s) => ({
            ...s,
            metaPhase: null,
            devicePhaseByDevice: {},
        }));
    }, []);

    const setMetaPhase = useCallback((phase: ScanMetaPhase | null) => {
        setSingle((s) => ({ ...s, metaPhase: phase }));
    }, []);

    const setDevicePhase = useCallback((device: Device, phase: ScanDevicePhase) => {
        setSingle((s) => ({
            ...s,
            devicePhaseByDevice: { ...s.devicePhaseByDevice, [device]: phase },
        }));
    }, []);

    const closeSingle = useCallback(() => {
        setSingle(initialSinglePageScanUi());
    }, []);

    const applyProgressLine = useCallback((line: ScanNdjsonLine) => {
        if (line.type !== 'progress') return;
        if ('device' in line && line.device) {
            setSingle((s) => ({
                ...s,
                devicePhaseByDevice: { ...s.devicePhaseByDevice, [line.device]: line.phase },
            }));
        } else {
            setSingle((s) => ({ ...s, metaPhase: line.phase as ScanMetaPhase }));
        }
    }, []);

    const attachDomainScan = useCallback((payload: DomainScanSessionPayload) => {
        writeDomainScanSession(payload);
        setDomain({
            ...initialDomainScanUi(),
            open: true,
            scanId: payload.scanId,
            startUrl: payload.startUrl,
            maxPages: payload.maxPages,
            projectId: payload.projectId,
            classifyPageTopics: payload.classifyPageTopics,
            aiFillProjectMetadata: payload.aiFillProjectMetadata,
            progressTotal: payload.maxPages,
            status: 'queued',
        });
    }, []);

    const dismissDomainScan = useCallback(() => {
        clearDomainScanSession();
        setDomain(initialDomainScanUi());
    }, []);

    const sendDomainScanControl = useCallback(
        async (action: 'pause' | 'resume' | 'cancel') => {
            const id = domain.scanId;
            if (!id) return;
            try {
                const res = await fetch(apiScanDomainControl(id), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ action }),
                });
                if (res.ok) {
                    const j = (await res.json().catch(() => ({}))) as { status?: string };
                    if (j?.status) {
                        setDomain((prev) =>
                            prev.scanId === id ? { ...prev, status: j.status as DomainScanUiState['status'] } : prev
                        );
                    }
                }
            } catch {
                /* ignore */
            }
        },
        [domain.scanId]
    );

    const hydratedRef = useRef(false);
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;
        const saved = readDomainScanSession();
        if (!saved) return;
        setDomain({
            ...initialDomainScanUi(),
            open: true,
            scanId: saved.scanId,
            startUrl: saved.startUrl,
            maxPages: saved.maxPages,
            projectId: saved.projectId,
            classifyPageTopics: saved.classifyPageTopics,
            aiFillProjectMetadata: saved.aiFillProjectMetadata,
            progressTotal: saved.maxPages,
            status: 'queued',
        });
    }, []);

    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!domain.open || !domain.scanId) {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            return;
        }

        const sid = domain.scanId;
        let cancelled = false;

        const clearPoll = () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };

        const tick = async () => {
            if (cancelled) return;
            try {
                const res = await fetch(apiScanDomainStatus(sid), { credentials: 'same-origin' });
                if (!res.ok) {
                    if (res.status === 401 || res.status === 404) {
                        clearPoll();
                        clearDomainScanSession();
                        setDomain(initialDomainScanUi());
                    }
                    return;
                }
                const data = (await res.json()) as {
                    id?: string;
                    domain?: string;
                    status?: DomainScanUiState['status'];
                    progress?: { scanned?: number; total?: number; currentUrl?: string };
                    totalPages?: number;
                    error?: string;
                };
                if (cancelled) return;

                setDomain((prev) => {
                    if (prev.scanId !== sid) return prev;
                    const progress = data.progress ?? {};
                    const scanned = typeof progress.scanned === 'number' ? progress.scanned : prev.scannedCount;
                    const total =
                        typeof progress.total === 'number'
                            ? progress.total
                            : typeof data.totalPages === 'number'
                              ? data.totalPages
                              : prev.progressTotal;
                    const next: DomainScanUiState = {
                        ...prev,
                        domainLabel: typeof data.domain === 'string' ? data.domain : prev.domainLabel,
                        status: (data.status ?? prev.status) as DomainScanUiState['status'],
                        scannedCount: scanned,
                        progressTotal: total,
                        currentUrl: typeof progress.currentUrl === 'string' ? progress.currentUrl : null,
                        errorMessage:
                            typeof data.error === 'string' ? data.error : prev.errorMessage,
                    };

                    if (data.status && isTerminalDomainScanStatus(data.status)) {
                        clearPoll();
                        clearDomainScanSession();
                    }
                    return next;
                });
            } catch {
                /* network */
            }
        };

        clearPoll();
        pollIntervalRef.current = setInterval(() => void tick(), 2000);
        void tick();

        return () => {
            cancelled = true;
            clearPoll();
        };
    }, [domain.open, domain.scanId]);

    const value = useMemo<StatusUiContextValue>(
        () => ({
            singlePageScan: {
                ...single,
                openSession,
                resetPhases,
                setMetaPhase,
                setDevicePhase,
                close: closeSingle,
                applyProgressLine,
            },
            domainScan: {
                ...domain,
                attach: attachDomainScan,
                dismiss: dismissDomainScan,
                sendControl: sendDomainScanControl,
            },
        }),
        [
            single,
            domain,
            openSession,
            resetPhases,
            setMetaPhase,
            setDevicePhase,
            closeSingle,
            applyProgressLine,
            attachDomainScan,
            dismissDomainScan,
            sendDomainScanControl,
        ]
    );

    return (
        <StatusUiContext.Provider value={value}>
            {children}
            <StatusUiChrome />
        </StatusUiContext.Provider>
    );
}

function StatusUiChrome() {
    const { t } = useI18n();
    const { singlePageScan, domainScan } = useStatusUi();

    return (
        <Box
            sx={{
                position: 'fixed',
                right: { xs: 8, sm: 24 },
                bottom: 24,
                left: { xs: 8, sm: 'auto' },
                zIndex: (theme) => theme.zIndex.snackbar,
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: 2,
                alignItems: 'stretch',
                maxWidth: { xs: 'calc(100vw - 16px)', sm: 440 },
                pointerEvents: 'none',
                '& > *': { pointerEvents: 'auto' },
            }}
        >
            <DomainScanProgressSnackbar
                open={domainScan.open}
                scanId={domainScan.scanId}
                onClose={(_, reason) => {
                    if (!isTerminalDomainScanStatus(domainScan.status)) {
                        if (reason === 'clickaway') return;
                        return;
                    }
                    if (reason === 'clickaway') return;
                    domainScan.dismiss();
                }}
                title={t('domain.snackbar.title')}
                domainLabel={domainScan.domainLabel}
                status={domainScan.status}
                scannedCount={domainScan.scannedCount}
                progressTotal={domainScan.progressTotal}
                currentUrl={domainScan.currentUrl}
                errorMessage={domainScan.errorMessage}
                startUrl={domainScan.startUrl}
                maxPages={domainScan.maxPages}
                projectId={domainScan.projectId}
                classifyPageTopics={domainScan.classifyPageTopics}
                aiFillProjectMetadata={domainScan.aiFillProjectMetadata}
                labels={{
                    statusLine: t('domain.status'),
                    scannedLine: t('domain.scannedPages'),
                    liveLink: t('domain.snackbar.liveLink'),
                    resultsLink: t('domain.snackbar.resultsLink'),
                    dismiss: t('domain.snackbar.dismiss'),
                    pause: t('domain.pauseScan'),
                    resume: t('domain.resumeScan'),
                    cancel: t('domain.cancelScan'),
                }}
                onPause={() => void domainScan.sendControl('pause')}
                onResume={() => void domainScan.sendControl('resume')}
                onCancel={() => void domainScan.sendControl('cancel')}
            />
            <ScanProgressSnackbar
                open={singlePageScan.open}
                onClose={(_, reason) => {
                    if (reason === 'clickaway') return;
                    singlePageScan.close();
                }}
                title={t('scan.progress.title')}
                metaPhase={singlePageScan.metaPhase}
                devicePhaseByDevice={singlePageScan.devicePhaseByDevice}
                tDevice={(d) => t(`scan.progress.device.${d}`)}
                tPhase={(p) => t(`scan.progress.phase.${p}`)}
                tMeta={(m) => t(`scan.progress.meta.${m}`)}
            />
        </Box>
    );
}
