import React from 'react';
import { Box } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxAccordion,
    MsqdxAccordionItem,
    MsqdxChip
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_STATUS } from '@msqdx/tokens';
import type { UxResult } from '@/lib/types';
import { MousePointerClick, Smartphone, AlertTriangle, Unlink, FileCode, Keyboard, Link2, Image, Monitor, Type, RefreshCw } from 'lucide-react';

interface UxIssueListProps {
    ux: UxResult;
}

export const UxIssueList = ({ ux }: UxIssueListProps) => {
    const hasIssues =
        ux.tapTargets.issues.length > 0 ||
        !ux.viewport.isMobileFriendly ||
        (ux.consoleErrors && ux.consoleErrors.length > 0) ||
        (ux.brokenLinks && ux.brokenLinks.length > 0) ||
        (ux.ariaIssues && ux.ariaIssues.length > 0) ||
        (ux.formIssues && ux.formIssues.length > 0) ||
        (ux.vagueLinkTexts && ux.vagueLinkTexts.length > 0) ||
        (ux.imageIssues && (ux.imageIssues.missingDimensions > 0 || ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0)) ||
        (ux.iframeIssues && ux.iframeIssues.some(i => !i.hasTitle)) ||
        (ux.headingHierarchy && (!ux.headingHierarchy.hasSingleH1 || ux.headingHierarchy.skippedLevels.length > 0)) ||
        ux.metaRefreshPresent === true ||
        (ux.fontDisplayIssues && (ux.fontDisplayIssues.withoutFontDisplay > 0 || ux.fontDisplayIssues.blockCount > 0));

    if (!hasIssues) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', textAlign: 'center' }}>
                <MsqdxTypography variant="h6" sx={{ color: 'var(--color-secondary-dx-green)' }}>
                    No critical UX issues found!
                </MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    Your site passes our core UX checks for mobile friendliness, interactivity, and stability.
                </MsqdxTypography>
            </Box>
        );
    }

    return (
        <MsqdxAccordion allowMultiple size="small" borderRadius="md">
            {/* Viewport Issues */}
            {!ux.viewport.isMobileFriendly && ux.viewport.issues.map((issue, idx) => (
                <MsqdxAccordionItem
                    key={`vp-${idx}`}
                    id={`vp-${idx}`}
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Smartphone size={20} color={MSQDX_STATUS.error.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Mobile Viewport Configuration Error
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip label="Critical" color="error" size="small" />
                        </Box>
                    }
                >
                    <MsqdxTypography variant="body2">
                        {issue}. This can negatively impact SEO and usability on mobile devices.
                    </MsqdxTypography>
                </MsqdxAccordionItem>
            ))}

            {/* Console Errors */}
            {ux.consoleErrors && ux.consoleErrors.map((error, idx) => (
                <MsqdxAccordionItem
                    key={`console-${idx}`}
                    id={`console-${idx}`}
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <AlertTriangle size={20} color={error.type === 'error' ? MSQDX_STATUS.error.base : MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Browser Console {error.type === 'error' ? 'Error' : 'Warning'}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                    {error.text.slice(0, 60)}...
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip label="JS Error" color={error.type === 'error' ? 'error' : 'warning'} size="small" variant="outlined" />
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: MSQDX_STATUS.error.base }}>
                            {error.text}
                        </MsqdxTypography>
                        {error.location && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mt: 1 }} display="block">
                                <strong>Source:</strong> {error.location}
                            </MsqdxTypography>
                        )}
                    </Box>
                </MsqdxAccordionItem>
            ))}

            {/* Broken Links */}
            {ux.brokenLinks && ux.brokenLinks.map((link, idx) => (
                <MsqdxAccordionItem
                    key={`link-${idx}`}
                    id={`link-${idx}`}
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Unlink size={20} color={MSQDX_STATUS.error.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Broken Link ({link.status})
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                    {link.href}
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip label={`${link.status}`} color="error" size="small" variant="outlined" />
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }} gutterBottom>
                            This link returns a {link.status} error code.
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} display="block">
                            <strong>Link Text:</strong> "{link.text}"
                        </MsqdxTypography>
                        <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-theme-accent)' }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <MousePointerClick size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Tap Target Too Small
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
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
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }} gutterBottom>
                            This interactive element is smaller than the recommended 44x44px.
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} display="block">
                            <strong>Text Content:</strong> "{issue.text}"
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} display="block">
                            <strong>Selector:</strong> {issue.selector}
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <FileCode size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Broken ARIA Reference
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                    {issue.element}[{issue.attribute}="{issue.value}"]
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip
                                label="ARIA"
                                color="warning"
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }} gutterBottom>
                            {issue.message}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} display="block">
                            <strong>Element:</strong> {issue.element}
                        </MsqdxTypography>
                    </Box>
                </MsqdxAccordionItem>
            ))}

            {/* Vague Link Texts (WCAG 2.4.4) */}
            {ux.vagueLinkTexts && ux.vagueLinkTexts.map((item, idx) => (
                <MsqdxAccordionItem
                    key={`vague-${idx}`}
                    id={`vague-${idx}`}
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Link2 size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Unklarer Link-Text (WCAG 2.4.4)
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    "{item.text}" → {item.href.slice(0, 40)}…
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip label="2.4.4" color="warning" size="small" variant="outlined" />
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2">Link-Text sollte den Zweck des Links beschreiben (nicht "Mehr", "Hier klicken", etc.).</MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 1 }}>href: {item.href}</MsqdxTypography>
                    </Box>
                </MsqdxAccordionItem>
            ))}

            {/* Image Issues */}
            {ux.imageIssues && (ux.imageIssues.missingDimensions > 0 || ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0) && (
                <MsqdxAccordionItem
                    key="image-issues"
                    id="image-issues"
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Image size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Bilder: Dimensionen / Lazy Loading / srcset
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {ux.imageIssues.missingDimensions > 0 && `${ux.imageIssues.missingDimensions} ohne width/height`}
                                    {ux.imageIssues.missingDimensions > 0 && (ux.imageIssues.missingLazy > 0 || ux.imageIssues.missingSrcset > 0) && ', '}
                                    {ux.imageIssues.missingLazy > 0 && `${ux.imageIssues.missingLazy} ohne loading=lazy`}
                                    {ux.imageIssues.missingLazy > 0 && ux.imageIssues.missingSrcset > 0 && ', '}
                                    {ux.imageIssues.missingSrcset > 0 && `${ux.imageIssues.missingSrcset} ohne srcset`}
                                </MsqdxTypography>
                            </Box>
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2">Fehlende width/height können CLS verursachen. loading="lazy" und srcset verbessern Performance.</MsqdxTypography>
                        {ux.imageIssues.details?.slice(0, 5).map((d, i) => (
                            <MsqdxTypography key={i} variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)' }}>{d.reason}</MsqdxTypography>
                        ))}
                    </Box>
                </MsqdxAccordionItem>
            )}

            {/* Iframes without title */}
            {ux.iframeIssues && ux.iframeIssues.filter(i => !i.hasTitle).length > 0 && (
                <MsqdxAccordionItem
                    key="iframe-issues"
                    id="iframe-issues"
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Monitor size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Iframes: {ux.iframeIssues.filter(i => !i.hasTitle).length} ohne title
                                </MsqdxTypography>
                            </Box>
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2">Jeder iframe sollte ein title-Attribut für Barrierefreiheit haben.</MsqdxTypography>
                        {ux.iframeIssues.filter(i => !i.hasTitle).map((iframe, i) => (
                            <MsqdxTypography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>{iframe.src || 'Kein src'}</MsqdxTypography>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <RefreshCw size={20} color={MSQDX_STATUS.warning.base} />
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                Meta Refresh vorhanden (nicht empfohlen für A11y/SEO)
                            </MsqdxTypography>
                        </Box>
                    }
                >
                    <MsqdxTypography variant="body2">meta http-equiv="refresh" kann Nutzer mit Screenreadern verwirren und wird für Redirects nicht empfohlen.</MsqdxTypography>
                </MsqdxAccordionItem>
            )}

            {/* Font-Display */}
            {ux.fontDisplayIssues && (ux.fontDisplayIssues.withoutFontDisplay > 0 || ux.fontDisplayIssues.blockCount > 0) && (
                <MsqdxAccordionItem
                    key="font-display"
                    id="font-display"
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Type size={20} color={MSQDX_STATUS.warning.base} />
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                Schriftarten: {ux.fontDisplayIssues.withoutFontDisplay} @font-face ohne font-display, {ux.fontDisplayIssues.blockCount} mit block
                            </MsqdxTypography>
                        </Box>
                    }
                >
                    <MsqdxTypography variant="body2">font-display: swap (oder optional) reduziert FOUT/CLS. Ohne font-display oder mit block kann Text unsichtbar bleiben oder springen.</MsqdxTypography>
                </MsqdxAccordionItem>
            )}

            {/* Heading hierarchy issues */}
            {ux.headingHierarchy && (!ux.headingHierarchy.hasSingleH1 || ux.headingHierarchy.skippedLevels.length > 0) && (
                <MsqdxAccordionItem
                    key="heading-hierarchy"
                    id="heading-hierarchy"
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Type size={20} color={MSQDX_STATUS.warning.base} />
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                Überschriften: {!ux.headingHierarchy.hasSingleH1 && `${ux.headingHierarchy.h1Count} H1`}
                                {!ux.headingHierarchy.hasSingleH1 && ux.headingHierarchy.skippedLevels.length > 0 && ', '}
                                {ux.headingHierarchy.skippedLevels.length > 0 && `Übersprungene Level: ${ux.headingHierarchy.skippedLevels.map(s => `H${s.from}→H${s.to}`).join(', ')}`}
                            </MsqdxTypography>
                        </Box>
                    }
                >
                    <MsqdxTypography variant="body2">Eine H1 pro Seite und keine Sprünge in der Hierarchie (z. B. H2 direkt zu H4) verbessern Struktur und A11y.</MsqdxTypography>
                </MsqdxAccordionItem>
            )}

            {/* Form Issues */}
            {ux.formIssues?.map((issue, idx) => (
                <MsqdxAccordionItem
                    key={`form-${idx}`}
                    id={`form-${idx}`}
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)', width: '100%' }}>
                            <Keyboard size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                    Form Accessibility Issue
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                    {issue.element}
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip
                                label="Forms"
                                color="warning"
                                size="small"
                                variant="outlined"
                            />
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }} gutterBottom>
                            {issue.message}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }} display="block">
                            <strong>Element:</strong> {issue.element}
                        </MsqdxTypography>
                    </Box>
                </MsqdxAccordionItem>
            ))}
        </MsqdxAccordion>
    );
};
