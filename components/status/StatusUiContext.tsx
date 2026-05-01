'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Device, ScanDevicePhase } from '@/lib/types';
import type { ScanMetaPhase, ScanNdjsonLine } from '@/lib/scan-progress';
import {
    initialSinglePageScanUi,
    type SinglePageScanUiState,
} from '@/lib/status-ui/types';
import { ScanProgressSnackbar } from '@/components/ScanProgressSnackbar';
import { useI18n } from '@/components/i18n/I18nProvider';

export type StatusUiContextValue = {
    /** Live status for POST /api/scan (NDJSON stream, 3 devices). */
    singlePageScan: SinglePageScanUiState & {
        openSession: () => void;
        resetPhases: () => void;
        setMetaPhase: (phase: ScanMetaPhase | null) => void;
        setDevicePhase: (device: Device, phase: ScanDevicePhase) => void;
        close: () => void;
        /** Map one NDJSON line to UI (progress only; caller handles complete/error + navigation). */
        applyProgressLine: (line: ScanNdjsonLine) => void;
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

    const close = useCallback(() => {
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

    const value = useMemo<StatusUiContextValue>(
        () => ({
            singlePageScan: {
                ...single,
                openSession,
                resetPhases,
                setMetaPhase,
                setDevicePhase,
                close,
                applyProgressLine,
            },
        }),
        [
            single,
            openSession,
            resetPhases,
            setMetaPhase,
            setDevicePhase,
            close,
            applyProgressLine,
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
    const { singlePageScan } = useStatusUi();

    return (
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
    );
}
