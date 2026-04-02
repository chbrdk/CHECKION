'use client';

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, IconButton, ToggleButton, ToggleButtonGroup, Tooltip, alpha } from '@mui/material';
import { MsqdxButton, MsqdxChip, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL, MSQDX_STATUS } from '@msqdx/tokens';
import { ChevronLeft, Copy, ExternalLink, FileSearch } from 'lucide-react';
import { apiScanDomainIssueGroupPages, apiScanDomainIssueGroups, apiScanDomainPageIssues } from '@/lib/constants';
import { DOMAIN_ISSUES_SCROLL } from '@/lib/domain-issues-layout';
import type { SlimPage } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';
import {
    IssueSeverityRail,
    IssueTypeIcon,
    issueRowFocusSx,
    issueTypeColor,
} from '@/components/domain-issues/IssueListPrimitives';

type IssueGroupRow = {
    groupKey: string;
    type: string;
    code: string;
    message: string;
    runner: string | null;
    wcagLevel: string | null;
    helpUrl: string | null;
    pageCount: number;
};

type GroupPageRow = { pageId: string; url: string; issueCount: number; scanId?: string | null };
type PageIssueRow = { id: string; groupKey: string; type: string; code: string; message: string; runner: string | null; wcagLevel: string | null; helpUrl: string | null; selector: string | null };

const rowHoverSx = {
    '@media (prefers-reduced-motion: no-preference)': {
        transition: 'background-color 0.15s ease',
    },
    '&:hover': {
        backgroundColor: alpha(MSQDX_NEUTRAL[500], 0.06),
    },
};

function titleFromUrl(url: string): string {
    try {
        const u = new URL(url);
        const segments = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
        if (segments.length > 0) return segments[segments.length - 1]!;
        return u.hostname;
    } catch {
        return url.length > 48 ? url.slice(0, 48) + '…' : url;
    }
}

function IssuesEmptyState({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    title: string;
    subtitle?: string;
}) {
    return (
        <Box
            sx={{
                py: 3,
                px: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 1,
                color: 'var(--color-text-muted-on-light)',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: MSQDX_NEUTRAL[300],
                bgcolor: alpha(MSQDX_NEUTRAL[100], 0.5),
            }}
        >
            <Icon size={28} strokeWidth={1.5} aria-hidden />
            <MsqdxTypography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-text-secondary-on-light, #404040)' }}>
                {title}
            </MsqdxTypography>
            {subtitle && (
                <MsqdxTypography variant="caption" sx={{ maxWidth: 280 }}>
                    {subtitle}
                </MsqdxTypography>
            )}
        </Box>
    );
}

