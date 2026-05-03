'use client';

import type { SyntheticEvent } from 'react';
import Link from 'next/link';
import { Box, LinearProgress } from '@mui/material';
import { MsqdxSnackbar, MsqdxTypography, MsqdxButton } from '@msqdx/react';
import type { DomainScanStatus } from '@/lib/types';
import { pathDomain, pathScanDomain } from '@/lib/constants';

function terminalStatus(s: DomainScanStatus): boolean {
    return s === 'complete' || s === 'error' || s === 'cancelled';
}

export function DomainScanProgressSnackbar(props: {
    open: boolean;
    scanId: string | null;
    onClose: (event: SyntheticEvent | Event, reason: string) => void;
    title: string;
    domainLabel: string | null;
    status: DomainScanStatus;
    scannedCount: number;
    progressTotal: number;
    currentUrl: string | null;
    errorMessage: string | null;
    startUrl: string | null;
    maxPages: number;
    projectId: string | null;
    classifyPageTopics: boolean;
    aiFillProjectMetadata: boolean;
    labels: {
        statusLine: string;
        scannedLine: string;
        liveLink: string;
        resultsLink: string;
        dismiss: string;
        pause: string;
        resume: string;
        cancel: string;
    };
    onPause: () => void;
    onResume: () => void;
    onCancel: () => void;
}) {
    const {
        open,
        scanId,
        onClose,
        title,
        domainLabel,
        status,
        scannedCount,
        progressTotal,
        currentUrl,
        errorMessage,
        startUrl,
        maxPages,
        projectId,
        classifyPageTopics,
        aiFillProjectMetadata,
        labels,
        onPause,
        onResume,
        onCancel,
    } = props;

    const liveHref =
        startUrl != null
            ? pathScanDomain({
                  url: startUrl,
                  maxPages,
                  ...(scanId ? { scanId } : {}),
                  ...(projectId ? { projectId } : {}),
                  ...(classifyPageTopics ? { classifyPageTopics: true } : {}),
                  ...(projectId && aiFillProjectMetadata === false ? { aiFillProjectMetadata: false } : {}),
              })
            : null;

    const resultsHref =
        scanId != null ? pathDomain(scanId, projectId ? { projectId } : undefined) : null;

    const showControls =
        status === 'scanning' || status === 'queued' || status === 'paused' || status === 'cancelling';
    const showPause = status === 'scanning' || status === 'queued';
    const showResume = status === 'paused';
    const progressKnown = progressTotal > 0;
    const progressPct = progressKnown ? Math.min(100, (scannedCount / progressTotal) * 100) : 0;
    const isTerminal = terminalStatus(status);
    const dismissible = isTerminal;

    return (
        <MsqdxSnackbar
            open={open}
            onClose={onClose}
            autoHideDuration={null}
            role="status"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            message={
                <Box sx={{ minWidth: { xs: 280, sm: 360 }, maxWidth: 440, py: 0.5 }}>
                    <MsqdxTypography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: 'inherit' }}>
                        {title}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" component="div" sx={{ mb: 0.75, color: 'inherit' }}>
                        {domainLabel ?? '—'}
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" component="div" sx={{ mb: 1, color: 'inherit' }}>
                        {labels.statusLine}: {status.toUpperCase()}
                        {' · '}
                        {labels.scannedLine}: {scannedCount}
                        {progressKnown ? ` / ${progressTotal}` : ''}
                    </MsqdxTypography>
                    {!isTerminal && (
                        <LinearProgress
                            variant={progressKnown ? 'determinate' : 'indeterminate'}
                            value={progressKnown ? progressPct : undefined}
                            sx={{
                                mb: 1,
                                height: 4,
                                borderRadius: 1,
                                bgcolor: 'rgba(0,0,0,0.08)',
                                '& .MuiLinearProgress-bar': { borderRadius: 1 },
                            }}
                        />
                    )}
                    {currentUrl ? (
                        <MsqdxTypography
                            variant="caption"
                            component="div"
                            sx={{
                                display: 'block',
                                mb: 1,
                                wordBreak: 'break-all',
                                color: 'var(--color-text-muted-on-light, rgba(0,0,0,0.6))',
                            }}
                        >
                            {currentUrl}
                        </MsqdxTypography>
                    ) : null}
                    {status === 'error' && errorMessage ? (
                        <MsqdxTypography variant="caption" component="div" sx={{ mb: 1, color: 'error.main' }}>
                            {errorMessage}
                        </MsqdxTypography>
                    ) : null}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mt: 0.5 }}>
                        {liveHref ? (
                            <Link href={liveHref} prefetch={false} style={{ textDecoration: 'none' }}>
                                <MsqdxButton size="small" variant="outlined" sx={{ minHeight: 28 }}>
                                    {labels.liveLink}
                                </MsqdxButton>
                            </Link>
                        ) : null}
                        {status === 'complete' && resultsHref ? (
                            <Link href={resultsHref} prefetch={false} style={{ textDecoration: 'none' }}>
                                <MsqdxButton size="small" variant="contained" sx={{ minHeight: 28 }}>
                                    {labels.resultsLink}
                                </MsqdxButton>
                            </Link>
                        ) : null}
                        {showControls && showPause ? (
                            <MsqdxButton size="small" variant="outlined" onClick={onPause} sx={{ minHeight: 28 }}>
                                {labels.pause}
                            </MsqdxButton>
                        ) : null}
                        {showControls && showResume ? (
                            <MsqdxButton size="small" variant="outlined" onClick={onResume} sx={{ minHeight: 28 }}>
                                {labels.resume}
                            </MsqdxButton>
                        ) : null}
                        {showControls ? (
                            <MsqdxButton size="small" variant="outlined" onClick={onCancel} sx={{ minHeight: 28 }}>
                                {labels.cancel}
                            </MsqdxButton>
                        ) : null}
                        {dismissible ? (
                            <MsqdxButton size="small" variant="text" onClick={(e) => onClose(e, 'dismiss')} sx={{ minHeight: 28 }}>
                                {labels.dismiss}
                            </MsqdxButton>
                        ) : null}
                    </Box>
                </Box>
            }
            variant="outlined"
            brandColor="green"
        />
    );
}
