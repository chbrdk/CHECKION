'use client';

import React, { useState, useMemo } from 'react';
import { alpha, Box, CircularProgress } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxChip, MsqdxFormField } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { Trash2 } from 'lucide-react';
import type { StandaloneScanSummary } from '@/lib/types';
import { useI18n } from '@/components/i18n/I18nProvider';

export type DomainScanSummary = {
    id: string;
    domain: string;
    timestamp: string;
    status: string;
    score: number;
    totalPages: number;
    projectId?: string | null;
    lineageVersion?: number;
};

interface StyledScoreChips {
    label: string;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
    sx: Record<string, string | number | boolean | object | undefined>;
}

const listItemSx = {
    cursor: 'pointer',
    '&:hover': { bgcolor: 'var(--color-theme-accent-tint)' },
    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
    borderRadius: 'var(--msqdx-radius-sm)',
    mb: 'var(--msqdx-spacing-xs)',
    p: 'var(--msqdx-spacing-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--msqdx-spacing-sm)',
} as const;

const styledScoreChips = (score: number, status?: string): StyledScoreChips => ({
    label: status && status !== 'complete' ? status : String(score),
    color: status && status !== 'complete' ? 'info' : score > 80 ? 'success' : 'warning',
    sx: {
        backgroundColor:
            status && status !== 'complete'
                ? `${alpha(MSQDX_STATUS.info.light, 0.08)}`
                : score > 80
                  ? `${alpha(MSQDX_STATUS.success.light, 0.08)}`
                  : `${alpha(MSQDX_STATUS.warning.light, 0.08)}`,
        '& span.MuiChip-label': {
            fontSize: '0.875rem',
            color:
                status && status !== 'complete'
                    ? MSQDX_STATUS.info.dark
                    : score > 80
                      ? MSQDX_STATUS.success.dark
                      : MSQDX_STATUS.warning.dark,
        },
    },
});

/** Single-URL scan row (same list style as domain "Scanned Pages" / results). */
export function SingleScanRow({
    scan,
    onClick,
    onDelete,
}: {
    scan: StandaloneScanSummary;
    onClick: () => void;
    onDelete?: (id: string) => void;
}) {
    const { t } = useI18n();
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(scan.id);
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <Box
            component="li"
            role="button"
            tabIndex={0}
            aria-label={t('dashboard.openScanAria', { url: scan.url })}
            sx={listItemSx}
            onClick={onClick}
            onKeyDown={handleKeyDown}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <MsqdxTypography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                    }}
                >
                    {scan.url}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    <span suppressHydrationWarning>{new Date(scan.timestamp).toLocaleString('de-DE')}</span>
                </MsqdxTypography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                {/* {scan.viewports ? (
                    scan.viewports.map((vp, i) => <MsqdxChip key={i} color="info" label={vp} />)
                ) : (
                    <MsqdxChip color="info" label={scan.device} />
                )} */}
                <MsqdxTypography variant="body1">{`${t('dashboard.scoreChipLabel')}:`}</MsqdxTypography>
                <MsqdxChip
                    color={styledScoreChips(scan.score).color}
                    label={scan.score}
                    size="small"
                    variant="outlined"
                    sx={styledScoreChips(scan.score).sx}
                />
                {onDelete && (
                    <MsqdxButton
                        variant="text"
                        size="small"
                        onClick={handleDelete}
                        aria-label={t('dashboard.deleteScanAria')}
                        sx={{ minWidth: 32, p: 0.5, color: 'var(--color-text-muted-on-light)' }}
                    >
                        <Trash2 size={16} />
                    </MsqdxButton>
                )}
            </Box>
        </Box>
    );
}

