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
    let scoreColor: string = MSQDX_STATUS.success.base;
    if (ux.score < 50) scoreColor = MSQDX_STATUS.error.base;
    else if (ux.score < 80) scoreColor = MSQDX_STATUS.warning.base;

    // CLS Color
    const clsColor = ux.cls <= 0.1 ? MSQDX_STATUS.success.base : ux.cls <= 0.25 ? MSQDX_STATUS.warning.base : MSQDX_STATUS.error.base;

    return (
        <MsqdxMoleculeCard
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            title="User Experience Scan"
            subtitle="Analysis of visual stability, interactivity, and content."
            headerActions={
                <MsqdxChip
                    label={`Score: ${ux.score}/100`}
                    color={ux.score >= 80 ? 'success' : ux.score >= 50 ? 'warning' : 'error'}
                    size="small"
                />
            }
        >
            <Stack spacing={1.5}>
                {/* Visual Stability (CLS) */}
                <Box>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                        <MsqdxIcon name="Monitor" size="sm" />
                        <MsqdxTypography variant="body2" color="textSecondary">
                            Visual Stability (CLS)
                        </MsqdxTypography>
                        <MsqdxTooltip title="Cumulative Layout Shift measures how much the page content shifts unexpectedly. Lower is better. Goal: < 0.1">
                            <MsqdxTypography variant="caption" sx={{ cursor: 'help', color: MSQDX_BRAND_PRIMARY.purple }}>
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
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
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
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                                Tap Targets
                            </MsqdxTypography>
                        </Stack>
                        <MsqdxTypography variant="body2">
                            {ux.tapTargets.issues.length > 0 ? `${ux.tapTargets.issues.length} Small targets` : 'All Good'}
                        </MsqdxTypography>
                    </Box>
                </Stack>

                {/* Skip Link (accessibility) */}
                {ux.hasSkipLink !== undefined && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                            Skip-Link
                        </MsqdxTypography>
                        {ux.hasSkipLink ? (
                            <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.success.base }}>
                                Vorhanden {ux.skipLinkHref ? `(${ux.skipLinkHref})` : ''}
                            </MsqdxTypography>
                        ) : (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Fehlt – Empfohlen für Tastatur-/Screenreader-Nutzung.
                            </MsqdxTypography>
                        )}
                    </Box>
                )}

                {ux.resourceHints && (ux.resourceHints.preload.length > 0 || ux.resourceHints.preconnect.length > 0) && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Resource Hints</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            preload: {ux.resourceHints.preload.length}, preconnect: {ux.resourceHints.preconnect.length}
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.reducedMotionInCss !== undefined && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Reduced Motion</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: ux.reducedMotionInCss ? MSQDX_STATUS.success.base : 'var(--color-text-muted-on-light)' }}>
                            {ux.reducedMotionInCss ? 'CSS berücksichtigt prefers-reduced-motion' : 'Kein @media (prefers-reduced-motion) gefunden'}
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.focusVisibleFailCount !== undefined && ux.focusVisibleFailCount > 0 && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Focus Visible</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                            {ux.focusVisibleFailCount} fokussierbare Elemente ohne sichtbaren Fokus-Stil
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.mediaAccessibility && (ux.mediaAccessibility.videosWithoutCaptions > 0 || ux.mediaAccessibility.audiosWithoutTranscript > 0) && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Video/Audio</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                            {ux.mediaAccessibility.videosWithoutCaptions > 0 && `${ux.mediaAccessibility.videosWithoutCaptions} Video(s) ohne Captions`}
                            {ux.mediaAccessibility.videosWithoutCaptions > 0 && ux.mediaAccessibility.audiosWithoutTranscript > 0 && ', '}
                            {ux.mediaAccessibility.audiosWithoutTranscript > 0 && `${ux.mediaAccessibility.audiosWithoutTranscript} Audio(s) ohne Transcript`}
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.headingHierarchy && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Überschriften</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: ux.headingHierarchy.hasSingleH1 ? MSQDX_STATUS.success.base : MSQDX_STATUS.warning.base }}>
                            {ux.headingHierarchy.hasSingleH1 ? 'Eine H1' : `H1: ${ux.headingHierarchy.h1Count}`}
                            {ux.headingHierarchy.skippedLevels.length > 0 && ` · Übersprungen: ${ux.headingHierarchy.skippedLevels.map(s => `H${s.from}→H${s.to}`).join(', ')}`}
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.imageIssues && (ux.imageIssues.missingDimensions > 0 || ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0) && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Bilder</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            {ux.imageIssues.missingDimensions > 0 && `${ux.imageIssues.missingDimensions} ohne width/height`}
                            {ux.imageIssues.missingDimensions > 0 && (ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0) && ', '}
                            {ux.imageIssues.missingLazy > 0 && `${ux.imageIssues.missingLazy} ohne loading=lazy`}
                            {ux.imageIssues.missingLazy > 0 && ux.imageIssues.missingSrcset > 0 && ', '}
                            {ux.imageIssues.missingSrcset > 0 && `${ux.imageIssues.missingSrcset} ohne srcset`}
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.metaRefreshPresent !== undefined && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Meta Refresh</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: ux.metaRefreshPresent ? MSQDX_STATUS.warning.base : MSQDX_STATUS.success.base }}>
                            {ux.metaRefreshPresent ? 'Vorhanden (nicht empfohlen)' : 'Nicht vorhanden'}
                        </MsqdxTypography>
                    </Box>
                )}
                {ux.fontDisplayIssues && (ux.fontDisplayIssues.withoutFontDisplay > 0 || ux.fontDisplayIssues.blockCount > 0) && (
                    <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: `${MSQDX_SPACING.borderRadius.md}px` }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>Schriftarten</MsqdxTypography>
                        <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                            {ux.fontDisplayIssues.withoutFontDisplay > 0 && `${ux.fontDisplayIssues.withoutFontDisplay} @font-face ohne font-display`}
                            {ux.fontDisplayIssues.withoutFontDisplay > 0 && ux.fontDisplayIssues.blockCount > 0 && ', '}
                            {ux.fontDisplayIssues.blockCount > 0 && `${ux.fontDisplayIssues.blockCount} mit block (FOUT/CLS-Risiko)`}
                        </MsqdxTypography>
                    </Box>
                )}
            </Stack>
        </MsqdxMoleculeCard>
    );
};
