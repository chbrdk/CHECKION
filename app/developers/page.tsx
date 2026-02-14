'use client';

import React from 'react';
import { Box, Typography, Paper, Divider, Chip } from '@mui/material';
import { Code, Terminal, Palette, FileText, Database } from 'lucide-react';

export default function DevelopersPage() {
    return (
        <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ mb: 6 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
                    Developer API
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ maxWidth: 800 }}>
                    Checkion isn't just a UI tool – it's a headless accessibility engine.
                    Use our REST API to integrate accessibility checks into your CI/CD pipelines,
                    build custom dashboards, or use our micro-tools programmatically.
                </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                {/* Tools */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Terminal color="#2196f3" />
                        <Typography variant="h6">Micro-Tools</Typography>
                    </Box>

                    <Endpoint
                        method="GET"
                        path="/api/tools/contrast"
                        desc="Calculate WCAG contrast ratio between two colors."
                        params="?f=000000&b=ffffff"
                    />
                    <Endpoint
                        method="POST"
                        path="/api/tools/readability"
                        desc="Analyze text complexity (Flesch-Kincaid)."
                        body='{ "text": "..." }'
                    />
                    <Endpoint
                        method="GET"
                        path="/api/tools/extract"
                        desc="Headless scraper to extract content via selector."
                        params="?url=...&selector=h1"
                    />
                </Paper>

                {/* Scan Management */}
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Database color="#4caf50" />
                        <Typography variant="h6">Scan Data</Typography>
                    </Box>

                    <Endpoint
                        method="GET"
                        path="/api/scans"
                        desc="Retrieve a history of recent single-page scans."
                    />
                    <Endpoint
                        method="POST"
                        path="/api/scan"
                        desc="Trigger a single page scan."
                        body='{ "url": "..." }'
                    />
                    <Endpoint
                        method="GET"
                        path="/api/scans/domain"
                        desc="Retrieve a history of deep domain scans."
                    />
                    <Endpoint
                        method="POST"
                        path="/api/scan/domain"
                        desc="Trigger a deep domain scan (Async)."
                        body='{ "url": "..." }'
                    />
                    <Endpoint
                        method="DELETE"
                        path="/api/scans/:id"
                        desc="Delete a scan result from memory."
                    />
                </Paper>
            </Box>

            <Box sx={{ mt: 6, p: 3, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Code size={20} /> Example Usage (curl)
                </Typography>
                <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#fff', fontFamily: 'monospace', overflowX: 'auto' }}>

                    # Calculate Contrast
                    <br />
                    curl "http://localhost:3333/api/tools/contrast?f=000000&b=ffffff"
                    <br /><br />
                    # Extract H1 from a website
                    <br />
                    curl "http://localhost:3333/api/tools/extract?url=https://example.com&selector=h1"

                </Paper>
            </Box>
        </Box>
    );
}

function Endpoint({ method, path, desc, params, body }: any) {
    return (
        <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid #eee', '&:last-child': { borderBottom: 'none' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                    label={method}
                    size="small"
                    color={method === 'GET' ? 'primary' : method === 'POST' ? 'success' : 'error'}
                    sx={{ fontWeight: 'bold', height: 20, fontSize: '0.7rem' }}
                />
                <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>{path}</Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>{desc}</Typography>
            {params && (
                <Typography variant="caption" sx={{ display: 'block', color: '#666', fontFamily: 'monospace' }}>
                    Params: {params}
                </Typography>
            )}
            {body && (
                <Typography variant="caption" sx={{ display: 'block', color: '#666', fontFamily: 'monospace' }}>
                    Body: {body}
                </Typography>
            )}
        </Box>
    );
}
