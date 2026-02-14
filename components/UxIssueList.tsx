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
import { MousePointerClick, Smartphone, AlertTriangle, Unlink, FileCode, Keyboard } from 'lucide-react';

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
        (ux.formIssues && ux.formIssues.length > 0);

    if (!hasIssues) {
        return (
            <Box sx={{ p: MSQDX_SPACING.scale.xl, textAlign: 'center' }}>
                <MsqdxTypography variant="h6" color="success">
                    No critical UX issues found!
                </MsqdxTypography>
                <MsqdxTypography variant="body2" color="textSecondary">
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Smartphone size={20} color={MSQDX_STATUS.error.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <AlertTriangle size={20} color={error.type === 'error' ? MSQDX_STATUS.error.base : MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Browser Console {error.type === 'error' ? 'Error' : 'Warning'}
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
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
                            <MsqdxTypography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Unlink size={20} color={MSQDX_STATUS.error.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Broken Link ({link.status})
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                                    {link.href}
                                </MsqdxTypography>
                            </Box>
                            <MsqdxChip label={`${link.status}`} color="error" size="small" variant="outlined" />
                        </Box>
                    }
                >
                    <Box sx={{ p: 1 }}>
                        <MsqdxTypography variant="body2" gutterBottom>
                            This link returns a {link.status} error code.
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" display="block">
                            <strong>Link Text:</strong> "{link.text}"
                        </MsqdxTypography>
                        <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <MsqdxTypography variant="caption" color="primary">
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <MousePointerClick size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Tap Target Too Small
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
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
                        <MsqdxTypography variant="body2" gutterBottom>
                            This interactive element is smaller than the recommended 44x44px.
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" color="textSecondary" display="block">
                            <strong>Text Content:</strong> "{issue.text}"
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" color="textSecondary" display="block">
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <FileCode size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Broken ARIA Reference
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
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
                        <MsqdxTypography variant="body2" gutterBottom>
                            {issue.message}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" color="textSecondary" display="block">
                            <strong>Element:</strong> {issue.element}
                        </MsqdxTypography>
                    </Box>
                </MsqdxAccordionItem>
            ))}

            {/* Form Issues */}
            {ux.formIssues?.map((issue, idx) => (
                <MsqdxAccordionItem
                    key={`form-${idx}`}
                    id={`form-${idx}`}
                    summary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Keyboard size={20} color={MSQDX_STATUS.warning.base} />
                            <Box sx={{ flex: 1 }}>
                                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    Form Accessibility Issue
                                </MsqdxTypography>
                                <MsqdxTypography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
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
                        <MsqdxTypography variant="body2" gutterBottom>
                            {issue.message}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" color="textSecondary" display="block">
                            <strong>Element:</strong> {issue.element}
                        </MsqdxTypography>
                    </Box>
                </MsqdxAccordionItem>
            ))}
        </MsqdxAccordion>
    );
};
