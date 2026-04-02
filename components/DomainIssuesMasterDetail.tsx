'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxButton, MsqdxChip, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
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

type GroupPageRow = { pageId: string; url: string; issueCount: number };
type PageIssueRow = { id: string; groupKey: string; type: string; code: string; message: string; runner: string | null; wcagLevel: string | null; helpUrl: string | null; selector: string | null };

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

export function DomainIssuesMasterDetail({
    domainId,
    pages,
    selectedGroupKey,
    selectedPageId,
    onSelectGroup,
    onSelectPage,
    onOpenPageScan,
}: {
    domainId: string;
    pages: SlimPage[];
    selectedGroupKey: string | null;
    selectedPageId: string | null;
    onSelectGroup: (groupKey: string) => void;
    onSelectPage: (pageId: string) => void;
    onOpenPageScan: (url: string) => void;
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

    const pagesById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);

    useEffect(() => {
        let cancelled = false;
        setGroupsLoading(true);
        setGroupsError(null);
        fetch(apiScanDomainIssueGroups(domainId, { limit: 50 }))
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
    }, [domainId, t]);

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

    const loadMoreGroups = async () => {
        if (!groupsCursor || groupsLoading) return;
        setGroupsLoading(true);
        try {
            const res = await fetch(apiScanDomainIssueGroups(domainId, { limit: 50, cursorPageCount: groupsCursor.pageCount, cursorGroupKey: groupsCursor.groupKey }));
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
                subtitle="Gruppen (paged)"
                variant="flat"
                borderRadius="lg"
                sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
            >
                {groupsError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{groupsError}</MsqdxTypography>}
                {groupsLoading && groups.length === 0 ? (
                    <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: '65vh', overflow: 'auto' }}>
                        {groups.map((g) => {
                            const active = selectedGroupKey === g.groupKey;
                            const color = typeColor(g.type);
                            return (
                                <Box
                                    key={g.groupKey}
                                    component="button"
                                    onClick={() => onSelectGroup(g.groupKey)}
                                    style={{ textAlign: 'left' }}
                                    aria-label={g.message}
                                >
                                    <Box sx={{
                                        border: `1px solid ${active ? color : 'var(--color-border-subtle, #eee)'}`,
                                        borderRadius: 1,
                                        p: 1,
                                        backgroundColor: active ? alpha(color, 0.08) : 'transparent',
                                        cursor: 'pointer',
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
                            );
                        })}
                        {groupsCursor && (
                            <MsqdxButton variant="outlined" size="small" onClick={loadMoreGroups} disabled={groupsLoading}>
                                {groupsLoading ? t('common.loading') : t('common.loadMore')}
                            </MsqdxButton>
                        )}
                    </Box>
                )}
            </MsqdxMoleculeCard>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <MsqdxMoleculeCard
                    title="Betroffene Seiten"
                    subtitle={selectedGroupKey ? 'URLs (paged)' : 'Wähle links eine Gruppe'}
                    variant="flat"
                    borderRadius="lg"
                    sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
                >
                    {groupPagesError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{groupPagesError}</MsqdxTypography>}
                    {groupPagesLoading && selectedGroupKey ? (
                        <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {groupPages.map((p) => {
                                const active = selectedPageId === p.pageId;
                                return (
                                    <Box
                                        key={p.pageId}
                                        component="button"
                                        onClick={() => onSelectPage(p.pageId)}
                                        style={{ textAlign: 'left' }}
                                    >
                                        <Box sx={{
                                            border: `1px solid ${active ? MSQDX_BRAND_PRIMARY.green : 'var(--color-border-subtle, #eee)'}`,
                                            borderRadius: 1,
                                            p: 1,
                                            cursor: 'pointer',
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
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPageScan(p.url); }}
                                                    sx={{ color: MSQDX_BRAND_PRIMARY.green }}
                                                >
                                                    {t('domainResult.openPage')}
                                                </MsqdxButton>
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                            {groupPagesCursor && (
                                <MsqdxButton variant="outlined" size="small" onClick={loadMoreGroupPages} disabled={groupPagesLoading}>
                                    {groupPagesLoading ? t('common.loading') : t('common.loadMore')}
                                </MsqdxButton>
                            )}
                        </Box>
                    )}
                </MsqdxMoleculeCard>

                <MsqdxMoleculeCard
                    title="Issues (Seite)"
                    subtitle={selectedPageId ? (pagesById.get(selectedPageId)?.url ?? '') : 'Wähle oben eine Seite'}
                    variant="flat"
                    borderRadius="lg"
                    sx={{ bgcolor: 'var(--color-card-bg)', minWidth: 0 }}
                >
                    {pageIssuesError && <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{pageIssuesError}</MsqdxTypography>}
                    {pageIssuesLoading && selectedPageId ? (
                        <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress size={20} /></Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, maxHeight: 320, overflow: 'auto' }}>
                            {pageIssues.map((i) => {
                                const color = typeColor(i.type);
                                return (
                                    <Box key={i.id} sx={{ border: '1px solid var(--color-border-subtle, #eee)', borderRadius: 1, p: 1 }}>
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
                                );
                            })}
                            {pageIssuesCursor && (
                                <MsqdxButton variant="outlined" size="small" onClick={loadMorePageIssues} disabled={pageIssuesLoading}>
                                    {pageIssuesLoading ? t('common.loading') : t('common.loadMore')}
                                </MsqdxButton>
                            )}
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            </Box>
        </Box>
    );
}