/** Domain scan summary row (same list style as results). */
export function DomainScanRow({
    item,
    onClick,
    onDelete,
}: {
    item: DomainScanSummary;
    onClick: () => void;
    onDelete?: (id: string) => void;
}) {
    const { t } = useI18n();
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(item.id);
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    };
    return (
        <Box
            component="li"
            role="button"
            tabIndex={0}
            aria-label={t('dashboard.openDomainScanAria', { domain: item.domain })}
            sx={listItemSx}
            onClick={onClick}
            onKeyDown={handleKeyDown}
        >
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <MsqdxTypography
                    variant="body2"
                    sx={{
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        mb: 0.5,
                    }}
                >
                    {item.domain}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    <span suppressHydrationWarning>{new Date(item.timestamp).toLocaleString('de-DE')}</span> ·{' '}
                    {item.totalPages} {t('deepScans.listPagesSuffix')}
                    {item.projectId == null || item.projectId === ''
                        ? ` · ${t('deepScans.noProject')}`
                        : ` · ${t('deepScans.colProject')}: ${item.projectId.slice(0, 8)}…`}
                    {typeof item.lineageVersion === 'number' && item.lineageVersion > 0
                        ? ` · ${t('deepScans.lineageVersion').replace('{version}', String(item.lineageVersion))}`
                        : ''}
                </MsqdxTypography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                {item.status === 'complete' && (
                    <MsqdxTypography variant="body1">{`${t('dashboard.scoreChipLabel')}:`}</MsqdxTypography>
                )}
                <MsqdxChip
                    label={styledScoreChips(item.score, item.status).label}
                    size="small"
                    variant="outlined"
                    color={styledScoreChips(item.score, item.status).color}
                    sx={styledScoreChips(item.score, item.status).sx}
                />
                {onDelete && (
                    <MsqdxButton
                        variant="text"
                        size="small"
                        onClick={handleDelete}
                        aria-label={t('dashboard.deleteDomainScanAria')}
                        sx={{ minWidth: 32, p: 0.5, color: 'var(--color-text-muted-on-light)' }}
                    >
                        <Trash2 size={16} />
                    </MsqdxButton>
                )}
            </Box>
        </Box>
    );
}

interface HistoryListProps<T> {
    loading: boolean;
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    filterFn: (item: T, query: string) => boolean;
    emptyMessage: string;
    emptyActionLabel: string;
    onEmptyAction: () => void;
    hasSearch?: boolean;
}

/**
 * Wrapper for scan history with built-in client-side filtering.
 * Filter activates after 2 characters are typed.
 */
export function HistoryList<T>({
    loading,
    items,
    renderItem,
    filterFn,
    emptyMessage,
    emptyActionLabel,
    onEmptyAction,
    hasSearch = true,
}: HistoryListProps<T>) {
    const { t } = useI18n();
    const [filterQuery, setFilterQuery] = useState('');

    const filteredItems = useMemo(() => {
        if (!hasSearch || filterQuery.length < 2) return items;
        const q = filterQuery.toLowerCase();
        return items.filter((item) => filterFn(item, q));
    }, [items, filterQuery, hasSearch, filterFn]);

    const showEmpty = !loading && filteredItems.length === 0;
    const showSpinnerOnly = loading && items.length === 0;
    const showChildren = filteredItems.length > 0;

    return (
        <>
            {hasSearch && (
                <Box sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxFormField
                        label={t('dashboard.searchLabel')}
                        placeholder={t('dashboard.searchPlaceholder')}
                        value={filterQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilterQuery(e.target.value)}
                        sx={{
                            width: '33%',
                            '& input[type="text"]': { fontSize: 'var(--msqdx-font-size-base) !important' },
                        }}
                    />
                </Box>
            )}
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                {showSpinnerOnly && (
                    <Box
                        component="li"
                        sx={{
                            ...listItemSx,
                            cursor: 'default',
                            justifyContent: 'center',
                            gap: 'var(--msqdx-spacing-sm)',
                        }}
                    >
                        <CircularProgress size={20} sx={{ color: 'var(--color-theme-accent)' }} />
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            Laden…
                        </MsqdxTypography>
                    </Box>
                )}
                {showEmpty && (
                    <Box
                        component="li"
                        sx={{
                            ...listItemSx,
                            cursor: 'default',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            py: 'var(--msqdx-spacing-lg)',
                        }}
                    >
                        <MsqdxTypography
                            variant="body2"
                            sx={{ color: 'var(--color-text-muted-on-light)', mb: 'var(--msqdx-spacing-sm)' }}
                        >
                            {filterQuery.length >= 2 ? t('dashboard.noFilterResults') : emptyMessage}
                        </MsqdxTypography>
                        {filterQuery.length < 2 && (
                            <MsqdxButton variant="outlined" brandColor="green" size="small" onClick={onEmptyAction}>
                                {emptyActionLabel}
                            </MsqdxButton>
                        )}
                    </Box>
                )}
                {showChildren && (
                    <>
                        {loading && (
                            <Box
                                component="li"
                                sx={{
                                    ...listItemSx,
                                    cursor: 'default',
                                    justifyContent: 'center',
                                    gap: 'var(--msqdx-spacing-sm)',
                                    py: 'var(--msqdx-spacing-xs)',
                                }}
                            >
                                <CircularProgress size={16} sx={{ color: 'var(--color-theme-accent)' }} />
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    Aktualisiere…
                                </MsqdxTypography>
                            </Box>
                        )}
                        {filteredItems.map(renderItem)}
                    </>
                )}
            </Box>
        </>
    );
}
