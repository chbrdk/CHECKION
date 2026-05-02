'use client';

import React from 'react';
import { Box } from '@mui/material';
import { Leaf } from 'lucide-react';
import { MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { ScanResult } from '../lib/types';
import { MSQDX_NEUTRAL } from '@msqdx/tokens';
import { useI18n } from '@/components/i18n/I18nProvider';

interface EcoCardProps {
    eco: NonNullable<ScanResult['eco']>;
    sx?: React.ComponentProps<typeof MsqdxMoleculeCard>['sx'];
}

const GRADE_COLORS: Record<string, string> = {
    'A+': '#22c55e', // Green 500
    'A': '#4ade80',  // Green 400
    'B': '#84cc16',  // Lime 500
    'C': '#eab308',  // Yellow 500
    'D': '#f97316',  // Orange 500
    'E': '#ef4444',  // Red 500
    'F': '#b91c1c',  // Red 700
};

export const EcoCard: React.FC<EcoCardProps> = ({ eco, sx }) => {
    const { t } = useI18n();
    const gradeColor = GRADE_COLORS[eco.grade] || MSQDX_NEUTRAL[500];
    const hasGreenWebInfo =
        eco.greenWebCheckedAt != null ||
        eco.greenWebSource != null ||
        eco.greenWebHosted !== undefined;

    return (
        <MsqdxMoleculeCard
            title="Eco Score"
            subtitle="Geschätzter CO2-Fußabdruck pro Seitenaufruf"
            sx={{ bgcolor: 'var(--color-card-bg)', ...sx }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', height: '100%' }}>
                {/* Grade Circle */}
                <Box sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    border: `4px solid ${gradeColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${gradeColor}20`, // 20% opacity
                }}>
                    <MsqdxTypography
                        variant="h2"
                        sx={{
                            color: gradeColor,
                            lineHeight: 1,
                        }}
                    >
                        {eco.grade}
                    </MsqdxTypography>
                </Box>

                {/* Details */}
                <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 'var(--msqdx-spacing-xxs)', mb: 'var(--msqdx-spacing-xs)' }}>
                        <MsqdxTypography variant="h3" sx={{ fontWeight: 700, color: 'var(--color-text-on-light)' }}>
                            {eco.co2}g
                        </MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            CO2 / View
                        </MsqdxTypography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-muted-on-light)' }}>
                        <Leaf size={16} color={gradeColor} />
                        <MsqdxTypography variant="body2">
                            {(eco.pageWeight / 1024 / 1024).toFixed(2)} MB Transfer
                        </MsqdxTypography>
                    </Box>

                    <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1, color: 'var(--color-text-muted-on-light)' }}>
                        Cleaner than ~{getPercentile(eco.co2)}% of pages
                    </MsqdxTypography>
                    {hasGreenWebInfo ? (
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'var(--color-text-muted-on-light)' }}>
                            {t('results.ecoGreenWebPrefix')}{' '}
                            {eco.greenWebHosted === true
                                ? t('results.ecoGreenWebYes')
                                : eco.greenWebHosted === false
                                  ? t('results.ecoGreenWebNo')
                                  : t('results.ecoGreenWebUnknown')}
                            {eco.greenWebCheckedAt
                                ? t('results.ecoGreenWebDateSuffix', { date: eco.greenWebCheckedAt })
                                : ''}
                            {eco.greenWebSource ? ` · ${eco.greenWebSource}` : ''}
                        </MsqdxTypography>
                    ) : null}
                </Box>
            </Box>
        </MsqdxMoleculeCard>
    );
};

// Rough percentile estimation based on HTTP Archive / SWD
function getPercentile(co2: number): number {
    if (co2 < 0.1) return 95;
    if (co2 < 0.2) return 80;
    if (co2 < 0.5) return 50;
    if (co2 < 0.8) return 20;
    return 5;
}
