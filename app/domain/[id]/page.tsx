'use client';

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxCard,
    MsqdxChip,
    MsqdxTabs,
    MsqdxMoleculeCard,
} from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import { useParams, useRouter } from 'next/navigation';
import type { DomainScanResult } from '@/lib/types';
import { DomainGraph } from '@/components/DomainGraph';
import { ArrowLeft, Share2, AlertCircle, CheckCircle } from 'lucide-react';

export default function DomainResultPage() {
    const params = useParams();
    const router = useRouter();
    const [result, setResult] = useState<DomainScanResult | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [summarizing, setSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState<string | null>(null);

    useEffect(() => {
        if (!params.id) return;
        fetch(`/api/scan/domain/${params.id}/status`)
            .then(res => {
                if (!res.ok) throw new Error('Scan not found');
                return res.json();
            })
            .then(data => setResult(data))
            .catch(err => console.error('Failed to load scan', err));
    }, [params.id]);

    if (!result) {
        return (
            <Box sx={{ p: 'var(--msqdx-spacing-md)', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                <MsqdxTypography variant="h5" sx={{ mb: 'var(--msqdx-spacing-md)' }}>Loading...</MsqdxTypography>
                <CircularProgress sx={{ color: 'var(--color-theme-accent)' }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 1600, mx: 'auto' }}>
            <Box sx={{ mb: 'var(--msqdx-spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <MsqdxTypography variant="h4" weight="bold" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>Deep Domain Scan</MsqdxTypography>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {result.domain} • {new Date(result.timestamp).toLocaleDateString()}
                    </MsqdxTypography>
                </Box>
                <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxButton variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => router.push('/')}>
                        Back
                    </MsqdxButton>
                    <MsqdxButton variant="contained" startIcon={<Share2 size={16} />}>
                        Share
                    </MsqdxButton>
                </Box>
            </Box>

            <Box sx={{ borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)', mb: 'var(--msqdx-spacing-lg)' }}>
                <MsqdxTabs
                    value={tabValue}
                    onChange={(v) => setTabValue(v as number)}
                    tabs={[
                        { label: 'Overview & Pages', value: 0 },
                        { label: 'Visual Map', value: 1 },
                        { label: 'UX/CX Check', value: 2 },
                    ]}
                />
            </Box>

            {tabValue === 0 && (
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 'var(--msqdx-spacing-md)' }}>
                    <Box sx={{ flex: '0 0 350px' }}>
                        <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)', mb: 'var(--msqdx-spacing-md)' }}>
                            <MsqdxTypography variant="h6" sx={{ mb: 'var(--msqdx-spacing-md)' }}>Domain Score</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 'var(--msqdx-spacing-md)' }}>
                                <Box sx={{
                                    position: 'relative',
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    border: `8px solid ${result.score > 80 ? 'var(--color-secondary-dx-green)' : 'var(--color-secondary-dx-orange)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MsqdxTypography variant="h2">{result.score}</MsqdxTypography>
                                </Box>
                                <MsqdxTypography variant="body2" sx={{ mt: 'var(--msqdx-spacing-md)', color: 'var(--color-text-muted-on-light)' }}>
                                    {result.totalPages} Pages Scanned
                                </MsqdxTypography>
                            </Box>
                        </MsqdxCard>

                        <Box sx={{ mt: 'var(--msqdx-spacing-xl)' }}>
                            <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                                <MsqdxTypography variant="h6" sx={{ mb: 'var(--msqdx-spacing-md)' }}>Systemic Issues</MsqdxTypography>
                                {(result.systemicIssues?.length ?? 0) === 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                                        <CheckCircle color="var(--color-secondary-dx-green)" />
                                        <MsqdxTypography>No systemic issues detected.</MsqdxTypography>
                                    </Box>
                                ) : (
                                    (result.systemicIssues ?? []).map((issue, idx) => (
                                        <Box key={idx} sx={{
                                            p: 'var(--msqdx-spacing-md)',
                                            mb: 'var(--msqdx-spacing-md)',
                                            border: '1px solid var(--color-secondary-dx-pink-tint)',
                                            borderRadius: 'var(--msqdx-radius-xs)',
                                            backgroundColor: 'var(--color-secondary-dx-pink-tint)'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                                                <AlertCircle color="var(--color-secondary-dx-pink)" size={20} />
                                                <MsqdxTypography variant="subtitle1" sx={{ color: 'var(--color-secondary-dx-pink)' }}>
                                                    {issue.title}
                                                </MsqdxTypography>
                                                <MsqdxChip label={`${issue.count} pages`} size="small" brandColor="pink" />
                                            </Box>
                                            <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-xs)' }}>
                                                Fixing rule ({issue.issueId}) affects {issue.count} pages.
                                            </MsqdxTypography>
                                        </Box>
                                    ))
                                )}
                            </MsqdxCard>
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-md)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                            <MsqdxTypography variant="h6" sx={{ mb: 'var(--msqdx-spacing-md)' }}>Scanned Pages</MsqdxTypography>
                            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
                                {(result.pages ?? []).map((page, idx) => (
                                    <Box
                                        component="li"
                                        key={idx}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: 'var(--color-theme-accent-tint)' },
                                            border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                            borderRadius: 'var(--msqdx-radius-sm)',
                                            mb: 'var(--msqdx-spacing-xs)',
                                            p: 'var(--msqdx-spacing-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 'var(--msqdx-spacing-sm)'
                                        }}
                                        onClick={() => router.push(`/results/${page.id}`)}
                                    >
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600 }}>{page.url}</MsqdxTypography>
                                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                                {page.ux?.score ?? 0} UX Score • {page.issues.length} Issues
                                            </MsqdxTypography>
                                        </Box>
                                        <MsqdxChip
                                            label={page.score.toString()}
                                            size="small"
                                            brandColor={page.score > 80 ? 'green' : 'orange'}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </MsqdxCard>
                    </Box>
                </Box>
            )}

            {tabValue === 1 && (
                <Box>
                    <DomainGraph data={result.graph} width={1200} height={800} />
                </Box>
            )}

            {tabValue === 2 && (
                <MsqdxMoleculeCard
                    title="UX/CX Check (Domain)"
                    subtitle="Bewertung und Handlungsempfehlungen für die gesamte Domain"
                    variant="flat"
                    sx={{ bgcolor: 'var(--color-card-bg)', color: 'var(--color-text-on-light)' }}
                    borderRadius="lg"
                >
                    {result.llmSummary ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 'var(--msqdx-spacing-md)' }}>
                            {result.llmSummary.overallGrade && (
                                <MsqdxChip
                                    label={result.llmSummary.overallGrade}
                                    size="small"
                                    sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                                />
                            )}
                            <MsqdxTypography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                                {result.llmSummary.summary}
                            </MsqdxTypography>
                            {result.llmSummary.themes?.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Themen</MsqdxTypography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {result.llmSummary.themes.map((t, i) => (
                                            <MsqdxChip
                                                key={i}
                                                label={t.description ? `${t.name}: ${t.description}` : t.name}
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    bgcolor: t.severity === 'high' ? alpha(MSQDX_STATUS.error.base, 0.08) : t.severity === 'medium' ? alpha(MSQDX_STATUS.warning.base, 0.08) : undefined,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            )}
                            {result.llmSummary.recommendations?.length > 0 && (
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Handlungsempfehlungen</MsqdxTypography>
                                    <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {[...result.llmSummary.recommendations]
                                            .sort((a, b) => a.priority - b.priority)
                                            .map((r, i) => (
                                                <Box component="li" key={i} sx={{ mb: 0.5 }}>
                                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>{r.title}</MsqdxTypography>
                                                    {r.category && (
                                                        <MsqdxChip label={r.category} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                                    )}
                                                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mt: 0.25 }}>{r.description}</MsqdxTypography>
                                                </Box>
                                            ))}
                                    </Box>
                                </Box>
                            )}
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Generiert mit {result.llmSummary.modelUsed} am {new Date(result.llmSummary.generatedAt).toLocaleString('de-DE')}.
                            </MsqdxTypography>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', textAlign: 'center' }}>
                                Hier erscheint eine Gesamtbewertung der Domain und konkrete Handlungsempfehlungen auf Basis aller gescannten Seiten und systemischen Issues.
                            </MsqdxTypography>
                            {summarizeError && (
                                <MsqdxTypography variant="body2" sx={{ color: MSQDX_STATUS.error.base }}>{summarizeError}</MsqdxTypography>
                            )}
                            <MsqdxButton
                                variant="contained"
                                brandColor="green"
                                disabled={summarizing || result.status !== 'complete'}
                                onClick={async () => {
                                    if (!result?.id || summarizing) return;
                                    setSummarizeError(null);
                                    setSummarizing(true);
                                    try {
                                        const res = await fetch(`/api/scan/domain/${result.id}/summarize`, { method: 'POST' });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) throw new Error(data.error ?? 'Fehler beim Generieren');
                                        setResult((prev) => (prev ? { ...prev, llmSummary: data } : null));
                                    } catch (e) {
                                        setSummarizeError(e instanceof Error ? e.message : 'Unbekannter Fehler');
                                    } finally {
                                        setSummarizing(false);
                                    }
                                }}
                            >
                                {summarizing ? 'Wird generiert…' : 'Zusammenfassung generieren'}
                            </MsqdxButton>
                        </Box>
                    )}
                </MsqdxMoleculeCard>
            )}
        </Box>
    );
}