function SelectorCopyBlock({
    selector,
    labelCopy,
    copiedLabel,
}: {
    selector: string;
    labelCopy: string;
    copiedLabel: string;
}) {
    const [copied, setCopied] = useState(false);
    const handle = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(selector);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    }, [selector]);

    return (
        <Box sx={{ mt: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 0.5 }}>
                <Box
                    component="pre"
                    sx={{
                        m: 0,
                        flex: 1,
                        minWidth: 0,
                        p: 0.75,
                        borderRadius: 0.5,
                        bgcolor: MSQDX_NEUTRAL[100],
                        border: `1px solid ${MSQDX_NEUTRAL[200]}`,
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '0.65rem',
                        lineHeight: 1.35,
                        maxHeight: 36,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {selector}
                </Box>
                <Tooltip title={copied ? copiedLabel : labelCopy}>
                    <span>
                        <IconButton
                            size="small"
                            aria-label={labelCopy}
                            onClick={(e) => {
                                e.stopPropagation();
                                void handle();
                            }}
                            sx={{ mt: -0.25 }}
                        >
                            <Copy size={16} strokeWidth={2} aria-hidden />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            {copied && (
                <MsqdxTypography variant="caption" sx={{ color: MSQDX_BRAND_PRIMARY.green, mt: 0.25 }} role="status">
                    {copiedLabel}
                </MsqdxTypography>
            )}
        </Box>
    );
}

function DomainIssuesMasterDetailInner({
    domainId,
    pagesById,
    selectedGroupKey,
    selectedPageId,
    issuesType,
    issuesWcag,
    issuesQ,
    onChangeFilters,
    onSelectGroup,
    onSelectPage,
    onOpenPageScan,
    onBackToGroups,
    onBackToPages,
}: {
    domainId: string;
    pagesById: ReadonlyMap<string, SlimPage>;
    selectedGroupKey: string | null;
    selectedPageId: string | null;
    issuesType: string | null;
    issuesWcag: string | null;
    issuesQ: string | null;
    onChangeFilters: (next: { type?: string | null; wcag?: string | null; q?: string | null }) => void;
    onSelectGroup: (groupKey: string) => void;
    onSelectPage: (pageId: string) => void;
    onOpenPageScan: (url: string, scanId?: string | null) => void;
    /** Stufe 2 → 1: `group` + `page` aus der URL entfernen */
    onBackToGroups: () => void;
    /** Stufe 3 → 2: nur `page` aus der URL entfernen */
    onBackToPages: () => void;
}) {
    const { t } = useI18n();
    const [groups, setGroups] = useState<IssueGroupRow[]>([]);
    const [groupsCursor, setGroupsCursor] = useState<{ pageCount: number; groupKey: string } | null>(null);
    const [groupsLoading, setGroupsLoading] = useState(false);
    const [groupsError, setGroupsError] = useState<string | null>(null);

    const [groupPages, setGroupPages] = useState<GroupPageRow[]>([]);
    const [groupPagesCursor, setGroupPagesCursor] = useState<{ url: string } | null>(null);
    const [groupPagesLoading, setGroupPagesLoading] = useState(false);
    const [groupPagesError, setGroupPagesError] = useState<string | null>(null);

    const [pageIssues, setPageIssues] = useState<PageIssueRow[]>([]);
    const [pageIssuesCursor, setPageIssuesCursor] = useState<{ id: string } | null>(null);
    const [pageIssuesLoading, setPageIssuesLoading] = useState(false);
    const [pageIssuesError, setPageIssuesError] = useState<string | null>(null);

    const [qDraft, setQDraft] = useState(issuesQ ?? '');
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setQDraft(issuesQ ?? '');
    }, [issuesQ]);

    useEffect(() => {
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
        }
    }, [issuesQ, issuesType, issuesWcag]);

    useEffect(() => {
        const committed = (issuesQ ?? '').trim();
        const draft = qDraft.trim();
        if (draft === committed) return;
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            searchDebounceRef.current = null;
            onChangeFilters({ q: draft ? draft : null });
        }, 400);
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
                searchDebounceRef.current = null;
            }
        };
    }, [qDraft, issuesQ, onChangeFilters]);

    useEffect(() => {
        let cancelled = false;
        setGroupsLoading(true);
        setGroupsError(null);
        fetch(apiScanDomainIssueGroups(domainId, {
            limit: 50,
            type: issuesType ?? undefined,
            wcagLevel: issuesWcag ?? undefined,
            q: issuesQ ?? undefined,
        }))
            .then(async (res) => {
                if (!res.ok) throw new Error('failed');
                return res.json();
            })
            .then((json) => {
                if (cancelled) return;
                setGroups(json.data ?? []);
                setGroupsCursor(json.pagination?.nextCursor ?? null);
            })
            .catch(() => !cancelled && setGroupsError(t('common.error')))
            .finally(() => !cancelled && setGroupsLoading(false));
        return () => {
            cancelled = true;
        };
    }, [domainId, issuesType, issuesWcag, issuesQ, t]);

    useEffect(() => {
        if (!selectedGroupKey) {
            setGroupPages([]);
            setGroupPagesCursor(null);
            return;
        }
        let cancelled = false;
        setGroupPagesLoading(true);
        setGroupPagesError(null);
        fetch(apiScanDomainIssueGroupPages(domainId, selectedGroupKey, { limit: 50 }))
            .then(async (res) => {
                if (!res.ok) throw new Error('failed');
                return res.json();
            })
            .then((json) => {
                if (cancelled) return;
                setGroupPages(json.data ?? []);
                setGroupPagesCursor(json.pagination?.nextCursor ?? null);
            })
            .catch(() => !cancelled && setGroupPagesError(t('common.error')))
            .finally(() => !cancelled && setGroupPagesLoading(false));
        return () => {
            cancelled = true;
        };
    }, [domainId, selectedGroupKey, t]);

    useEffect(() => {
        if (!selectedPageId) {
            setPageIssues([]);
            setPageIssuesCursor(null);
            return;
        }
        let cancelled = false;
        setPageIssuesLoading(true);
        setPageIssuesError(null);
        fetch(apiScanDomainPageIssues(domainId, selectedPageId, { limit: 100 }))
            .then(async (res) => {
                if (!res.ok) throw new Error('failed');
                return res.json();
            })
            .then((json) => {
                if (cancelled) return;
                setPageIssues(json.data ?? []);
                setPageIssuesCursor(json.pagination?.nextCursor ?? null);
            })
            .catch(() => !cancelled && setPageIssuesError(t('common.error')))
            .finally(() => !cancelled && setPageIssuesLoading(false));
        return () => {
            cancelled = true;
        };
    }, [domainId, selectedPageId, t]);

    const groupsScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        groupsScrollRef.current?.scrollTo({ top: 0 });
    }, [domainId, issuesType, issuesWcag, issuesQ]);

    const groupPagesScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        groupPagesScrollRef.current?.scrollTo({ top: 0 });
    }, [selectedGroupKey]);

    const pageIssuesScrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        pageIssuesScrollRef.current?.scrollTo({ top: 0 });
    }, [selectedPageId]);

    const loadMoreGroups = async () => {
        if (!groupsCursor || groupsLoading) return;
        setGroupsLoading(true);
        try {
            const res = await fetch(apiScanDomainIssueGroups(domainId, {
                limit: 50,
                cursorPageCount: groupsCursor.pageCount,
                cursorGroupKey: groupsCursor.groupKey,
                type: issuesType ?? undefined,
                wcagLevel: issuesWcag ?? undefined,
                q: issuesQ ?? undefined,
            }));
            if (!res.ok) throw new Error('failed');
            const json = await res.json();
            setGroups((prev) => [...prev, ...(json.data ?? [])]);
            setGroupsCursor(json.pagination?.nextCursor ?? null);
        } catch {
            setGroupsError(t('common.error'));
        } finally {
            setGroupsLoading(false);
        }
    };

    const loadMoreGroupPages = async () => {
        if (!selectedGroupKey || !groupPagesCursor || groupPagesLoading) return;
        setGroupPagesLoading(true);
        try {
            const res = await fetch(apiScanDomainIssueGroupPages(domainId, selectedGroupKey, { limit: 50, cursorUrl: groupPagesCursor.url }));
            if (!res.ok) throw new Error('failed');
            const json = await res.json();
            setGroupPages((prev) => [...prev, ...(json.data ?? [])]);
            setGroupPagesCursor(json.pagination?.nextCursor ?? null);
        } catch {
            setGroupPagesError(t('common.error'));
        } finally {
            setGroupPagesLoading(false);
        }
    };

    const loadMorePageIssues = async () => {
        if (!selectedPageId || !pageIssuesCursor || pageIssuesLoading) return;
        setPageIssuesLoading(true);
        try {
            const res = await fetch(apiScanDomainPageIssues(domainId, selectedPageId, { limit: 100, cursorId: pageIssuesCursor.id }));
            if (!res.ok) throw new Error('failed');
            const json = await res.json();
            setPageIssues((prev) => [...prev, ...(json.data ?? [])]);
            setPageIssuesCursor(json.pagination?.nextCursor ?? null);
        } catch {
            setPageIssuesError(t('common.error'));
        } finally {
            setPageIssuesLoading(false);
        }
    };

    const typeToggleValue = issuesType ?? 'all';
    const wcagToggleValue = issuesWcag ?? 'all';

    const toggleSx = {
        '& .MuiToggleButton-root': {
            textTransform: 'none',
            fontSize: '0.75rem',
            py: 0.5,
            px: 1,
        },
    } as const;

    /** Gestaffelt: 1 = nur Gruppen, 2 = nur betroffene Seiten, 3 = nur Issues der Seite (je eine volle Liste). */
    const navigStep = selectedPageId ? 3 : selectedGroupKey ? 2 : 1;
    const listScrollMaxLg = DOMAIN_ISSUES_SCROLL.singleListLg;
    const selectedGroupRow = selectedGroupKey ? groups.find((g) => g.groupKey === selectedGroupKey) : undefined;
    const groupListSubtitle =
        navigStep === 2 && selectedGroupRow?.message
            ? selectedGroupRow.message.length > 140
                ? `${selectedGroupRow.message.slice(0, 140)}…`
                : selectedGroupRow.message
            : t('domainResult.issuesAffectedPagesSubtitlePaged');

    const listColumnCardSx = {
        bgcolor: 'var(--color-card-bg)',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        height: { lg: '100%' },
    } as const;

    const listScrollSx = {
        flex: { lg: 1 },
        minHeight: { lg: 0, xs: 96 },
        maxHeight: { xs: DOMAIN_ISSUES_SCROLL.xs, lg: listScrollMaxLg },
        overflow: 'auto',
        overflowAnchor: 'none',
    } as const;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: '100%',
                minWidth: 0,
                minHeight: 0,
                flex: 1,
            }}
        >
            <MsqdxMoleculeCard
                title={t('domainResult.tabListDetails')}
                subtitle={t('domainResult.issuesMasterSubtitle')}
                variant="flat"
                borderRadius="lg"
                sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 1.5 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', width: '100%', mb: -0.5 }}>
                            {t('domainResult.issuesFilterSeverityLabel')}
                        </MsqdxTypography>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={typeToggleValue}
                            onChange={(_, v: string | null) => {
                                if (v == null) {
                                    onChangeFilters({ type: null });
                                    return;
                                }
                                onChangeFilters({ type: v === 'all' ? null : v });
                            }}
                            sx={toggleSx}
                            aria-label={t('domainResult.issuesFilterSeverityLabel')}
                        >
                            <ToggleButton value="all">{t('domainResult.issuesFilterAll')}</ToggleButton>
                            <ToggleButton value="error" sx={{ '&.Mui-selected': { bgcolor: alpha(MSQDX_STATUS.error.base, 0.15), color: MSQDX_STATUS.error.base } }}>
                                {t('domainResult.issuesFilterErrors')}
                            </ToggleButton>
                            <ToggleButton value="warning" sx={{ '&.Mui-selected': { bgcolor: alpha(MSQDX_STATUS.warning.base, 0.15), color: MSQDX_STATUS.warning.base } }}>
                                {t('domainResult.issuesFilterWarnings')}
                            </ToggleButton>
                            <ToggleButton value="notice" sx={{ '&.Mui-selected': { bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base } }}>
                                {t('domainResult.issuesFilterNotices')}
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', width: '100%', mb: -0.5 }}>
                            {t('domainResult.issuesFilterWcagLabel')}
                        </MsqdxTypography>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={wcagToggleValue}
                            onChange={(_, v: string | null) => {
                                if (v == null) {
                                    onChangeFilters({ wcag: null });
                                    return;
                                }
                                onChangeFilters({ wcag: v === 'all' ? null : v });
                            }}
                            sx={toggleSx}
                            aria-label={t('domainResult.issuesFilterWcagLabel')}
                        >
                            <ToggleButton value="all">{t('domainResult.issuesFilterAll')}</ToggleButton>
                            {(['A', 'AA', 'AAA', 'APCA'] as const).map((lvl) => (
                                <ToggleButton key={lvl} value={lvl}>
                                    {lvl}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                </Box>
                <MsqdxFormField
                    label={t('domainResult.issuesSearchLabel')}
                    value={qDraft}
                    onChange={(e) => setQDraft((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onChangeFilters({ q: qDraft.trim() ? qDraft.trim() : null });
                    }}
                    size="small"
                    placeholder={t('domainResult.issuesSearchPlaceholder')}
                    sx={{ mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    <MsqdxButton variant="outlined" size="small" onClick={() => onChangeFilters({ q: qDraft.trim() ? qDraft.trim() : null })}>
                        {t('domainResult.issuesApply')}
                    </MsqdxButton>
                    {(issuesQ || issuesType || issuesWcag) && (
                        <MsqdxButton variant="text" size="small" sx={{ color: MSQDX_BRAND_PRIMARY.green }} onClick={() => onChangeFilters({ type: null, wcag: null, q: null })}>
                            {t('domainResult.issuesResetFilters')}
                        </MsqdxButton>
                    )}
                </Box>
            </MsqdxMoleculeCard>

            <Box
                sx={{
                    flex: { lg: 1 },
                    minWidth: 0,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: { xs: 'none', lg: listScrollMaxLg },
                }}
            >
                {navigStep === 1 && (
                <MsqdxMoleculeCard
                    title={t('domainResult.issuesColumnGroupsTitle')}
                    variant="flat"
                    borderRadius="lg"
                    sx={listColumnCardSx}
                >
                {groupsError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base, flexShrink: 0 }}>{groupsError}</MsqdxTypography>}
                {groupsLoading && groups.length === 0 ? (
                    <Box sx={{ flex: 1, minHeight: { lg: 160 }, py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CircularProgress size={24} /></Box>
                ) : (
                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <Box ref={groupsScrollRef} sx={listScrollSx}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                            {groups.map((g) => {
                                const active = selectedGroupKey === g.groupKey;
                                const color = issueTypeColor(g.type);
                                return (
                                    <Box
                                        key={g.groupKey}
                                        component="button"
                                        type="button"
                                        onClick={() => onSelectGroup(g.groupKey)}
                                        aria-label={g.message}
                                        aria-selected={active}
                                        sx={{
                                            textAlign: 'left',
                                            width: '100%',
                                            border: 'none',
                                            background: 'none',
                                            padding: 0,
                                            font: 'inherit',
                                            cursor: 'pointer',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            ...issueRowFocusSx,
                                            ...rowHoverSx,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                minHeight: 112,
                                                border: `1px solid ${active ? color : 'var(--color-border-subtle, #eee)'}`,
                                                borderRadius: 1,
                                                bgcolor: active ? alpha(color, 0.06) : 'var(--color-card-bg)',
                                            }}
                                        >
                                            <IssueSeverityRail color={color} />
                                            <Box sx={{ flex: 1, minWidth: 0, py: 0.5, pr: 1, pl: 0.75 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                    <IssueTypeIcon type={g.type} size={15} />
                                                    <MsqdxChip size="small" label={`${g.pageCount} ${t('domainResult.issuesTablePages')}`} sx={{ fontSize: '0.65rem', height: 22 }} />
                                                    {g.wcagLevel && g.wcagLevel !== 'Unknown' && (
                                                        <MsqdxChip size="small" label={g.wcagLevel} sx={{ fontSize: '0.65rem', height: 22 }} />
                                                    )}
                                                    {g.runner && <MsqdxChip size="small" label={g.runner} sx={{ fontSize: '0.65rem', height: 22 }} />}
                                                </Box>
                                                <Tooltip title={g.message} placement="top-start">
                                                    <MsqdxTypography
                                                        variant="body2"
                                                        sx={{
                                                            mt: 0.5,
                                                            fontWeight: 600,
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                        }}
                                                    >
                                                        {g.message}
                                                    </MsqdxTypography>
                                                </Tooltip>
                                                <Tooltip title={g.code}>
                                                    <MsqdxTypography variant="caption" noWrap sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'ui-monospace, monospace', display: 'block', mt: 0.25 }}>
                                                        {g.code}
                                                    </MsqdxTypography>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                        {groupsCursor && (
                            <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
                                <MsqdxButton variant="outlined" size="small" onClick={loadMoreGroups} disabled={groupsLoading}>
                                    {groupsLoading ? t('common.loading') : t('common.loadMore')}
                                </MsqdxButton>
                            </Box>
                        )}
                    </Box>
                    </Box>
                )}
            </MsqdxMoleculeCard>
                )}

                {navigStep === 2 && (
                <MsqdxMoleculeCard
                    title={t('domainResult.issuesAffectedPagesTitle')}
                    subtitle={groupListSubtitle}
                    variant="flat"
                    borderRadius="lg"
                    sx={listColumnCardSx}
                >
                    <Box sx={{ flexShrink: 0, mb: 1 }}>
                        <MsqdxButton variant="text" size="small" startIcon={<ChevronLeft size={18} strokeWidth={2} aria-hidden />} onClick={onBackToGroups} sx={{ color: MSQDX_BRAND_PRIMARY.green, textTransform: 'none', px: 0.5 }}>
                            {t('domainResult.issuesBackToGroups')}
                        </MsqdxButton>
                    </Box>
                    {groupPagesError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base, flexShrink: 0 }}>{groupPagesError}</MsqdxTypography>}
                    {groupPagesLoading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
                    ) : groupPages.length === 0 && !groupPagesLoading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: { lg: 120 } }}>
                            <IssuesEmptyState icon={FileSearch} title={t('domainResult.issuesEmptyNoPagesTitle')} />
                        </Box>
                    ) : (
                        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <Box ref={groupPagesScrollRef} sx={listScrollSx}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {groupPages.map((p) => {
                                    const active = selectedPageId === p.pageId;
                                    const railColor = active ? MSQDX_BRAND_PRIMARY.green : MSQDX_NEUTRAL[300];
                                    return (
                                        <Box
                                            key={p.pageId}
                                            component="button"
                                            type="button"
                                            onClick={() => onSelectPage(p.pageId)}
                                            aria-selected={active}
                                            sx={{
                                                textAlign: 'left',
                                                width: '100%',
                                                border: 'none',
                                                background: 'none',
                                                padding: 0,
                                                font: 'inherit',
                                                cursor: 'pointer',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                ...issueRowFocusSx,
                                                ...rowHoverSx,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    minHeight: 82,
                                                    border: `1px solid ${active ? MSQDX_BRAND_PRIMARY.green : 'var(--color-border-subtle, #eee)'}`,
                                                    borderRadius: 1,
                                                    bgcolor: active ? alpha(MSQDX_BRAND_PRIMARY.green, 0.06) : 'var(--color-card-bg)',
                                                }}
                                            >
                                                <IssueSeverityRail color={railColor} />
                                                <Box sx={{ flex: 1, minWidth: 0, py: 0.5, pr: 0.5, pl: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75 }}>
                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                        <MsqdxTypography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', lineHeight: 1.25 }} noWrap title={titleFromUrl(p.url)}>
                                                            {titleFromUrl(p.url)}
                                                        </MsqdxTypography>
                                                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', fontSize: '0.7rem', lineHeight: 1.2 }} noWrap title={p.url}>
                                                            {p.url}
                                                        </MsqdxTypography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                                                        <MsqdxChip size="small" label={String(p.issueCount)} sx={{ fontSize: '0.6rem', height: 20 }} />
                                                        <Tooltip title={t('domainResult.openPage')}>
                                                            <IconButton
                                                                size="small"
                                                                sx={{ p: 0.35 }}
                                                                aria-label={t('domainResult.openPageAria', { url: p.url })}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    onOpenPageScan(p.url, p.scanId);
                                                                }}
                                                            >
                                                                <ExternalLink size={16} strokeWidth={2} aria-hidden />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                            {groupPagesCursor && (
                                <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
                                    <MsqdxButton variant="outlined" size="small" onClick={loadMoreGroupPages} disabled={groupPagesLoading}>
                                        {groupPagesLoading ? t('common.loading') : t('common.loadMore')}
                                    </MsqdxButton>
                                </Box>
                            )}
                        </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
                )}

                {navigStep === 3 && (
                <MsqdxMoleculeCard
                    title={t('domainResult.issuesPageDetailTitle')}
                    subtitle={(() => {
                        const id = selectedPageId;
                        if (!id) return '';
                        return groupPages.find((g) => g.pageId === id)?.url ?? pagesById.get(id)?.url ?? '';
                    })()}
                    variant="flat"
                    borderRadius="lg"
                    sx={listColumnCardSx}
                >
                    <Box sx={{ flexShrink: 0, mb: 1 }}>
                        <MsqdxButton variant="text" size="small" startIcon={<ChevronLeft size={18} strokeWidth={2} aria-hidden />} onClick={onBackToPages} sx={{ color: MSQDX_BRAND_PRIMARY.green, textTransform: 'none', px: 0.5 }}>
                            {t('domainResult.issuesBackToPages')}
                        </MsqdxButton>
                    </Box>
                    {pageIssuesError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base, flexShrink: 0 }}>{pageIssuesError}</MsqdxTypography>}
                    {pageIssuesLoading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}><CircularProgress size={20} /></Box>
                    ) : pageIssues.length === 0 && !pageIssuesLoading ? (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: { lg: 120 } }}>
                            <IssuesEmptyState icon={FileSearch} title={t('domainResult.issuesEmptyNoIssuesTitle')} />
                        </Box>
                    ) : (
                        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <Box ref={pageIssuesScrollRef} sx={listScrollSx}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                                {pageIssues.map((i) => {
                                    const color = issueTypeColor(i.type);
                                    return (
                                        <Box
                                            key={i.id}
                                            sx={{
                                                display: 'flex',
                                                border: `1px solid var(--color-border-subtle, #eee)`,
                                                borderRadius: 1,
                                                bgcolor: 'var(--color-card-bg)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <IssueSeverityRail color={color} />
                                            <Box sx={{ flex: 1, minWidth: 0, py: 0.5, pr: 1, pl: 0.75 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                    <IssueTypeIcon type={i.type} size={15} />
                                                    {i.wcagLevel && i.wcagLevel !== 'Unknown' && (
                                                        <MsqdxChip size="small" label={i.wcagLevel} sx={{ fontSize: '0.65rem', height: 22 }} />
                                                    )}
                                                    {i.runner && <MsqdxChip size="small" label={i.runner} sx={{ fontSize: '0.65rem', height: 22 }} />}
                                                </Box>
                                                <MsqdxTypography variant="body2" sx={{ mt: 0.5, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {i.message}
                                                </MsqdxTypography>
                                                <Tooltip title={i.code}>
                                                    <MsqdxTypography variant="caption" noWrap sx={{ fontFamily: 'ui-monospace, monospace', color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                                        {i.code}
                                                    </MsqdxTypography>
                                                </Tooltip>
                                                {i.selector && (
                                                    <SelectorCopyBlock
                                                        selector={i.selector}
                                                        labelCopy={t('domainResult.issuesCopySelector')}
                                                        copiedLabel={t('domainResult.issuesCopied')}
                                                    />
                                                )}
                                                {i.helpUrl && (
                                                    <Box sx={{ mt: 0.75 }}>
                                                        <Button
                                                            component="a"
                                                            href={i.helpUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            variant="outlined"
                                                            size="small"
                                                            startIcon={<ExternalLink size={14} strokeWidth={2} aria-hidden />}
                                                            sx={{ textTransform: 'none' }}
                                                        >
                                                            {t('domainResult.issuesGuidelineOpen')}
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                            {pageIssuesCursor && (
                                <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
                                    <MsqdxButton variant="outlined" size="small" onClick={loadMorePageIssues} disabled={pageIssuesLoading}>
                                        {pageIssuesLoading ? t('common.loading') : t('common.loadMore')}
                                    </MsqdxButton>
                                </Box>
                            )}
                        </Box>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
                )}
            </Box>
        </Box>
    );
}

export const DomainIssuesMasterDetail = memo(DomainIssuesMasterDetailInner);
