import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxAccordion, MsqdxAccordionItem, MsqdxChip } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_STATUS, MSQDX_THEME, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { UxResult } from '@/lib/types';
import {
    MousePointerClick,
    Smartphone,
    AlertTriangle,
    Unlink,
    FileCode,
    Keyboard,
    Link2,
    Image,
    Monitor,
    Type,
    RefreshCw,
} from 'lucide-react';
import { useI18n } from './i18n/I18nProvider';

interface UxIssueListProps {
    ux: UxResult;
}

export const UxIssueList = ({ ux }: UxIssueListProps) => {
    const { t } = useI18n();
    const hasIssues =
        ux.tapTargets.issues.length > 0 ||
        !ux.viewport.isMobileFriendly ||
        (ux.consoleErrors && ux.consoleErrors.length > 0) ||
        (ux.brokenLinks && ux.brokenLinks.length > 0) ||
        (ux.ariaIssues && ux.ariaIssues.length > 0) ||
        (ux.formIssues && ux.formIssues.length > 0) ||
        (ux.vagueLinkTexts && ux.vagueLinkTexts.length > 0) ||
        (ux.imageIssues &&
            (ux.imageIssues.missingDimensions > 0 ||
                ux.imageIssues.missingLazy > 0 ||
                ux.imageIssues.missingSrcset > 0)) ||
        (ux.iframeIssues && ux.iframeIssues.some((i) => !i.hasTitle)) ||
        (ux.headingHierarchy && (!ux.headingHierarchy.hasSingleH1 || ux.headingHierarchy.skippedLevels.length > 0)) ||
        ux.metaRefreshPresent === true ||
        (ux.fontDisplayIssues && (ux.fontDisplayIssues.withoutFontDisplay > 0 || ux.fontDisplayIssues.blockCount > 0));

    const textPrimary = MSQDX_THEME.light.text.primary;
    const textSecondary = MSQDX_THEME.light.text.secondary;
    const textTertiary = MSQDX_THEME.light.text.tertiary;

    console.log('UX Issues:', ux.tapTargets);

    if (!hasIssues) {
        return (
            <Box
                sx={{
                    p: 'var(--msqdx-spacing-md)',
                    textAlign: 'center',
                    backgroundColor: MSQDX_THEME.light.surface.primary,
                    color: textPrimary,
                }}
            >
                <MsqdxTypography variant="h6" sx={{ color: MSQDX_STATUS.success.base }}>
                    {t('results.uxAudit.noIssues')}
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: MSQDX_NEUTRAL[600] }}>
                    {t('results.uxAudit.noIssuesSub')}
                </MsqdxTypography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                backgroundColor: MSQDX_THEME.light.surface.primary,
                color: textPrimary,
                borderRadius: `${MSQDX_SPACING.borderRadius.md}px`,
                border: `1px solid ${MSQDX_NEUTRAL[200]}`,
                overflow: 'hidden',
            }}
        >
            <MsqdxAccordion
                allowMultiple
                size="small"
                borderRadius="md"
                sx={{ background: 'transparent', border: 'none' }}
            >
                {/* Viewport Issues */}
                {!ux.viewport.isMobileFriendly &&
                    ux.viewport.issues.map((issue, idx) => (
                        <MsqdxAccordionItem
                            key={`vp-${idx}`}
                            id={`vp-${idx}`}
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <Smartphone size={20} color={MSQDX_STATUS.error.base} />
                                    <Box sx={{ flex: 1 }}>
                                        <MsqdxTypography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: textPrimary }}
                                        >
                                            {t('results.uxAudit.mobileViewportError')}
                                        </MsqdxTypography>
                                    </Box>
                                    <MsqdxChip label="Critical" color="error" size="small" variant="outlined" />
                                </Box>
                            }
                        >
                            <MsqdxTypography variant="body2">
                                {`${issue}. ${t('results.uxAudit.negativeImpact')}`}
                            </MsqdxTypography>
                        </MsqdxAccordionItem>
                    ))}

                {/* Console Errors */}
                {ux.consoleErrors &&
                    ux.consoleErrors.map((error, idx) => (
                        <MsqdxAccordionItem
                            key={`console-${idx}`}
                            id={`console-${idx}`}
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <AlertTriangle
                                        size={20}
                                        color={
                                            error.type === 'error' ? MSQDX_STATUS.error.base : MSQDX_STATUS.warning.base
                                        }
                                    />
                                    <Box sx={{ flex: 1 }}>
                                        <MsqdxTypography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: textPrimary }}
                                        >
                                            Browser Console {error.type === 'error' ? 'Error' : 'Warning'}
                                        </MsqdxTypography>
                                        <MsqdxTypography
                                            variant="caption"
                                            sx={{ color: textTertiary, fontFamily: 'monospace' }}
                                        >
                                            {error.text.slice(0, 60)}...
                                        </MsqdxTypography>
                                    </Box>
                                    <MsqdxChip
                                        label="JS Error"
                                        color={error.type === 'error' ? 'error' : 'warning'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                            }
                        >
                            <Box sx={{ p: 1 }}>
                                <MsqdxTypography
                                    variant="body2"
                                    sx={{
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        color: MSQDX_STATUS.error.base,
                                    }}
                                >
                                    {error.text}
                                </MsqdxTypography>
                                {error.location && (
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{ color: textTertiary, mt: 1 }}
                                        display="block"
                                    >
                                        <strong>Source:</strong> {error.location}
                                    </MsqdxTypography>
                                )}
                            </Box>
                        </MsqdxAccordionItem>
                    ))}

                {/* Broken Links */}
                {ux.brokenLinks &&
                    ux.brokenLinks.map((link, idx) => (
                        <MsqdxAccordionItem
                            key={`link-${idx}`}
                            id={`link-${idx}`}
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <Unlink size={20} color={MSQDX_STATUS.error.base} />
                                    <Box sx={{ flex: 1 }}>
                                        <MsqdxTypography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: textPrimary }}
                                        >
                                            {`${t('results.uxAudit.brokenLink')} (${link.status})`}
                                        </MsqdxTypography>
                                        <MsqdxTypography
                                            variant="caption"
                                            sx={{ color: textTertiary, fontFamily: 'monospace' }}
                                        >
                                            {link.href}
                                        </MsqdxTypography>
                                    </Box>
                                    <MsqdxChip label={`${link.status}`} color="error" size="small" variant="outlined" />
                                </Box>
                            }
                        >
                            <Box sx={{ p: 1 }}>
                                <MsqdxTypography variant="body2" sx={{ color: textPrimary }} gutterBottom>
                                    {t('results.uxAudit.linkCodeReturn', { status: link.status })}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: textTertiary }} display="block">
                                    <strong>{t('results.uxAudit.linkText')}</strong> &quot;{link.text}&quot;
                                </MsqdxTypography>
                                <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ textDecoration: 'none' }}
                                >
                                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.info.base }}>
                                        Visit URL ↗
                                    </MsqdxTypography>
                                </a>
                            </Box>
                        </MsqdxAccordionItem>
                    ))}

                {/* Tap Target Issues */}
                {ux.tapTargets.details?.map((issue, idx) => (
                    <MsqdxAccordionItem
                        key={`tap-${idx}`}
                        id={`tap-${idx}`}
                        summary={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--msqdx-spacing-sm)',
                                    width: '100%',
                                }}
                            >
                                <MousePointerClick size={20} color={MSQDX_STATUS.warning.base} />
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                        {t('results.uxAudit.smallTapTarget')}
                                    </MsqdxTypography>
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{ color: textTertiary, fontFamily: 'monospace' }}
                                    >
                                        {issue.selector}
                                    </MsqdxTypography>
                                </Box>
                                <MsqdxChip
                                    label={`${issue.size.width}x${issue.size.height}px`}
                                    color="warning"
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>
                        }
                    >
                        <Box sx={{ p: 1 }}>
                            <MsqdxTypography variant="body2" sx={{ color: textPrimary }} gutterBottom>
                                {t('results.uxAudit.tapTargetTooSmall')}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: textTertiary }} display="block">
                                <strong>{t('results.uxAudit.textContent')}</strong> &quot;{issue.text}&quot;
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: textTertiary }} display="block">
                                <strong>{t('selector')}</strong> {issue.selector}
                            </MsqdxTypography>
                        </Box>
                    </MsqdxAccordionItem>
                ))}

                {/* ARIA Issues */}
                {ux.ariaIssues?.map((issue, idx) => (
                    <MsqdxAccordionItem
                        key={`aria-${idx}`}
                        id={`aria-${idx}`}
                        summary={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--msqdx-spacing-sm)',
                                    width: '100%',
                                }}
                            >
                                <FileCode size={20} color={MSQDX_STATUS.warning.base} />
                                <Box sx={{ flex: 1 }}>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                        {t('results.uxAudit.brokenAria')}
                                    </MsqdxTypography>
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{ color: textTertiary, fontFamily: 'monospace' }}
                                    >
                                        {issue.element}[{issue.attribute}=&quot;{issue.value}&quot;]
                                    </MsqdxTypography>
                                </Box>
                                <MsqdxChip label="ARIA" color="warning" size="small" variant="outlined" />
                            </Box>
                        }
                    >
                        <Box sx={{ p: 1 }}>
                            <MsqdxTypography variant="body2" sx={{ color: textPrimary }} gutterBottom>
                                {issue.message}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: textTertiary }} display="block">
                                <strong>Element:</strong> {issue.element}
                            </MsqdxTypography>
                        </Box>
                    </MsqdxAccordionItem>
                ))}

                {/* Vague Link Texts (WCAG 2.4.4) */}
                {ux.vagueLinkTexts &&
                    ux.vagueLinkTexts.map((item, idx) => (
                        <MsqdxAccordionItem
                            key={`vague-${idx}`}
                            id={`vague-${idx}`}
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <Link2 size={20} color={MSQDX_STATUS.warning.base} />
                                    <Box sx={{ flex: 1 }}>
                                        <MsqdxTypography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: textPrimary }}
                                        >
                                            {t('results.uxAudit.vagueLinkText')}
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="caption" sx={{ color: textTertiary }}>
                                            &quot;{item.text}&quot; → {item.href.slice(0, 40)}…
                                        </MsqdxTypography>
                                    </Box>
                                    <MsqdxChip label="2.4.4" color="warning" size="small" variant="outlined" />
                                </Box>
                            }
                        >
                            <Box sx={{ p: 1 }}>
                                <MsqdxTypography variant="body2">
                                    {t('results.uxAudit.vagueLinkTextDesc')}
                                </MsqdxTypography>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}
                                >
                                    href: {item.href}
                                </MsqdxTypography>
                            </Box>
                        </MsqdxAccordionItem>
                    ))}

                {/* Image Issues */}
                {ux.imageIssues &&
                    (ux.imageIssues.missingDimensions > 0 ||
                        ux.imageIssues.missingLazy > 0 ||
                        ux.imageIssues.missingSrcset > 0) && (
                        <MsqdxAccordionItem
                            key="image-issues"
                            id="image-issues"
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <Image size={20} color={MSQDX_STATUS.warning.base} />
                                    <Box sx={{ flex: 1 }}>
                                        <MsqdxTypography
                                            variant="subtitle2"
                                            sx={{ fontWeight: 600, color: textPrimary }}
                                        >
                                            {t('results.uxAudit.imageIssues')}
                                        </MsqdxTypography>
                                        <MsqdxTypography variant="caption" sx={{ color: textTertiary }}>
                                            {ux.imageIssues.missingDimensions > 0 &&
                                                `${ux.imageIssues.missingDimensions} ohne width/height`}
                                            {ux.imageIssues.missingDimensions > 0 &&
                                                (ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0) &&
                                                ', '}
                                            {ux.imageIssues.missingLazy > 0 &&
                                                `${ux.imageIssues.missingLazy} ohne loading=lazy`}
                                            {ux.imageIssues.missingLazy > 0 && ux.imageIssues.missingSrcset > 0 && ', '}
                                            {ux.imageIssues.missingSrcset > 0 &&
                                                `${ux.imageIssues.missingSrcset} ohne srcset`}
                                        </MsqdxTypography>
                                    </Box>
                                </Box>
                            }
                        >
                            <Box sx={{ p: 1 }}>
                                <MsqdxTypography variant="body2">
                                    {t('results.uxAudit.imageIssuesDesc')}
                                </MsqdxTypography>
                                {ux.imageIssues.details?.slice(0, 5).map((d, i) => (
                                    <MsqdxTypography
                                        key={i}
                                        variant="caption"
                                        sx={{ display: 'block', color: textTertiary }}
                                    >
                                        {d.reason}
                                    </MsqdxTypography>
                                ))}
                            </Box>
                        </MsqdxAccordionItem>
                    )}

                {/* Iframes without title */}
                {ux.iframeIssues && ux.iframeIssues.filter((i) => !i.hasTitle).length > 0 && (
                    <MsqdxAccordionItem
                        key="iframe-issues"
                        id="iframe-issues"
                        summary={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--msqdx-spacing-sm)',
                                    width: '100%',
                                }}
                            >
                                <Monitor size={20} color={MSQDX_STATUS.warning.base} />
                                <Box sx={{ flex: 1 }}>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                        Iframes: {ux.iframeIssues.filter((i) => !i.hasTitle).length} ohne title
                                    </MsqdxTypography>
                                </Box>
                            </Box>
                        }
                    >
                        <Box sx={{ p: 1 }}>
                            <MsqdxTypography variant="body2">
                                {t('results.uxAudit.iframeWithoutTitleDesc')}
                            </MsqdxTypography>
                            {ux.iframeIssues
                                .filter((i) => !i.hasTitle)
                                .map((iframe, i) => (
                                    <MsqdxTypography
                                        key={i}
                                        variant="caption"
                                        sx={{ display: 'block', fontFamily: 'monospace' }}
                                    >
                                        {iframe.src || 'Kein src'}
                                    </MsqdxTypography>
                                ))}
                        </Box>
                    </MsqdxAccordionItem>
                )}

                {/* Meta Refresh */}
                {ux.metaRefreshPresent === true && (
                    <MsqdxAccordionItem
                        key="meta-refresh"
                        id="meta-refresh"
                        summary={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--msqdx-spacing-sm)',
                                    width: '100%',
                                }}
                            >
                                <RefreshCw size={20} color={MSQDX_STATUS.warning.base} />
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                    {t('results.uxAudit.metaRefreshPresent')}
                                </MsqdxTypography>
                            </Box>
                        }
                    >
                        <MsqdxTypography variant="body2">{t('results.uxAudit.metaRefreshPresentDesc')}</MsqdxTypography>
                    </MsqdxAccordionItem>
                )}

                {/* Font-Display */}
                {ux.fontDisplayIssues &&
                    (ux.fontDisplayIssues.withoutFontDisplay > 0 || ux.fontDisplayIssues.blockCount > 0) && (
                        <MsqdxAccordionItem
                            key="font-display"
                            id="font-display"
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <Type size={20} color={MSQDX_STATUS.warning.base} />
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                        {t('results.uxAudit.fontDisplayIssues', {
                                            withoutFontDisplay: ux.fontDisplayIssues.withoutFontDisplay,
                                            blockCount: ux.fontDisplayIssues.blockCount,
                                        })}
                                    </MsqdxTypography>
                                </Box>
                            }
                        >
                            <MsqdxTypography variant="body2">
                                {t('results.uxAudit.fontDisplayIssuesDesc')}
                            </MsqdxTypography>
                        </MsqdxAccordionItem>
                    )}

                {/* Heading hierarchy issues */}
                {ux.headingHierarchy &&
                    (!ux.headingHierarchy.hasSingleH1 || ux.headingHierarchy.skippedLevels.length > 0) && (
                        <MsqdxAccordionItem
                            key="heading-hierarchy"
                            id="heading-hierarchy"
                            summary={
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--msqdx-spacing-sm)',
                                        width: '100%',
                                    }}
                                >
                                    <Type size={20} color={MSQDX_STATUS.warning.base} />
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                        {t('results.structureMapHeadings')}:{' '}
                                        {!ux.headingHierarchy.hasSingleH1 && `${ux.headingHierarchy.h1Count} H1`}
                                        {!ux.headingHierarchy.hasSingleH1 &&
                                            ux.headingHierarchy.skippedLevels.length > 0 &&
                                            ', '}
                                        {ux.headingHierarchy.skippedLevels.length > 0 &&
                                            `${t('results.uxAudit.skippedHeadings')}: ${ux.headingHierarchy.skippedLevels.map((s) => `H${s.from}→H${s.to}`).join(', ')}`}
                                    </MsqdxTypography>
                                </Box>
                            }
                        >
                            <MsqdxTypography variant="body2">
                                {t('results.uxAudit.headingHierarchyIssuesDesc')}
                            </MsqdxTypography>
                        </MsqdxAccordionItem>
                    )}

                {/* Form Issues */}
                {ux.formIssues?.map((issue, idx) => (
                    <MsqdxAccordionItem
                        key={`form-${idx}`}
                        id={`form-${idx}`}
                        summary={
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--msqdx-spacing-sm)',
                                    width: '100%',
                                }}
                            >
                                <Keyboard size={20} color={MSQDX_STATUS.warning.base} />
                                <Box sx={{ flex: 1 }}>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: textPrimary }}>
                                        {t('results.uxAudit.formIssue')}
                                    </MsqdxTypography>
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{ color: textTertiary, fontFamily: 'monospace' }}
                                    >
                                        {issue.element}
                                    </MsqdxTypography>
                                </Box>
                                <MsqdxChip label="Forms" color="warning" size="small" variant="outlined" />
                            </Box>
                        }
                    >
                        <Box sx={{ p: 1 }}>
                            <MsqdxTypography variant="body2" sx={{ color: textPrimary }} gutterBottom>
                                {issue.message}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: textTertiary }} display="block">
                                <strong>Element:</strong> {issue.element}
                            </MsqdxTypography>
                        </Box>
                    </MsqdxAccordionItem>
                ))}
            </MsqdxAccordion>
        </Box>
    );
};
