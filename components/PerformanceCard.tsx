import React from 'react';
import { Box } from '@mui/material';
import { Timer, Zap, Layout } from 'lucide-react';
import { MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { ScanResult } from '../lib/types';
import { MSQDX_SPACING, MSQDX_STATUS, MSQDX_NEUTRAL } from '@msqdx/tokens';

interface PerformanceCardProps {
    perf: NonNullable<ScanResult['performance']>;
}

// Thresholds in ms
const METRICS_CONFIG = {
    ttfb: { label: 'TTFB', icon: Timer, good: 800, poor: 1800 },
    fcp: { label: 'FCP', icon: Zap, good: 1800, poor: 3000 },
    windowLoad: { label: 'Load', icon: Layout, good: 2500, poor: 4500 },
};

function getStatusColor(value: number, metric: keyof typeof METRICS_CONFIG) {
    if (value <= METRICS_CONFIG[metric].good) return MSQDX_STATUS.success.base;
    if (value <= METRICS_CONFIG[metric].poor) return MSQDX_STATUS.warning.base;
    return MSQDX_STATUS.error.base;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({ perf }) => {
    return (
        <MsqdxMoleculeCard
            title="Performance"
            description="Ladezeiten & Core Web Vitals (Lab Data)"
        >
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: `${MSQDX_SPACING.scale.md}px`, height: '100%' }}>
                {Object.entries(METRICS_CONFIG).map(([key, config]) => {
                    const value = perf[key as keyof typeof METRICS_CONFIG];
                    const color = getStatusColor(value, key as keyof typeof METRICS_CONFIG);
                    const Icon = config.icon;

                    return (
                        <Box key={key} sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            borderRadius: '12px',
                            border: `1px solid ${MSQDX_NEUTRAL[200]}`,
                            backgroundColor: MSQDX_NEUTRAL[50], // Very light grey bg
                        }}>
                            <Icon size={20} color={MSQDX_NEUTRAL[600]} style={{ marginBottom: 8 }} />
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_NEUTRAL[600], fontWeight: 500, mb: 0.5 }}>
                                {config.label}
                            </MsqdxTypography>
                            <MsqdxTypography variant="h4" sx={{ color: color, fontWeight: 700 }}>
                                {value}ms
                            </MsqdxTypography>
                            <Box sx={{ width: '100%', height: 4, bgcolor: MSQDX_NEUTRAL[200], borderRadius: 2, mt: 1, overflow: 'hidden' }}>
                                <Box sx={{ width: '100%', height: '100%', bgcolor: color, opacity: 0.6 }} />
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </MsqdxMoleculeCard>
    );
};
