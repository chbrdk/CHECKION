'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material';
import { Eye, Tags, Trash2 } from 'lucide-react';
import { MsqdxButton, MsqdxFormField, MsqdxIconButton, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PaginationBar } from '@/components/PaginationBar';
import {
    API_AUTH_CAPABILITIES,
    DASHBOARD_SCANS_PAGE_SIZE,
    apiScansDomainDelete,
    apiScansDomainList,
    apiScansDomainTags,
    pathDeepScansCompare,
    pathDomain,
} from '@/lib/constants';
import { COMPACT_DATA_TABLE_SX } from '@/lib/compact-data-table-sx';
import { parseTagsFromInput } from '@/lib/tag-utils';
import { INDUSTRY_POOL, industryDisplayLabel } from '@/lib/industry-pool';
import type { DomainScanStatus } from '@/lib/types';

type Row = {
    id: string;
    domain: string;
    timestamp: string;
    status: string;
    score: number;
    totalPages: number;
    lineageVersion?: number;
    projectId?: string | null;
    userId?: string;
    industry?: string | null;
    projectTags?: string[];
    tags?: string[];
    platformsLine?: string | null;
    infraLine?: string | null;
    privacyLine?: string | null;
};

/** Light-card context: MUI theme header color can be illegible on `--color-card-bg`. */
const DEEP_SCANS_HEAD_CELL_SX = {
    color: 'var(--color-text-on-light, #0f172a)',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    bgcolor: 'rgba(15, 23, 42, 0.06)',
    borderBottomColor: 'var(--color-secondary-dx-grey-light-tint)',
};

const DEEP_SCANS_BODY_TEXT = 'var(--color-text-on-light, #0f172a)';
const DEEP_SCANS_BODY_CELL_SX = { color: DEEP_SCANS_BODY_TEXT };

/** Stays visible on horizontal scroll; bg matches row hover (MUI default ~4% dark). */
const DEEP_SCANS_DELETE_ICON_SX = {
    color: 'var(--color-status-error)',
    borderColor: 'var(--color-status-error)',
    '&:hover': {
        backgroundColor: 'var(--color-status-error)',
        color: '#fff',
        borderColor: 'var(--color-status-error)',
    },
    '& svg': { color: 'inherit' },
} as const;

const DEEP_SCANS_HEAD_ACTIONS_CELL_SX = {
    ...DEEP_SCANS_HEAD_CELL_SX,
    position: 'sticky' as const,
    right: 0,
    zIndex: 5,
    minWidth: 132,
    whiteSpace: 'nowrap' as const,
    boxShadow: '-8px 0 14px -6px rgba(15, 23, 42, 0.18)',
    borderLeft: '1px solid var(--color-secondary-dx-grey-light-tint, rgba(148, 163, 184, 0.45))',
};

const DEEP_SCANS_BODY_ACTIONS_CELL_SX = {
    ...DEEP_SCANS_BODY_CELL_SX,
    position: 'sticky' as const,
    right: 0,
    zIndex: 3,
    minWidth: 132,
    whiteSpace: 'nowrap' as const,
    bgcolor: 'var(--color-card-bg, #ffffff)',
    boxShadow: '-8px 0 14px -6px rgba(15, 23, 42, 0.18)',
    borderLeft: '1px solid var(--color-secondary-dx-grey-light-tint, rgba(148, 163, 184, 0.45))',
    '.MuiTableRow-root:hover &': {
        bgcolor: 'rgba(15, 23, 42, 0.04)',
    },
};

const STATUSES: DomainScanStatus[] = [
    'queued',
    'scanning',
    'cancelling',
    'paused',
    'complete',
    'error',
    'cancelled',
];

