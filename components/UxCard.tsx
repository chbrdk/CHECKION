import React from 'react';
import { Box, LinearProgress, Stack } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
    MsqdxTooltip,
    MsqdxIcon
} from '@msqdx/react';
import {
    MSQDX_SPACING,
    MSQDX_BRAND_PRIMARY,
    MSQDX_STATUS,
    MSQDX_NEUTRAL
} from '@msqdx/tokens';
import { Laptop, Smartphone, Type, MousePointerClick } from 'lucide-react';
import type { UxResult } from '@/lib/types';

interface UxCardProps {
    ux: UxResult;
}

export const UxCard = ({ ux }: UxCardProps) => {
    // Determine Score Color
    let scoreColor = MSQDX_STATUS.success.base;
    if (ux.score < 50) scoreColor = MSQDX_STATUS.error.base;
    else if (ux.score < 80) scoreColor = MSQDX_STATUS.warning.base;

    // CLS Color
    const clsColor = ux.cls <= 0.1 ? MSQDX_STATUS.success.base : ux.cls <= 0.25 ? MSQDX_STATUS.warning.base : MSQDX_STATUS.error.base;

    return (
        <MsqdxMoleculeCard
            title="User Experience Scan"
            description="Analysis of visual stability, interactivity, and content."
            headerActions={
                <MsqdxChip
                    label={`Score: ${ux.score}/100`}
                    color={ux.score >= 80 ? 'success' : ux.score >= 50 ? 'warning' : 'error'}
                    size="small"
                />
            }
        >
            <Stack spacing={MSQDX_SPACING.scale.md}>
                {/* Visual Stability (CLS) */}
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <MsqdxIcon name="Monitor" size="small" />
                        <MsqdxTypography variant="body2" color="textSecondary">
                            Visual Stability (CLS)
                        </MsqdxTypography>
                        <MsqdxTooltip title="Cumulative Layout Shift measures how much the page content shifts unexpectedly. Lower is better. Goal: < 0.1">
                            <MsqdxTypography variant="caption" sx={{ cursor: 'help', color: MSQDX_BRAND_PRIMARY.blue }}>
                                ?
                            </MsqdxTypography>
                        </MsqdxTooltip>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, color: clsColor }}>
                            {ux.cls}
                        </MsqdxTypography>
                        <Box sx={{ flex: 1 }}>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(100, (ux.cls / 0.5) * 100)} // Scale 0.5 as max bad
                                sx={{
                                    height: 6,
                                    borderRadius: 3,
                                    bgcolor: MSQDX_NEUTRAL[200],
                                    '& .MuiLinearProgress-bar': { bgcolor: clsColor },
                                }}
                            />
                        </Box>
                    </Stack>
                </Box>

                {/* Readability */}
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <Type size={16} />
                        <MsqdxTypography variant="body2" color="textSecondary">
                            Content Readability
                        </MsqdxTypography>
                    </Stack>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <MsqdxChip
                            label={ux.readability.grade}
                            color="default"
                            size="small"
                            variant="outlined"
                        />
                        <MsqdxTypography variant="caption" color="textSecondary">
                            Flesch-Kincaid: {ux.readability.score}
                        </MsqdxTypography>
                    </Stack>
                </Box>

                {/* Mobile & Touch */}
                <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1, p: 1.5, bgcolor: MSQDX_NEUTRAL[50], borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <Smartphone size={16} color={ux.viewport.isMobileFriendly ? MSQDX_STATUS.success.base : MSQDX_STATUS.error.base} />
                            <MsqdxTypography variant="caption" fontWeight={600}>
                                Mobile Viewport
                            </MsqdxTypography>
                        </Stack>
                        <MsqdxTypography variant="body2" color={ux.viewport.isMobileFriendly ? 'success' : 'error'}>
                            {ux.viewport.isMobileFriendly ? 'Optimized' : 'Issues Found'}
                        </MsqdxTypography>
                    </Box>

                    <Box sx={{ flex: 1, p: 1.5, bgcolor: MSQDX_NEUTRAL[50], borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <MousePointerClick size={16} color={ux.tapTargets.issues.length === 0 ? MSQDX_STATUS.success.base : MSQDX_STATUS.warning.base} />
                            <MsqdxTypography variant="caption" fontWeight={600}>
                                Tap Targets
                            </MsqdxTypography>
                        </Stack>
                        <MsqdxTypography variant="body2">
                            {ux.tapTargets.issues.length > 0 ? `${ux.tapTargets.issues.length} Small targets` : 'All Good'}
                        </MsqdxTypography>
                    </Box>
                </Stack>
            </Stack>
        </MsqdxMoleculeCard>
    );
};
