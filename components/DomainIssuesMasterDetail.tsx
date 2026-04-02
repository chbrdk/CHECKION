'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxButton, MsqdxChip, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { apiScanDomainIssueGroupPages, apiScanDomainIssueGroups, apiScanDomainPageIssues } from '@/lib/constants';
import type { SlimPage } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';

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

/** Fixed row heights avoid `measureElement` resize loops (major CPU cost with long lists). */
const V_GROUP_ESTIMATE_PX = 120;
const V_GROUP_PAGES_ESTIMATE_PX = 108;
const V_PAGE_ISSUES_ESTIMATE_PX = 100;
const V_OVERSCAN = 4;

const typeColor = (type: string) => type === 'error' ? MSQDX_STATUS.error.base : type === 'warning' ? MSQDX_STATUS.warning.base : MSQDX_STATUS.info.base;

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
    const groupVirtualizer = useVirtualizer({
        count: groups.length,
        getScrollElement: () => groupsScrollRef.current,
        estimateSize: () => V_GROUP_ESTIMATE_PX,
        overscan: V_OVERSCAN,
        getItemKey: (index) => groups[index]?.groupKey ?? index,
    });

    useEffect(() => {
        groupsScrollRef.current?.scrollTo({ top: 0 });
    }, [domainId, issuesType, issuesWcag, issuesQ]);

    const groupPagesScrollRef = useRef<HTMLDivElement>(null);
    const groupPagesVirtualizer = useVirtualizer({
        count: groupPages.length,
        getScrollElement: () => groupPagesScrollRef.current,
        estimateSize: () => V_GROUP_PAGES_ESTIMATE_PX,
        overscan: V_OVERSCAN,
        getItemKey: (index) => groupPages[index]?.pageId ?? index,
    });

    useEffect(() => {
        groupPagesScrollRef.current?.scrollTo({ top: 0 });
    }, [selectedGroupKey]);

    const pageIssuesScrollRef = useRef<HTMLDivElement>(null);
    const pageIssuesVirtualizer = useVirtualizer({
        count: pageIssues.length,
        getScrollElement: () => pageIssuesScrollRef.current,
        estimateSize: () => V_PAGE_ISSUES_ESTIMATE_PX,
        overscan: V_OVERSCAN,
        getItemKey: (index) => pageIssues[index]?.id ?? index,
    });

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

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' }, gap: 2, minWidth: 0 }}>
            <MsqdxMoleculeCard
                title={t('domainResult.tabListDetails')}
                subtitle={t('domainResult.issuesMasterSubtitle')}
                variant="flat"
                borderRadius="lg"
                sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
            >
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                    <MsqdxChip
                        label={t('domainResult.issuesFilterAll')}
                        size="small"
                        variant={!issuesType ? 'filled' : 'outlined'}
                        brandColor={!issuesType ? 'green' : undefined}
                        sx={{ cursor: 'pointer' }}
                        onClick={() => onChangeFilters({ type: null })}
                    />
                    <MsqdxChip
                        label={t('domainResult.issuesFilterErrors')}
                        size="small"
                        variant={issuesType === 'error' ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer', ...(issuesType === 'error' ? { backgroundColor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base } : {}) }}
                        onClick={() => onChangeFilters({ type: issuesType === 'error' ? null : 'error' })}
                    />
                    <MsqdxChip
                        label={t('domainResult.issuesFilterWarnings')}
                        size="small"
                        variant={issuesType === 'warning' ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer', ...(issuesType === 'warning' ? { backgroundColor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base } : {}) }}
                        onClick={() => onChangeFilters({ type: issuesType === 'warning' ? null : 'warning' })}
                    />
                    <MsqdxChip
                        label={t('domainResult.issuesFilterNotices')}
                        size="small"
                        variant={issuesType === 'notice' ? 'filled' : 'outlined'}
                        sx={{ cursor: 'pointer', ...(issuesType === 'notice' ? { backgroundColor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base } : {}) }}
                        onClick={() => onChangeFilters({ type: issuesType === 'notice' ? null : 'notice' })}
                    />
                    {(['A', 'AA', 'AAA', 'APCA'] as const).map((lvl) => (
                        <MsqdxChip
                            key={lvl}
                            label={lvl}
                            size="small"
                            variant={issuesWcag === lvl ? 'filled' : 'outlined'}
                            brandColor={issuesWcag === lvl ? 'green' : undefined}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => onChangeFilters({ wcag: issuesWcag === lvl ? null : lvl })}
                        />
                    ))}
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
                    <MsqdxButton
                        variant="outlined"
                        size="small"
                        onClick={() => onChangeFilters({ q: qDraft.trim() ? qDraft.trim() : null })}
                    >
                        {t('domainResult.issuesApply')}
                    </MsqdxButton>
                    {(issuesQ || issuesType || issuesWcag) && (
                        <MsqdxButton
                            variant="text"
                            size="small"
                            sx={{ color: MSQDX_BRAND_PRIMARY.green }}
                            onClick={() => onChangeFilters({ type: null, wcag: null, q: null })}
                        >
                            {t('domainResult.issuesResetFilters')}
                        </MsqdxButton>
                    )}
                </Box>
                {groupsError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{groupsError}</MsqdxTypography>}
                {groupsLoading && groups.length === 0 ? (
                    <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                ) : (
                    <Box
                        ref={groupsScrollRef}
                        sx={{ maxHeight: '65vh', overflow: 'auto', minHeight: 120 }}
                    >
                        <Box
                            sx={{
                                height: `${groupVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {groupVirtualizer.getVirtualItems().map((vi) => {
                                const g = groups[vi.index];
                                if (!g) return null;
                                const active = selectedGroupKey === g.groupKey;
                                const color = typeColor(g.type);
                                return (
                                    <div
                                        key={vi.key}
                                        data-index={vi.index}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${vi.start}px)`,
                                            paddingBottom: 8,
                                        }}
                                    >
                                        <Box
                                            component="button"
                                            type="button"
                                            onClick={() => onSelectGroup(g.groupKey)}
                                            sx={{
                                                textAlign: 'left',
                                                width: '100%',
                                                border: 'none',
                                                background: 'none',
                                                padding: 0,
                                                font: 'inherit',
                                                cursor: 'pointer',
                                            }}
                                            aria-label={g.message}
                                        >
                                            <Box sx={{
                                                border: `1px solid ${active ? color : 'var(--color-border-subtle, #eee)'}`,
                                                borderRadius: 1,
                                                p: 1,
                                                backgroundColor: active ? alpha(color, 0.08) : 'transparent',
                                            }}>
                                                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <MsqdxChip size="small" label={g.type} sx={{ bgcolor: alpha(color, 0.12), color, fontSize: '0.7rem' }} />
                                                    <MsqdxChip size="small" label={`${g.pageCount} ${t('domainResult.issuesTablePages')}`} sx={{ fontSize: '0.7rem' }} />
                                                    {g.wcagLevel && g.wcagLevel !== 'Unknown' && <MsqdxChip size="small" label={g.wcagLevel} sx={{ fontSize: '0.7rem' }} />}
                                                    {g.runner && <MsqdxChip size="small" label={g.runner} sx={{ fontSize: '0.7rem' }} />}
                                                </Box>
                                                <MsqdxTypography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                                                    {g.message}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                                    {g.code}
                                                </MsqdxTypography>
                                            </Box>
                                        </Box>
                                    </div>
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
                )}
            </MsqdxMoleculeCard>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <MsqdxMoleculeCard
                    title={t('domainResult.issuesAffectedPagesTitle')}
                    subtitle={selectedGroupKey ? t('domainResult.issuesAffectedPagesSubtitlePaged') : t('domainResult.issuesAffectedPagesSubtitlePickGroup')}
                    variant="flat"
                    borderRadius="lg"
                    sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
                >
                    {groupPagesError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{groupPagesError}</MsqdxTypography>}
                    {groupPagesLoading && selectedGroupKey ? (
                        <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                    ) : (
                        <Box
                            ref={groupPagesScrollRef}
                            sx={{ maxHeight: '42vh', overflow: 'auto', minHeight: 80 }}
                        >
                            <Box
                                sx={{
                                    height: `${groupPagesVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {groupPagesVirtualizer.getVirtualItems().map((vi) => {
                                    const p = groupPages[vi.index];
                                    if (!p) return null;
                                    const active = selectedPageId === p.pageId;
                                    return (
                                        <div
                                            key={vi.key}
                                            data-index={vi.index}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${vi.start}px)`,
                                                paddingBottom: 8,
                                            }}
                                        >
                                            <Box
                                                component="button"
                                                type="button"
                                                onClick={() => onSelectPage(p.pageId)}
                                                sx={{
                                                    textAlign: 'left',
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'none',
                                                    padding: 0,
                                                    font: 'inherit',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Box sx={{
                                                    border: `1px solid ${active ? MSQDX_BRAND_PRIMARY.green : 'var(--color-border-subtle, #eee)'}`,
                                                    borderRadius: 1,
                                                    p: 1,
                                                    backgroundColor: active ? alpha(MSQDX_BRAND_PRIMARY.green, 0.08) : 'transparent',
                                                }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }}>
                                                                {titleFromUrl(p.url)}
                                                            </MsqdxTypography>
                                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                                {p.url}
                                                            </MsqdxTypography>
                                                        </Box>
                                                        <MsqdxChip size="small" label={String(p.issueCount)} sx={{ fontSize: '0.7rem' }} />
                                                    </Box>
                                                    <Box sx={{ mt: 0.75 }}>
                                                        <MsqdxButton
                                                            variant="text"
                                                            size="small"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPageScan(p.url, p.scanId); }}
                                                            sx={{ color: MSQDX_BRAND_PRIMARY.green }}
                                                        >
                                                            {t('domainResult.openPage')}
                                                        </MsqdxButton>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </div>
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
                    )}
                </MsqdxMoleculeCard>

                <MsqdxMoleculeCard
                    title={t('domainResult.issuesPageDetailTitle')}
                    subtitle={
                        selectedPageId
                            ? (groupPages.find((g) => g.pageId === selectedPageId)?.url
                                ?? pagesById.get(selectedPageId)?.url
                                ?? '')
                            : t('domainResult.issuesPageDetailSubtitlePick')
                    }
                    variant="flat"
                    borderRadius="lg"
                    sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
                >
                    {pageIssuesError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{pageIssuesError}</MsqdxTypography>}
                    {pageIssuesLoading && selectedPageId ? (
                        <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                    ) : (
                        <Box
                            ref={pageIssuesScrollRef}
                            sx={{ maxHeight: 320, overflow: 'auto', minHeight: 60 }}
                        >
                            <Box
                                sx={{
                                    height: `${pageIssuesVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {pageIssuesVirtualizer.getVirtualItems().map((vi) => {
                                    const i = pageIssues[vi.index];
                                    if (!i) return null;
                                    const color = typeColor(i.type);
                                    return (
                                        <div
                                            key={vi.key}
                                            data-index={vi.index}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                transform: `translateY(${vi.start}px)`,
                                                paddingBottom: 6,
                                            }}
                                        >
                                            <Box sx={{ border: '1px solid var(--color-border-subtle, #eee)', borderRadius: 1, p: 1 }}>
                                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <MsqdxChip size="small" label={i.type} sx={{ bgcolor: alpha(color, 0.12), color, fontSize: '0.7rem' }} />
                                                    {i.wcagLevel && i.wcagLevel !== 'Unknown' && <MsqdxChip size="small" label={i.wcagLevel} sx={{ fontSize: '0.7rem' }} />}
                                                    {i.runner && <MsqdxChip size="small" label={i.runner} sx={{ fontSize: '0.7rem' }} />}
                                                </Box>
                                                <MsqdxTypography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                                                    {i.message}
                                                </MsqdxTypography>
                                                <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', color: 'var(--color-text-muted-on-light)' }}>
                                                    {i.code}
                                                </MsqdxTypography>
                                                {i.helpUrl && (
                                                    <a href={i.helpUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: '0.75rem', color: MSQDX_BRAND_PRIMARY.green, textDecoration: 'underline' }}>
                                                        {t('results.fixDocs')} →
                                                    </a>
                                                )}
                                            </Box>
                                        </div>
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
                    )}
                </MsqdxMoleculeCard>
            </Box>
        </Box>
    );
}

export const DomainIssuesMasterDetail = memo(DomainIssuesMasterDetailInner);
