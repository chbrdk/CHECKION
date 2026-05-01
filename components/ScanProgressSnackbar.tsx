'use client';

import type { SyntheticEvent } from 'react';
import { Box, LinearProgress } from '@mui/material';
import { MsqdxSnackbar, MsqdxTypography } from '@msqdx/react';
import type { Device, ScanDevicePhase } from '@/lib/types';
import type { ScanMetaPhase } from '@/lib/scan-progress';

const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];

export function ScanProgressSnackbar(props: {
    open: boolean;
    onClose: (event: SyntheticEvent | Event, reason: string) => void;
    title: string;
    metaPhase: ScanMetaPhase | null;
    devicePhaseByDevice: Partial<Record<Device, ScanDevicePhase>>;
    tDevice: (device: Device) => string;
    tPhase: (phase: ScanDevicePhase) => string;
    tMeta: (meta: ScanMetaPhase) => string;
}) {
    const { open, onClose, title, metaPhase, devicePhaseByDevice, tDevice, tPhase, tMeta } = props;

    return (
        <MsqdxSnackbar
            open={open}
            onClose={onClose}
            autoHideDuration={null}
            role="status"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            message={
                <Box sx={{ minWidth: { xs: 280, sm: 360 }, maxWidth: 440, py: 0.5 }}>
                    <MsqdxTypography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'inherit' }}>
                        {title}
                    </MsqdxTypography>
                    <LinearProgress
                        variant="indeterminate"
                        sx={{
                            mb: 1.5,
                            height: 4,
                            borderRadius: 1,
                            bgcolor: 'rgba(0,0,0,0.08)',
                            '& .MuiLinearProgress-bar': { borderRadius: 1 },
                        }}
                    />
                    {metaPhase ? (
                        <MsqdxTypography
                            variant="caption"
                            component="div"
                            sx={{ display: 'block', mb: 1, color: 'var(--color-text-muted-on-light, rgba(0,0,0,0.6))' }}
                        >
                            {tMeta(metaPhase)}
                        </MsqdxTypography>
                    ) : null}
                    <Box component="ul" sx={{ m: 0, pl: 2.25, listStyle: 'disc' }}>
                        {DEVICES.map((d) => (
                            <Box component="li" key={d} sx={{ mb: 0.35 }}>
                                <MsqdxTypography variant="caption" component="span" sx={{ color: 'inherit' }}>
                                    <strong>{tDevice(d)}</strong>
                                    {' · '}
                                    {devicePhaseByDevice[d]
                                        ? tPhase(devicePhaseByDevice[d]!)
                                        : '…'}
                                </MsqdxTypography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            }
            variant="outlined"
            brandColor="green"
        />
    );
}
