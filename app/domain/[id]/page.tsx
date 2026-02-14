'use client';

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxButton,
    MsqdxCard,
    MsqdxChip,
    MsqdxTabs,
} from '@msqdx/react';
import { useParams, useRouter } from 'next/navigation';
import type { DomainScanResult } from '@/lib/types';
import { DomainGraph } from '@/components/DomainGraph';
import { ArrowLeft, Share2, AlertCircle, CheckCircle } from 'lucide-react';

export default function DomainResultPage() {
    const params = useParams();
    const router = useRouter();
    const [result, setResult] = useState<DomainScanResult | null>(null);
    const [tabValue, setTabValue] = useState(0);

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
                                {result.systemicIssues.length === 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)' }}>
                                        <CheckCircle color="var(--color-secondary-dx-green)" />
                                        <MsqdxTypography>No systemic issues detected.</MsqdxTypography>
                                    </Box>
                                ) : (
                                    result.systemicIssues.map((issue, idx) => (
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
                                {result.pages.map((page, idx) => (
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
        </Box>
    );
}