export default function DeepScansPage() {
    const { t } = useI18n();
    const router = useRouter();
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [qInput, setQInput] = useState('');
    const [qApplied, setQApplied] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    /** `all` = every deep scan; `unassigned` = only rows with project_id IS NULL. */
    const [projectFilter, setProjectFilter] = useState<'all' | 'unassigned'>('all');
    const [selected, setSelected] = useState<string[]>([]);
    const [listScope, setListScope] = useState<'mine' | 'allUsers'>('mine');
    const [canListAllUsers, setCanListAllUsers] = useState(false);
    const [sessionUserId, setSessionUserId] = useState<string | null>(null);
    const [industryInput, setIndustryInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [industryApplied, setIndustryApplied] = useState('');
    const [tagApplied, setTagApplied] = useState('');

    const limit = DASHBOARD_SCANS_PAGE_SIZE;

    useEffect(() => {
        void (async () => {
            try {
                const res = await fetch(API_AUTH_CAPABILITIES, { credentials: 'same-origin' });
                const data = (await res.json()) as {
                    userId?: string;
                    domainScansListAllUsers?: boolean;
                };
                if (typeof data.userId === 'string') setSessionUserId(data.userId);
                setCanListAllUsers(data.domainScansListAllUsers === true);
            } catch {
                setCanListAllUsers(false);
            }
        })();
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                apiScansDomainList({
                    page,
                    limit,
                    ...(projectFilter === 'unassigned' ? { projectId: null } : {}),
                    ...(qApplied.trim() ? { q: qApplied.trim() } : {}),
                    ...(statusFilter ? { status: statusFilter } : {}),
                    ...(industryApplied.trim() ? { industry: industryApplied.trim() } : {}),
                    ...(tagApplied.trim() ? { tag: tagApplied.trim() } : {}),
                    ...(listScope === 'allUsers' && canListAllUsers ? { scope: 'allUsers' } : {}),
                }),
                { credentials: 'same-origin' }
            );
            const data = await res.json();
            if (data?.success && Array.isArray(data.data)) {
                setRows(data.data);
                const tp = data.pagination?.totalPages;
                setTotalPages(typeof tp === 'number' ? Math.max(1, tp) : 1);
            } else {
                setRows([]);
                setTotalPages(1);
            }
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [page, limit, projectFilter, qApplied, statusFilter, industryApplied, tagApplied, listScope, canListAllUsers]);

    useEffect(() => {
        void load();
    }, [load]);

    const applyFilters = () => {
        setPage(1);
        setQApplied(qInput);
        setIndustryApplied(industryInput);
        setTagApplied(tagInput);
    };

    const editScanTags = async (scanId: string, current: string[]) => {
        const raw = window.prompt(t('deepScans.editTagsPrompt'), current.join(', '));
        if (raw == null) return;
        const tags = parseTagsFromInput(raw);
        try {
            const res = await fetch(apiScansDomainTags(scanId), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ tags }),
            });
            if (res.ok) void load();
        } catch {
            /* ignore */
        }
    };

    const tagSummary = (r: Row) => {
        const merged = [...new Set([...(r.projectTags ?? []), ...(r.tags ?? [])])];
        if (merged.length === 0) return '—';
        const shown = merged.slice(0, 5);
        const suffix = merged.length > 5 ? '…' : '';
        return `${shown.join(', ')}${suffix}`;
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            if (prev.length < 2) return [...prev, id];
            return [prev[1], id];
        });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('deepScans.deleteConfirm'))) return;
        try {
            const res = await fetch(apiScansDomainDelete(id), { method: 'DELETE', credentials: 'same-origin' });
            if (res.ok) {
                setRows((r) => r.filter((x) => x.id !== id));
                setSelected((s) => s.filter((x) => x !== id));
            }
        } catch {
            /* ignore */
        }
    };

    const goCompare = () => {
        if (selected.length !== 2) return;
        router.push(pathDeepScansCompare(selected[0], selected[1]));
    };

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
            <MsqdxTypography variant="h3" weight="bold" sx={{ mb: 1 }}>
                {t('deepScans.title')}
            </MsqdxTypography>
            <MsqdxTypography variant="body1" sx={{ mb: 2, color: 'var(--color-text-secondary)' }}>
                {t('deepScans.subtitle')}
            </MsqdxTypography>

            <MsqdxMoleculeCard title="" variant="flat" borderRadius="lg" footerDivider={false} sx={{ mb: 2, bgcolor: 'var(--color-card-bg)' }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
                    <Box sx={{ flex: '1 1 200px', minWidth: 160 }}>
                        <MsqdxFormField
                            label={t('deepScans.filterDomain')}
                            value={qInput}
                            onChange={(e) => setQInput((e.target as HTMLInputElement).value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        />
                    </Box>
                    {canListAllUsers ? (
                        <Box sx={{ minWidth: 200 }}>
                            <Typography component="label" variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                                {t('deepScans.scopeLabel')}
                            </Typography>
                            <select
                                aria-label={t('deepScans.scopeLabel')}
                                value={listScope}
                                onChange={(e) => {
                                    setListScope(e.target.value as 'mine' | 'allUsers');
                                    setPage(1);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                }}
                            >
                                <option value="mine">{t('deepScans.scopeMine')}</option>
                                <option value="allUsers">{t('deepScans.scopeAllUsers')}</option>
                            </select>
                        </Box>
                    ) : null}
                    <Box sx={{ minWidth: 200 }}>
                        <Typography component="label" variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            {t('deepScans.filterProject')}
                        </Typography>
                        <select
                            aria-label={t('deepScans.filterProject')}
                            value={projectFilter}
                            onChange={(e) => {
                                setProjectFilter(e.target.value as 'all' | 'unassigned');
                                setPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            }}
                        >
                            <option value="all">{t('deepScans.filterProjectAll')}</option>
                            <option value="unassigned">{t('deepScans.filterProjectUnassigned')}</option>
                        </select>
                    </Box>
                    <Box sx={{ minWidth: 180 }}>
                        <Typography component="label" variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            {t('deepScans.filterStatus')}
                        </Typography>
                        <select
                            aria-label={t('deepScans.filterStatus')}
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            }}
                        >
                            <option value="">{t('deepScans.statusAll')}</option>
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </Box>
                    <Box sx={{ flex: '1 1 200px', minWidth: 160 }}>
                        <Typography component="label" variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                            {t('deepScans.filterIndustry')}
                        </Typography>
                        <select
                            aria-label={t('deepScans.filterIndustry')}
                            value={industryInput}
                            onChange={(e) => setIndustryInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            }}
                        >
                            <option value="">{t('deepScans.filterIndustryAll')}</option>
                            {INDUSTRY_POOL.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {t(`industryPool.${p.id}`)}
                                </option>
                            ))}
                        </select>
                    </Box>
                    <Box sx={{ flex: '1 1 120px', minWidth: 100 }}>
                        <MsqdxFormField
                            label={t('deepScans.filterTag')}
                            value={tagInput}
                            onChange={(e) => setTagInput((e.target as HTMLInputElement).value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                        />
                    </Box>
                    <MsqdxButton variant="outlined" onClick={applyFilters}>
                        {t('dashboard.searchButton')}
                    </MsqdxButton>
                    <MsqdxButton variant="contained" disabled={selected.length !== 2} onClick={goCompare}>
                        {t('deepScans.compare')}
                    </MsqdxButton>
                </Box>
                {selected.length === 1 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        {t('deepScans.compareNeedTwo')}
                    </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, maxWidth: 720 }}>
                    {t('deepScans.classificationListHint')}
                </Typography>
            </MsqdxMoleculeCard>

            <MsqdxMoleculeCard title="" variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)' }}>
                {loading && rows.length === 0 ? (
                    <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
                ) : rows.length === 0 ? (
                    <MsqdxTypography variant="body2">{t('deepScans.empty')}</MsqdxTypography>
                ) : (
                    <TableContainer sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <Table size="small" sx={{ minWidth: 1120, ...COMPACT_DATA_TABLE_SX }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox" sx={DEEP_SCANS_HEAD_CELL_SX}>
                                        {t('deepScans.colSelect')}
                                    </TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colDomain')}</TableCell>
                                    {listScope === 'allUsers' ? (
                                        <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colOwner')}</TableCell>
                                    ) : null}
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colIndustry')}</TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colTags')}</TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colStack')}</TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colInfra')}</TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX} title={t('deepScans.colPrivacyHint')}>
                                        {t('deepScans.colPrivacy')}
                                    </TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colProject')}</TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colDate')}</TableCell>
                                    <TableCell sx={DEEP_SCANS_HEAD_CELL_SX}>{t('deepScans.colStatus')}</TableCell>
                                    <TableCell align="right" sx={DEEP_SCANS_HEAD_CELL_SX}>
                                        {t('deepScans.colScore')}
                                    </TableCell>
                                    <TableCell align="right" sx={DEEP_SCANS_HEAD_CELL_SX}>
                                        {t('deepScans.colPages')}
                                    </TableCell>
                                    <TableCell align="right" sx={DEEP_SCANS_HEAD_ACTIONS_CELL_SX}>
                                        {t('deepScans.colActions')}
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                checked={selected.includes(r.id)}
                                                onChange={() => toggleSelect(r.id)}
                                                inputProps={{ 'aria-label': `${t('deepScans.colSelect')} ${r.domain}` }}
                                            />
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 280, color: DEEP_SCANS_BODY_TEXT }}>
                                                {r.domain}
                                                {typeof r.lineageVersion === 'number' ? (
                                                    <Typography
                                                        component="span"
                                                        variant="caption"
                                                        sx={{
                                                            ml: 0.75,
                                                            color: 'var(--color-text-secondary)',
                                                            fontSize: '0.75rem',
                                                        }}
                                                    >
                                                        {t('deepScans.lineageVersion').replace(
                                                            '{version}',
                                                            String(r.lineageVersion)
                                                        )}
                                                    </Typography>
                                                ) : null}
                                            </Typography>
                                        </TableCell>
                                        {listScope === 'allUsers' ? (
                                            <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{ maxWidth: 140, color: DEEP_SCANS_BODY_TEXT }}
                                                    title={r.userId ?? ''}
                                                >
                                                    {r.userId
                                                        ? `${r.userId.slice(0, 8)}…`
                                                        : t('deepScans.ownerUnknown')}
                                                </Typography>
                                            </TableCell>
                                        ) : null}
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{ maxWidth: 160, color: DEEP_SCANS_BODY_TEXT }}
                                                title={r.industry?.trim() ? industryDisplayLabel(r.industry, t) : ''}
                                            >
                                                {r.industry?.trim() ? industryDisplayLabel(r.industry, t) : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{ maxWidth: 200, color: DEEP_SCANS_BODY_TEXT }}
                                                title={tagSummary(r)}
                                            >
                                                {tagSummary(r)}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{ maxWidth: 200, color: DEEP_SCANS_BODY_TEXT }}
                                                title={r.platformsLine ?? ''}
                                            >
                                                {r.platformsLine?.trim() ? r.platformsLine : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{ maxWidth: 220, color: DEEP_SCANS_BODY_TEXT }}
                                                title={r.infraLine ?? ''}
                                            >
                                                {r.infraLine?.trim() ? r.infraLine : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{ maxWidth: 260, color: DEEP_SCANS_BODY_TEXT }}
                                                title={r.privacyLine?.trim() ? r.privacyLine : t('deepScans.colPrivacyHint')}
                                            >
                                                {r.privacyLine?.trim() ? r.privacyLine : '—'}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <Typography
                                                variant="body2"
                                                noWrap
                                                sx={{ maxWidth: 120, color: DEEP_SCANS_BODY_TEXT }}
                                                title={r.projectId ?? ''}
                                            >
                                                {r.projectId == null || r.projectId === ''
                                                    ? t('deepScans.noProject')
                                                    : `${r.projectId.slice(0, 8)}…`}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>
                                            <span suppressHydrationWarning>{new Date(r.timestamp).toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell sx={DEEP_SCANS_BODY_CELL_SX}>{r.status}</TableCell>
                                        <TableCell align="right" sx={DEEP_SCANS_BODY_CELL_SX}>
                                            {r.status === 'complete' ? r.score : '—'}
                                        </TableCell>
                                        <TableCell align="right" sx={DEEP_SCANS_BODY_CELL_SX}>
                                            {r.totalPages}
                                        </TableCell>
                                        <TableCell align="right" sx={DEEP_SCANS_BODY_ACTIONS_CELL_SX}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexWrap: 'nowrap',
                                                    gap: 0.25,
                                                    justifyContent: 'flex-end',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Tooltip title={t('deepScans.open')}>
                                                    <MsqdxIconButton
                                                        size="small"
                                                        aria-label={t('deepScans.open')}
                                                        onClick={() =>
                                                            router.push(
                                                                pathDomain(
                                                                    r.id,
                                                                    r.projectId ? { projectId: r.projectId } : undefined
                                                                )
                                                            )
                                                        }
                                                        sx={{ color: 'var(--color-text-on-light, #0f172a)' }}
                                                    >
                                                        <Eye size={16} strokeWidth={2} />
                                                    </MsqdxIconButton>
                                                </Tooltip>
                                                {(listScope === 'mine' ||
                                                    (sessionUserId != null && r.userId === sessionUserId)) && (
                                                    <Tooltip title={t('deepScans.editTags')}>
                                                        <MsqdxIconButton
                                                            size="small"
                                                            aria-label={t('deepScans.editTags')}
                                                            onClick={() => void editScanTags(r.id, [...(r.tags ?? [])])}
                                                            sx={{ color: 'var(--color-text-on-light, #0f172a)' }}
                                                        >
                                                            <Tags size={16} strokeWidth={2} />
                                                        </MsqdxIconButton>
                                                    </Tooltip>
                                                )}
                                                {(listScope === 'mine' ||
                                                    (sessionUserId != null && r.userId === sessionUserId)) && (
                                                    <Tooltip title={t('deepScans.delete')}>
                                                        <MsqdxIconButton
                                                            size="small"
                                                            color="error"
                                                            aria-label={t('deepScans.delete')}
                                                            onClick={() => void handleDelete(r.id)}
                                                            sx={DEEP_SCANS_DELETE_ICON_SX}
                                                        >
                                                            <Trash2 size={16} strokeWidth={2} />
                                                        </MsqdxIconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
                {totalPages > 1 && (
                    <Box sx={{ mt: 2 }}>
                        <PaginationBar
                            page={page}
                            totalPages={totalPages}
                            onPrev={() => setPage((p) => Math.max(1, p - 1))}
                            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                            t={t}
                        />
                    </Box>
                )}
            </MsqdxMoleculeCard>
        </Box>
    );
}
