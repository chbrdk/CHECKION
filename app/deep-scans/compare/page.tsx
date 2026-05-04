'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { MsqdxButton, MsqdxMoleculeCard, MsqdxTypography } from '@msqdx/react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { API_SCANS_DOMAIN_COMPARE, PATH_DEEP_SCANS, pathDomain } from '@/lib/constants';
import type { DomainScanCompareDto } from '@/lib/domain-compare-dto';

const COMPARE_HEAD_CELL_SX = {
    color: 'var(--color-text-on-light, #0f172a)',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    bgcolor: 'rgba(15, 23, 42, 0.06)',
    borderBottomColor: 'var(--color-secondary-dx-grey-light-tint)',
};

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseTwoIds(raw: string): [string, string] | null {
    const parts = raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => UUID_RE.test(s));
    if (parts.length !== 2) return null;
    return [parts[0], parts[1]];
}

function CompareInner() {
    const { t } = useI18n();
    const router = useRouter();
    const searchParams = useSearchParams();
    const idsParam = searchParams.get('ids') ?? '';
    const parsed = parseTwoIds(idsParam);

    const [data, setData] = useState<{ scans: DomainScanCompareDto[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!parsed) {
            setData(null);
            setError(null);
            return;
        }
        const [a, b] = parsed;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(API_SCANS_DOMAIN_COMPARE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ ids: [a, b] }),
        })
            .then(async (res) => {
                const j = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(j?.error ?? res.statusText);
                }
                if (!cancelled && j?.success && j?.data?.scans?.length === 2) {
                    setData({ scans: j.data.scans });
                } else if (!cancelled) {
                    throw new Error('Invalid response');
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    setData(null);
                    setError(e instanceof Error ? e.message : 'Error');
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [idsParam]);

    if (!parsed) {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                <MsqdxTypography variant="body1" sx={{ mb: 2 }}>
                    {t('deepScans.compareInvalid')}
                </MsqdxTypography>
                <MsqdxButton variant="outlined" onClick={() => router.push(PATH_DEEP_SCANS)}>
                    {t('deepScans.backToList')}
                </MsqdxButton>
            </Box>
        );
    }

    const [left, right] = data?.scans ?? [null, null];

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <MsqdxTypography variant="h3" weight="bold" sx={{ mb: 1 }}>
                {t('deepScans.compareTitle')}
            </MsqdxTypography>
            <MsqdxTypography variant="body2" sx={{ mb: 2, color: 'var(--color-text-secondary)' }}>
                {t('deepScans.compareSubtitle')}
            </MsqdxTypography>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <MsqdxButton variant="outlined" onClick={() => router.push(PATH_DEEP_SCANS)}>
                    {t('deepScans.backToList')}
                </MsqdxButton>
                {left && (
                    <MsqdxButton variant="text" onClick={() => router.push(pathDomain(left.id))}>
                        {t('deepScans.open')} A
                    </MsqdxButton>
                )}
                {right && (
                    <MsqdxButton variant="text" onClick={() => router.push(pathDomain(right.id))}>
                        {t('deepScans.open')} B
                    </MsqdxButton>
                )}
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}
            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            {left && right && !loading && !error && (
                <MsqdxMoleculeCard title="" variant="flat" borderRadius="lg" footerDivider={false} sx={{ bgcolor: 'var(--color-card-bg)' }}>
                    <TableContainer sx={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <Table size="small" sx={{ minWidth: 520, color: 'var(--color-text-on-light, #0f172a)' }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={COMPARE_HEAD_CELL_SX}>{t('deepScans.metricDomain')}</TableCell>
                                    <TableCell sx={COMPARE_HEAD_CELL_SX}>{left.domain}</TableCell>
                                    <TableCell sx={COMPARE_HEAD_CELL_SX}>{right.domain}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                            <TableRow>
                                <TableCell>{t('deepScans.metricDate')}</TableCell>
                                <TableCell>
                                    <span suppressHydrationWarning>{new Date(left.timestamp).toLocaleString()}</span>
                                </TableCell>
                                <TableCell>
                                    <span suppressHydrationWarning>{new Date(right.timestamp).toLocaleString()}</span>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricStatus')}</TableCell>
                                <TableCell>{left.status}</TableCell>
                                <TableCell>{right.status}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricScore')}</TableCell>
                                <TableCell>{left.score}</TableCell>
                                <TableCell>{right.score}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricPages')}</TableCell>
                                <TableCell>{left.totalPages}</TableCell>
                                <TableCell>{right.totalPages}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricErrors')}</TableCell>
                                <TableCell>{left.issueStats?.errors ?? '—'}</TableCell>
                                <TableCell>{right.issueStats?.errors ?? '—'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricWarnings')}</TableCell>
                                <TableCell>{left.issueStats?.warnings ?? '—'}</TableCell>
                                <TableCell>{right.issueStats?.warnings ?? '—'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricNotices')}</TableCell>
                                <TableCell>{left.issueStats?.notices ?? '—'}</TableCell>
                                <TableCell>{right.issueStats?.notices ?? '—'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricIssuesTotal')}</TableCell>
                                <TableCell>{left.issueStats?.total ?? '—'}</TableCell>
                                <TableCell>{right.issueStats?.total ?? '—'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>{t('deepScans.metricUxScore')}</TableCell>
                                <TableCell>{left.uxScore ?? '—'}</TableCell>
                                <TableCell>{right.uxScore ?? '—'}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell colSpan={3} sx={{ fontWeight: 600, color: 'var(--color-text-on-light, #0f172a)' }}>
                                    {t('deepScans.metricTopThemes')}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell />
                                <TableCell sx={{ verticalAlign: 'top' }}>
                                    {left.topThemes.length === 0
                                        ? '—'
                                        : left.topThemes.map((th) => (
                                              <Typography key={`${th.tag}-${th.score}-${th.pageCount}`} variant="body2" display="block">
                                                  {th.tag} ({t('deepScans.themeScore')}: {th.score},{' '}
                                                  {t('deepScans.themePages')}: {th.pageCount})
                                              </Typography>
                                          ))}
                                </TableCell>
                                <TableCell sx={{ verticalAlign: 'top' }}>
                                    {right.topThemes.length === 0
                                        ? '—'
                                        : right.topThemes.map((th) => (
                                              <Typography key={`${th.tag}-${th.score}-${th.pageCount}`} variant="body2" display="block">
                                                  {th.tag} ({t('deepScans.themeScore')}: {th.score},{' '}
                                                  {t('deepScans.themePages')}: {th.pageCount})
                                              </Typography>
                                          ))}
                                </TableCell>
                            </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                </MsqdxMoleculeCard>
            )}
        </Box>
    );
}

export default function DeepScansComparePage() {
    return (
        <Suspense fallback={<LinearProgress />}>
            <CompareInner />
        </Suspense>
    );
}
