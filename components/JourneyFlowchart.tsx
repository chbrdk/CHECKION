'use client';

import React from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip } from '@msqdx/react';
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

/** Label for findability: high = easy to find, low = rather hidden. */
function findabilityLabel(score: number | undefined, t: (key: string) => string): string | null {
    if (score == null) return null;
    if (score >= 0.7) return t('domainResult.journeyFindabilityHigh');
    if (score >= 0.4) return t('domainResult.journeyFindabilityMedium');
    return t('domainResult.journeyFindabilityLow');
}

const KNOWN_REGION_TYPES = ['nav', 'hero', 'main', 'footer', 'aside', 'about', 'contact', 'product', 'pricing', 'faq', 'team', 'unknown'];

function regionTypeLabel(semanticType: string | undefined, t: (key: string) => string): string {
    if (!semanticType) return '';
    const key = `domainResult.journeyRegion_${semanticType}`;
    const out = t(key);
    return KNOWN_REGION_TYPES.includes(semanticType) ? out : semanticType.charAt(0).toUpperCase() + semanticType.slice(1);
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
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    color: 'var(--color-text-muted-on-light)',
                                    minWidth: 120,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <ChevronRight size={20} />
                                    {step.triggerLabel && (
                                        <MsqdxTypography variant="caption" sx={{ ml: 0.5, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.triggerLabel}>
                                            {step.triggerLabel}
                                        </MsqdxTypography>
                                    )}
                                </Box>
                                {(step.regionAboveFold != null || step.regionFindability != null || step.regionSemanticType) && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                                        {step.regionSemanticType && regionTypeLabel(step.regionSemanticType, t) && (
                                            <MsqdxChip
                                                size="small"
                                                label={regionTypeLabel(step.regionSemanticType, t)}
                                                sx={{ height: 18, fontSize: '0.65rem' }}
                                                variant="outlined"
                                            />
                                        )}
                                        {step.regionAboveFold != null && (
                                            <MsqdxChip
                                                size="small"
                                                label={step.regionAboveFold ? t('domainResult.journeyAboveFold') : t('domainResult.journeyBelowFold')}
                                                sx={{ height: 18, fontSize: '0.65rem' }}
                                            />
                                        )}
                                        {findabilityLabel(step.regionFindability, t) && (
                                            <MsqdxChip
                                                size="small"
                                                label={findabilityLabel(step.regionFindability, t)}
                                                sx={{
                                                    height: 18,
                                                    fontSize: '0.65rem',
                                                    bgcolor: (step.regionFindability ?? 0) >= 0.7 ? 'var(--color-secondary-dx-green-tint)' : (step.regionFindability ?? 0) >= 0.4 ? 'var(--color-secondary-dx-yellow-tint)' : 'var(--color-secondary-dx-pink-tint)',
                                                }}
                                            />
                                        )}
                                    </Box>
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
