'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { ScanResult } from '@/lib/types';

type SharePayload =
    | { type: 'domain'; data: DomainSummaryResponse }
    | { type: 'single'; data: ScanResult };

export default function ShareLandingPage() {
    const params = useParams();
    const token = params.token as string;
    const [payload, setPayload] = useState<SharePayload | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        fetch(`/api/share/${encodeURIComponent(token)}`)
            .then((res) => {
                if (!res.ok) throw new Error(res.status === 404 ? 'Link ungültig oder abgelaufen' : 'Fehler beim Laden');
                return res.json();
            })
            .then(setPayload)
            .catch((e) => setError(e instanceof Error ? e.message : 'Fehler'));
    }, [token]);

    if (error) {
        return (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
                <MsqdxTypography variant="h6" sx={{ color: MSQDX_STATUS.error.base }}>{error}</MsqdxTypography>
            </Box>
        );
    }
    if (!payload) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    Geteilte Scan-Ergebnisse · CHECKION
                </MsqdxTypography>
            </Box>
            {payload.type === 'domain' ? (
                <ShareDomainContent data={payload.data} />
            ) : (
                <ShareSingleContent data={payload.data} />
            )}
        </Box>
    );
}

function ShareDomainContent({ data }: { data: DomainSummaryResponse }) {
    const pages = data.pages ?? [];
    const agg = data.aggregated;

    return (
        <>
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Deep Scan: {data.domain}</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                    {new Date(data.timestamp).toLocaleDateString()} · {data.totalPages} Seiten
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: `4px solid ${data.score > 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.warning.base}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MsqdxTypography variant="h6">{data.score}</MsqdxTypography>
                        </Box>
                        <MsqdxTypography variant="body2">Domain-Score</MsqdxTypography>
                    </Box>
                    {agg?.issues && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <MsqdxChip label={`${agg.issues.stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }} />
                            <MsqdxChip label={`${agg.issues.stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                            <MsqdxChip label={`${agg.issues.stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                        </Box>
                    )}
                </Box>
            </MsqdxCard>

            {data.systemicIssues && data.systemicIssues.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Systemische Issues</MsqdxTypography>
                    {data.systemicIssues.map((issue, idx) => (
                        <Box key={idx} sx={{ mb: 1 }}>
                            <MsqdxTypography variant="body2">{issue.title} — {issue.count} Seiten</MsqdxTypography>
                        </Box>
                    ))}
                </MsqdxCard>
            )}

            <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Gescannte Seiten ({pages.length})</MsqdxTypography>
                <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 400, overflow: 'auto' }}>
                    {pages.slice(0, 200).map((p) => (
                        <li key={p.id}>
                            <MsqdxTypography variant="body2" component="span" sx={{ wordBreak: 'break-all' }}>{p.url}</MsqdxTypography>
                            <MsqdxTypography variant="caption" component="span" sx={{ ml: 1, color: 'var(--color-text-muted-on-light)' }}>
                                Score {p.score} · {p.stats.errors + p.stats.warnings + p.stats.notices} Issues
                            </MsqdxTypography>
                        </li>
                    ))}
                </Box>
                {pages.length > 200 && (
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        … und {pages.length - 200} weitere Seiten
                    </MsqdxTypography>
                )}
            </MsqdxCard>
        </>
    );
}

function ShareSingleContent({ data }: { data: ScanResult }) {
    const issueCount = (data.issues?.length ?? 0);
    const stats = data.stats ?? { errors: 0, warnings: 0, notices: 0 };

    return (
        <MsqdxCard variant="flat" sx={{ p: 3, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
            <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Seiten-Scan</MsqdxTypography>
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2, wordBreak: 'break-all' }}>
                {data.url}
            </MsqdxTypography>
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 2 }}>
                {new Date(data.timestamp).toISOString().slice(0, 10)} · {data.device}
            </MsqdxTypography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        border: `4px solid ${data.score > 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.warning.base}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <MsqdxTypography variant="h6">{data.score}</MsqdxTypography>
                    </Box>
                    <MsqdxTypography variant="body2">Score</MsqdxTypography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <MsqdxChip label={`${stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }} />
                    <MsqdxChip label={`${stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                    <MsqdxChip label={`${stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                </Box>
                {data.ux?.score != null && (
                    <MsqdxChip label={`UX-Score ${data.ux.score}`} size="small" />
                )}
            </Box>
            {issueCount > 0 && (
                <Box sx={{ mt: 2 }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Issues ({issueCount})</MsqdxTypography>
                    <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 300, overflow: 'auto' }}>
                        {(data.issues ?? []).slice(0, 50).map((issue, idx) => (
                            <li key={idx}>
                                <MsqdxTypography variant="body2">[{issue.type}] {issue.message}</MsqdxTypography>
                            </li>
                        ))}
                    </Box>
                    {issueCount > 50 && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>… und {issueCount - 50} weitere</MsqdxTypography>
                    )}
                </Box>
            )}
        </MsqdxCard>
    );
}

