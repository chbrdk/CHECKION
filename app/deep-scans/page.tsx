'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Checkbox,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { MsqdxButton, MsqdxFormField, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { PaginationBar } from '@/components/PaginationBar';
import {
    DASHBOARD_SCANS_PAGE_SIZE,
    apiScansDomainDelete,
    apiScansDomainList,
    pathDeepScansCompare,
    pathDomain,
} from '@/lib/constants';
import type { DomainScanStatus } from '@/lib/types';

type Row = { id: string; domain: string; timestamp: string; status: string; score: number; totalPages: number };

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
    const [selected, setSelected] = useState<string[]>([]);

    const limit = DASHBOARD_SCANS_PAGE_SIZE;

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                apiScansDomainList({
                    page,
                    limit,
                    ...(qApplied.trim() ? { q: qApplied.trim() } : {}),
                    ...(statusFilter ? { status: statusFilter } : {}),
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
    }, [page, limit, qApplied, statusFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    const applyFilters = () => {
        setPage(1);
        setQApplied(qInput);
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
            </MsqdxMoleculeCard>

            <MsqdxMoleculeCard title="" variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)' }}>
                {loading && rows.length === 0 ? (
                    <MsqdxTypography variant="body2">{t('common.loading')}</MsqdxTypography>
                ) : rows.length === 0 ? (
                    <MsqdxTypography variant="body2">{t('deepScans.empty')}</MsqdxTypography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell padding="checkbox">{t('deepScans.colSelect')}</TableCell>
                                <TableCell>{t('deepScans.colDomain')}</TableCell>
                                <TableCell>{t('deepScans.colDate')}</TableCell>
                                <TableCell>{t('deepScans.colStatus')}</TableCell>
                                <TableCell align="right">{t('deepScans.colScore')}</TableCell>
                                <TableCell align="right">{t('deepScans.colPages')}</TableCell>
                                <TableCell align="right">{t('deepScans.colActions')}</TableCell>
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
                                    <TableCell>
                                        <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>
                                            {r.domain}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <span suppressHydrationWarning>{new Date(r.timestamp).toLocaleString()}</span>
                                    </TableCell>
                                    <TableCell>{r.status}</TableCell>
                                    <TableCell align="right">{r.status === 'complete' ? r.score : '—'}</TableCell>
                                    <TableCell align="right">{r.totalPages}</TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            <MsqdxButton
                                                variant="text"
                                                size="small"
                                                onClick={() => router.push(pathDomain(r.id))}
                                            >
                                                {t('deepScans.open')}
                                            </MsqdxButton>
                                            <MsqdxButton variant="text" size="small" onClick={() => void handleDelete(r.id)}>
                                                {t('deepScans.delete')}
                                            </MsqdxButton>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
