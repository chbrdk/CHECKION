'use client';

import React from 'react';
import { Box } from '@mui/material';
import { MsqdxCard, MsqdxChip, MsqdxTypography } from '@msqdx/react';
import { Code, Terminal, Database } from 'lucide-react';

export default function DevelopersPage() {
    return (
        <Box sx={{ p: 'var(--msqdx-spacing-xl)', maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 'var(--msqdx-spacing-xxl)' }}>
                <MsqdxTypography variant="h3" weight="bold" sx={{ mb: 'var(--msqdx-spacing-md)' }}>
                    Developer API
                </MsqdxTypography>
                <MsqdxTypography variant="body1" sx={{ maxWidth: 800, color: 'var(--color-text-muted-on-light)' }}>
                    Checkion isn't just a UI tool – it's a headless accessibility engine.
                    Use our REST API to integrate accessibility checks into your CI/CD pipelines,
                    build custom dashboards, or use our micro-tools programmatically.
                </MsqdxTypography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 'var(--msqdx-spacing-xl)' }}>
                <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-lg)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', mb: 'var(--msqdx-spacing-lg)' }}>
                        <Terminal color="var(--color-secondary-dx-blue)" />
                        <MsqdxTypography variant="h6">Micro-Tools</MsqdxTypography>
                    </Box>

                    <Endpoint method="GET" path="/api/tools/contrast" desc="Calculate WCAG contrast ratio between two colors." params="?f=000000&b=ffffff" />
                    <Endpoint method="POST" path="/api/tools/readability" desc="Analyze text complexity (Flesch-Kincaid)." body='{ "text": "..." }' />
                    <Endpoint method="GET" path="/api/tools/extract" desc="Headless scraper to extract content via selector." params="?url=...&selector=h1" />
                </MsqdxCard>

                <MsqdxCard variant="flat" sx={{ bgcolor: 'var(--color-card-bg)', p: 'var(--msqdx-spacing-lg)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-md)', mb: 'var(--msqdx-spacing-lg)' }}>
                        <Database color="var(--color-secondary-dx-green)" />
                        <MsqdxTypography variant="h6">Scan Data</MsqdxTypography>
                    </Box>

                    <Endpoint method="GET" path="/api/scans" desc="Retrieve a history of recent single-page scans." />
                    <Endpoint method="POST" path="/api/scan" desc="Trigger a single page scan." body='{ "url": "..." }' />
                    <Endpoint method="GET" path="/api/scans/domain" desc="Retrieve a history of deep domain scans." />
                    <Endpoint method="POST" path="/api/scan/domain" desc="Trigger a deep domain scan (Async)." body='{ "url": "..." }' />
                    <Endpoint method="DELETE" path="/api/scans/:id" desc="Delete a scan result from memory." />
                </MsqdxCard>
            </Box>

            <Box sx={{ mt: 'var(--msqdx-spacing-xxl)', p: 'var(--msqdx-spacing-lg)', bgcolor: 'var(--color-card-bg)', borderRadius: 'var(--msqdx-radius-sm)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                <MsqdxTypography variant="h6" sx={{ mb: 'var(--msqdx-spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                    <Code size={20} /> Example Usage (curl)
                </MsqdxTypography>
                <Box component="pre" sx={{ p: 'var(--msqdx-spacing-md)', bgcolor: 'var(--color-text-primary)', color: 'var(--color-primary-white)', fontFamily: 'monospace', fontSize: 'var(--msqdx-font-size-sm)', overflowX: 'auto', borderRadius: 'var(--msqdx-radius-xs)' }}>
                    {`# Calculate Contrast\ncurl "http://localhost:3333/api/tools/contrast?f=000000&b=ffffff"\n\n# Extract H1 from a website\ncurl "http://localhost:3333/api/tools/extract?url=https://example.com&selector=h1"`}
                </Box>
            </Box>
        </Box>
    );
}

function Endpoint({ method, path, desc, params, body }: { method: string; path: string; desc: string; params?: string; body?: string }) {
    const chipColor: 'purple' | 'green' | 'pink' = method === 'GET' ? 'purple' : method === 'POST' ? 'green' : 'pink';
    return (
        <Box sx={{ mb: 'var(--msqdx-spacing-lg)', pb: 'var(--msqdx-spacing-md)', borderBottom: '1px solid var(--color-secondary-dx-grey-light-tint)', '&:last-child': { borderBottom: 'none' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)' }}>
                <MsqdxChip label={method} size="small" brandColor={chipColor} sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
                <MsqdxTypography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>{path}</MsqdxTypography>
            </Box>
            <MsqdxTypography variant="body2" sx={{ mb: 'var(--msqdx-spacing-xs)', color: 'var(--color-text-muted-on-light)' }}>{desc}</MsqdxTypography>
            {params && <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>Params: {params}</MsqdxTypography>}
            {body && <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>Body: {body}</MsqdxTypography>}
        </Box>
    );
}
