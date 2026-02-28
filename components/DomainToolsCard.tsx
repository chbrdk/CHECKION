'use client';

import React, { useState } from 'react';
import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip, MsqdxButton } from '@msqdx/react';
import { MSQDX_NEUTRAL, MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import { apiToolsSslLabs, apiToolsPageSpeed, apiToolsWayback } from '@/lib/constants';
import { Shield, Gauge, History, Loader2 } from 'lucide-react';

const tableBorder = `1px solid ${MSQDX_NEUTRAL[200]}`;

type ToolId = 'ssl' | 'pagespeed' | 'wayback';

export function DomainToolsCard({ domainUrl }: { domainUrl: string }) {
    const [loading, setLoading] = useState<ToolId | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<Partial<Record<ToolId, unknown>> | null>(null);

    const runTool = async (id: ToolId) => {
        setLoading(id);
        setError(null);
        try {
            const base = typeof window !== 'undefined' ? window.location.origin : '';
            const url = domainUrl.startsWith('http') ? domainUrl : `https://${domainUrl}`;
            const host = new URL(url).hostname;

            let res: Response;
            if (id === 'ssl') {
                res = await fetch(base + apiToolsSslLabs(host));
            } else if (id === 'pagespeed') {
                res = await fetch(base + apiToolsPageSpeed(url));
            } else if (id === 'wayback') {
                res = await fetch(base + apiToolsWayback(url));
            } else {
                throw new Error('Unknown tool');
            }

            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Request failed');

            setData((prev) => ({ ...prev ?? {}, [id]: json.data ?? json }));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error');
            setData((prev) => ({ ...prev ?? {}, [id]: null }));
        } finally {
            setLoading(null);
        }
    };

    return (
        <MsqdxMoleculeCard
            title="Erweiterte Domain-Analyse"
            subtitle="Externe Tools per Klick laden (SSL Labs, PageSpeed, Wayback)"
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <MsqdxButton
                    size="small"
                    variant="outlined"
                    onClick={() => runTool('ssl')}
                    disabled={loading !== null}
                    startIcon={loading === 'ssl' ? <Loader2 size={14} /> : <Shield size={14} />}
                >
                    SSL Labs
                </MsqdxButton>
                <MsqdxButton
                    size="small"
                    variant="outlined"
                    onClick={() => runTool('pagespeed')}
                    disabled={loading !== null}
                    startIcon={loading === 'pagespeed' ? <Loader2 size={14} /> : <Gauge size={14} />}
                >
                    PageSpeed
                </MsqdxButton>
                <MsqdxButton
                    size="small"
                    variant="outlined"
                    onClick={() => runTool('wayback')}
                    disabled={loading !== null}
                    startIcon={loading === 'wayback' ? <Loader2 size={14} /> : <History size={14} />}
                >
                    Wayback
                </MsqdxButton>
            </Box>

            {error && (
                <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.error.base, display: 'block', mb: 1 }}>
                    {error}
                </MsqdxTypography>
            )}

            {data?.ssl != null && (
                <Box sx={{ p: 1.5, mb: 1, border: tableBorder, borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>SSL Labs</MsqdxTypography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        {(data.ssl as { grade?: string }).grade && (
                            <MsqdxChip label={`Grade: ${(data.ssl as { grade?: string }).grade}`} size="small" />
                        )}
                        {(data.ssl as { status?: string }).status && (
                            <MsqdxChip label={(data.ssl as { status?: string }).status} size="small" variant="outlined" />
                        )}
                    </Box>
                </Box>
            )}

            {data?.pagespeed != null && (
                <Box sx={{ p: 1.5, mb: 1, border: tableBorder, borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>PageSpeed</MsqdxTypography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        <MsqdxChip label={`Performance: ${(data.pagespeed as { performance?: number }).performance ?? '–'}`} size="small" />
                        <MsqdxChip label={`Accessibility: ${(data.pagespeed as { accessibility?: number }).accessibility ?? '–'}`} size="small" />
                        <MsqdxChip label={`SEO: ${(data.pagespeed as { seo?: number }).seo ?? '–'}`} size="small" />
                    </Box>
                </Box>
            )}

            {data?.wayback != null && (
                <Box sx={{ p: 1.5, mb: 1, border: tableBorder, borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Wayback</MsqdxTypography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        {(data.wayback as { available?: boolean }).available && (
                            <MsqdxChip label="Archiviert" size="small" sx={{ bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.12) }} />
                        )}
                        {(data.wayback as { firstSnapshotTimestamp?: string }).firstSnapshotTimestamp && (
                            <MsqdxChip label={`Erste Erwähnung: ${(data.wayback as { firstSnapshotTimestamp?: string }).firstSnapshotTimestamp}`} size="small" variant="outlined" />
                        )}
                    </Box>
                </Box>
            )}

        </MsqdxMoleculeCard>
    );
}
