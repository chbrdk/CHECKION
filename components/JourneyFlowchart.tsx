'use client';

import React from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton } from '@msqdx/react';
import { ChevronRight } from 'lucide-react';
import type { JourneyStep } from '@/lib/types';

interface JourneyFlowchartProps {
    steps: JourneyStep[];
    goalReached: boolean;
    message?: string;
    onStepClick?: (step: JourneyStep) => void;
    t: (key: string) => string;
}

function shortUrl(url: string, maxLen = 50): string {
    try {
        const u = new URL(url);
        const path = u.pathname.replace(/\/$/, '') || '/';
        const full = u.origin + path;
        return full.length <= maxLen ? full : full.slice(0, maxLen - 3) + '...';
    } catch {
        return url.length <= maxLen ? url : url.slice(0, maxLen - 3) + '...';
    }
}

export function JourneyFlowchart({
    steps,
    goalReached,
    message,
    onStepClick,
    t,
}: JourneyFlowchartProps) {
    if (steps.length === 0) {
        return (
            <Box sx={{ py: 3, textAlign: 'center' }}>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    {t('domainResult.journeyNoSteps')}
                </MsqdxTypography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(goalReached || message) && (
                <Box sx={{ mb: 2 }}>
                    {goalReached && (
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-secondary-dx-green)', fontWeight: 600 }}>
                            {t('domainResult.journeyGoalReached')}
                        </MsqdxTypography>
                    )}
                    {message && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                            {message}
                        </MsqdxTypography>
                    )}
                </Box>
            )}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 'var(--msqdx-spacing-xs)',
                }}
            >
                {steps.map((step, i) => (
                    <React.Fragment key={step.index}>
                        {i > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', color: 'var(--color-text-muted-on-light)' }}>
                                <ChevronRight size={20} />
                                {step.triggerLabel && (
                                    <MsqdxTypography variant="caption" sx={{ ml: 0.5, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.triggerLabel}>
                                        {step.triggerLabel}
                                    </MsqdxTypography>
                                )}
                            </Box>
                        )}
                        <MsqdxButton
                            variant="outlined"
                            size="small"
                            onClick={() => onStepClick?.(step)}
                            sx={{
                                textTransform: 'none',
                                minWidth: 140,
                                maxWidth: 220,
                                justifyContent: 'flex-start',
                                borderColor: goalReached && i === steps.length - 1 ? 'var(--color-secondary-dx-green)' : undefined,
                            }}
                        >
                            <Box sx={{ textAlign: 'left', overflow: 'hidden' }}>
                                <MsqdxTypography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                                    {t('domainResult.journeyStep')} {step.index + 1}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.pageUrl}>
                                    {step.pageTitle || shortUrl(step.pageUrl)}
                                </MsqdxTypography>
                            </Box>
                        </MsqdxButton>
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    );
}
