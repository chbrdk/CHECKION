'use client';

import React from 'react';
import { Box, LinearProgress, Stack } from '@mui/material';
import { useI18n } from '@/components/i18n/I18nProvider';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip, MsqdxTooltip, MsqdxIcon } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_BRAND_PRIMARY, MSQDX_STATUS, MSQDX_NEUTRAL } from '@msqdx/tokens';
import { Smartphone, Type, MousePointerClick, Clock } from 'lucide-react';
import type { UxResult } from '@/lib/types';
import { formatDwellRange, formatDwellSeconds, type DwellLocale } from '@/lib/format-dwell-duration';

interface UxCardProps {
    ux: UxResult;
    sx?: React.ComponentProps<typeof MsqdxMoleculeCard>['sx'];
}

export const UxCard = ({ ux, sx }: UxCardProps) => {
    const { t, locale } = useI18n();
    const dwellLocale: DwellLocale = locale === 'en' ? 'en' : 'de';

    // CLS Color
    const clsColor =
        ux.cls <= 0.1
            ? MSQDX_STATUS.success.base
            : ux.cls <= 0.25
              ? MSQDX_STATUS.warning.base
              : MSQDX_STATUS.error.base;

    return (
        <MsqdxMoleculeCard
            sx={{ bgcolor: 'var(--color-card-bg)', ...sx }}
            title="User Experience Scan"
            subtitle="Analysis of visual stability, interactivity, and content."
            headerActions={
                <MsqdxChip
                    label={`Score: ${ux.score}/100`}
                    color={ux.score >= 80 ? 'success' : ux.score >= 50 ? 'warning' : 'error'}
                    size="large"
                    variant="outlined"
                />
            }
        >
            <Box sx={{ width: '100%' }}>
                {/* Score block (CLS, Readability, Mobile & Tap Targets) */}
                <Stack spacing={3} sx={{ mb: 2 }}>
                    {/* Visual Stability (CLS) */}
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                            <MsqdxIcon name="Monitor" size="sm" />
                            <MsqdxTypography variant="body2" color={MSQDX_NEUTRAL[600]}>
                                {t('results.UXScan.CLSLabel')}
                            </MsqdxTypography>
                            <MsqdxTooltip title="Cumulative Layout Shift measures how much the page content shifts unexpectedly. Lower is better. Goal: < 0.1">
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ cursor: 'help', color: MSQDX_BRAND_PRIMARY.purple }}
                                >
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
                                    value={Math.min(100, (ux.cls / 0.5) * 100)}
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
                            <MsqdxTypography variant="body2" color={MSQDX_NEUTRAL[600]}>
                                {t('results.UXScan.contentReadabilityLabel')}
                            </MsqdxTypography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <MsqdxChip label={ux.readability.grade} color="default" size="small" variant="outlined" />
                            <MsqdxTypography variant="caption" color={MSQDX_NEUTRAL[900]}>
                                Flesch-Kincaid: {ux.readability.score}
                            </MsqdxTypography>
                        </Stack>
                    </Box>

                    {ux.dwellEstimate ? (
                        <Box>
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <Clock size={16} />
                                <MsqdxTypography variant="body2" color={MSQDX_NEUTRAL[600]}>
                                    {t('results.dwellEstimateTitle')}
                                </MsqdxTypography>
                                <MsqdxTooltip title={ux.dwellEstimate.summaryDe}>
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{ cursor: 'help', color: MSQDX_BRAND_PRIMARY.purple }}
                                    >
                                        ?
                                    </MsqdxTypography>
                                </MsqdxTooltip>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                <MsqdxTypography
                                    variant="subtitle1"
                                    sx={{ fontWeight: 600, color: MSQDX_BRAND_PRIMARY.green }}
                                >
                                    {formatDwellSeconds(ux.dwellEstimate.secondsMedian, dwellLocale)}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color={MSQDX_NEUTRAL[600]}>
                                    (
                                    {formatDwellRange(
                                        ux.dwellEstimate.secondsMin,
                                        ux.dwellEstimate.secondsMax,
                                        dwellLocale,
                                    )}
                                    )
                                </MsqdxTypography>
                                <MsqdxChip
                                    size="small"
                                    label={
                                        ux.dwellEstimate.confidence === 'high'
                                            ? t('results.dwellConfidenceHigh')
                                            : ux.dwellEstimate.confidence === 'low'
                                              ? t('results.dwellConfidenceLow')
                                              : t('results.dwellConfidenceMedium')
                                    }
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: '0.65rem' }}
                                />
                            </Stack>
                            <MsqdxTypography
                                variant="caption"
                                sx={{ display: 'block', mt: 0.5, color: `${MSQDX_NEUTRAL[500]}`, lineHeight: 1.4 }}
                            >
                                {t('results.dwellEstimateHint')}
                            </MsqdxTypography>
                        </Box>
                    ) : null}

                    {/* Mobile & Touch */}
                    <Stack direction="row" spacing={2}>
                        <Box
                            sx={{
                                flex: 1,
                                p: 1.5,
                                bgcolor: MSQDX_NEUTRAL[50],
                                borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <Smartphone
                                    size={16}
                                    color={
                                        ux.viewport.isMobileFriendly
                                            ? MSQDX_STATUS.success.base
                                            : MSQDX_STATUS.error.base
                                    }
                                />
                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                                    Mobile Viewport
                                </MsqdxTypography>
                            </Stack>
                            <MsqdxTypography variant="body2" color={ux.viewport.isMobileFriendly ? 'success' : 'error'}>
                                {ux.viewport.isMobileFriendly ? 'Optimized' : 'Issues Found'}
                            </MsqdxTypography>
                        </Box>

                        <Box
                            sx={{
                                flex: 1,
                                p: 1.5,
                                bgcolor: MSQDX_NEUTRAL[50],
                                borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                                <MousePointerClick
                                    size={16}
                                    color={
                                        ux.tapTargets.issues.length === 0
                                            ? MSQDX_STATUS.success.base
                                            : MSQDX_STATUS.warning.base
                                    }
                                />
                                <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>
                                    Tap Targets
                                </MsqdxTypography>
                            </Stack>
                            <MsqdxTypography variant="body2">
                                {ux.tapTargets.issues.length > 0
                                    ? `${ux.tapTargets.issues.length} Small targets`
                                    : 'All Good'}
                            </MsqdxTypography>
                        </Box>
                    </Stack>
                </Stack>

                {/* Two columns: remaining items (Skip-Link, Resource Hints, etc.) */}
                {(() => {
                    const itemBoxSx = {
                        p: 1.5,
                        bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                        borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                    };
                    const items: React.ReactNode[] = [];

                    if (ux.hasSkipLink !== undefined) {
                        items.push(
                            <Box key="skip" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    Skip-Link
                                </MsqdxTypography>
                                {ux.hasSkipLink ? (
                                    <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.success.base }}>
                                        {`${t('results.UXScan.skiplink.true')} ${ux.skipLinkHref ? ux.skipLinkHref : ''}`}
                                    </MsqdxTypography>
                                ) : (
                                    <MsqdxTypography variant="body2" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                                        {t('results.UXScan.skipLink.false')}
                                    </MsqdxTypography>
                                )}
                            </Box>,
                        );
                    }
                    if (
                        ux.resourceHints &&
                        (ux.resourceHints.preload.length > 0 || ux.resourceHints.preconnect.length > 0)
                    ) {
                        items.push(
                            <Box key="hints" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    Resource Hints
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                                    preload: {ux.resourceHints.preload.length}, preconnect:{' '}
                                    {ux.resourceHints.preconnect.length}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (ux.reducedMotionInCss !== undefined) {
                        items.push(
                            <Box key="motion" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    Reduced Motion
                                </MsqdxTypography>
                                <MsqdxTypography
                                    variant="body2"
                                    sx={{
                                        color: ux.reducedMotionInCss
                                            ? MSQDX_STATUS.success.base
                                            : 'var(--color-text-muted-on-light)',
                                    }}
                                >
                                    {ux.reducedMotionInCss
                                        ? `${t('results.UXScan.cssReducedMotion.true')}`
                                        : `${t('results.UXScan.cssReducedMotion.false')}`}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (ux.focusVisibleFailCount !== undefined && ux.focusVisibleFailCount > 0) {
                        items.push(
                            <Box key="focus" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    Focus Visible
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                                    {`${ux.focusVisibleFailCount} ${t('results.UXScan.focusableElements')}`}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (ux.longTasks && ux.longTasks.count > 0) {
                        items.push(
                            <Box key="longtasks" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {t('results.labLongTasksTitle')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                                    {t('results.labLongTasksLine', {
                                        count: ux.longTasks.count,
                                        maxMs: ux.longTasks.maxDurationMs,
                                    })}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (
                        ux.formAccessibility &&
                        (ux.formAccessibility.missingAutocomplete > 0 ||
                            ux.formAccessibility.suspiciousInputType > 0 ||
                            ux.formAccessibility.ariaInvalidWithoutDescription > 0)
                    ) {
                        items.push(
                            <Box key="forma11y" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {t('results.formA11yTitle')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                                    {t('results.formA11yLine', {
                                        auto: ux.formAccessibility.missingAutocomplete,
                                        type: ux.formAccessibility.suspiciousInputType,
                                        aria: ux.formAccessibility.ariaInvalidWithoutDescription,
                                    })}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (
                        ux.mediaAccessibility &&
                        (ux.mediaAccessibility.videosWithoutCaptions > 0 ||
                            ux.mediaAccessibility.audiosWithoutTranscript > 0 ||
                            (ux.mediaAccessibility.videosMissingCaptionTrack ?? 0) > 0)
                    ) {
                        items.push(
                            <Box key="media" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    Video/Audio
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                                    {(ux.mediaAccessibility.videosMissingCaptionTrack ?? 0) > 0 &&
                                        `${ux.mediaAccessibility.videosMissingCaptionTrack} Video(s) ${t('without')} Caption-Track`}
                                    {(ux.mediaAccessibility.videosMissingCaptionTrack ?? 0) > 0 &&
                                        (ux.mediaAccessibility.videosWithoutCaptions > 0 ||
                                            ux.mediaAccessibility.audiosWithoutTranscript > 0) &&
                                        ' · '}
                                    {ux.mediaAccessibility.videosWithoutCaptions > 0 &&
                                        `${ux.mediaAccessibility.videosWithoutCaptions} Video(s) ${t('without')} Captions`}
                                    {ux.mediaAccessibility.videosWithoutCaptions > 0 &&
                                        ux.mediaAccessibility.audiosWithoutTranscript > 0 &&
                                        ', '}
                                    {ux.mediaAccessibility.audiosWithoutTranscript > 0 &&
                                        `${ux.mediaAccessibility.audiosWithoutTranscript} Audio(s) ${t('without')} Transcript`}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (ux.headingHierarchy) {
                        items.push(
                            <Box key="headings" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {t('results.UXScan.headings')}
                                </MsqdxTypography>
                                <MsqdxTypography
                                    variant="body2"
                                    sx={{
                                        color: ux.headingHierarchy.hasSingleH1
                                            ? MSQDX_STATUS.success.base
                                            : MSQDX_STATUS.warning.base,
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {ux.headingHierarchy.hasSingleH1
                                        ? `${t('one')} H1`
                                        : `H1: ${ux.headingHierarchy.h1Count}`}
                                    {ux.headingHierarchy.skippedLevels.length > 0 &&
                                        ` · ${t('skipped')}: ${ux.headingHierarchy.skippedLevels.map((s) => `H${s.from}→H${s.to}`).join(', ')}`}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (
                        ux.imageIssues &&
                        (ux.imageIssues.missingDimensions > 0 ||
                            ux.imageIssues.missingLazy > 0 ||
                            ux.imageIssues.missingSrcset > 0)
                    ) {
                        items.push(
                            <Box key="images" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {t('results.UXScan.images')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                                    {ux.imageIssues.missingDimensions > 0 &&
                                        `${ux.imageIssues.missingDimensions} ${t('without')} width/height`}
                                    {ux.imageIssues.missingDimensions > 0 &&
                                        (ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0) &&
                                        ', '}
                                    {ux.imageIssues.missingLazy > 0 &&
                                        `${ux.imageIssues.missingLazy} ${t('without')} loading=lazy`}
                                    {ux.imageIssues.missingLazy > 0 && ux.imageIssues.missingSrcset > 0 && ', '}
                                    {ux.imageIssues.missingSrcset > 0 &&
                                        `${ux.imageIssues.missingSrcset} ${t('without')} srcset`}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (ux.metaRefreshPresent !== undefined) {
                        items.push(
                            <Box key="meta" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    Meta Refresh
                                </MsqdxTypography>
                                <MsqdxTypography
                                    variant="body2"
                                    sx={{
                                        color: ux.metaRefreshPresent
                                            ? MSQDX_STATUS.warning.base
                                            : MSQDX_STATUS.success.base,
                                    }}
                                >
                                    {ux.metaRefreshPresent
                                        ? t('results.UXScan.metaRefresh.true')
                                        : t('results.UXScan.metaRefresh.false')}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }
                    if (
                        ux.fontDisplayIssues &&
                        (ux.fontDisplayIssues.withoutFontDisplay > 0 || ux.fontDisplayIssues.blockCount > 0)
                    ) {
                        items.push(
                            <Box key="fonts" sx={itemBoxSx}>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {t('results.UXScan.fonts')}
                                </MsqdxTypography>
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.warning.base }}>
                                    {ux.fontDisplayIssues.withoutFontDisplay > 0 &&
                                        `${ux.fontDisplayIssues.withoutFontDisplay} @font-face ${t('without')} font-display`}
                                    {ux.fontDisplayIssues.withoutFontDisplay > 0 &&
                                        ux.fontDisplayIssues.blockCount > 0 &&
                                        ', '}
                                    {ux.fontDisplayIssues.blockCount > 0 &&
                                        `${ux.fontDisplayIssues.blockCount} mit block (FOUT/CLS-Risiko)`}
                                </MsqdxTypography>
                            </Box>,
                        );
                    }

                    if (items.length === 0) return null;

                    const mid = Math.ceil(items.length / 2);
                    const left = items.slice(0, mid);
                    const right = items.slice(mid);

                    return (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                            <Stack spacing={1.5}>{left}</Stack>
                            <Stack spacing={1.5}>{right}</Stack>
                        </Box>
                    );
                })()}
            </Box>
        </MsqdxMoleculeCard>
    );
};
