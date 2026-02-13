'use client';

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    Paper,
    Grid2 as Grid
} from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import type { DomainScanResult } from '@/lib/types';
import { ArrowLeft, Share2, AlertCircle, CheckCircle } from 'lucide-react';

export default function DomainResultPage() {
    const params = useParams();
    const router = useRouter();
    const [result, setResult] = useState<DomainScanResult | null>(null);

    useEffect(() => {
        if (!params.id) return;

        // Fetch from API
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
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ mb: 2 }}>Loading...</Typography>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4, maxWidth: 1600, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>Deep Domain Scan</Typography>
                    <Typography variant="body2" color="textSecondary">
                        {result.domain} • {new Date(result.timestamp).toLocaleDateString()}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={() => router.push('/')}>
                        Back
                    </Button>
                    <Button variant="contained" startIcon={<Share2 size={16} />}>
                        Share
                    </Button>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                {/* Score */}
                <Box sx={{ flex: '0 0 350px' }}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Domain Score</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                                <Box sx={{
                                    position: 'relative',
                                    width: 120,
                                    height: 120,
                                    borderRadius: '50%',
                                    border: `8px solid ${result.score > 80 ? '#4caf50' : '#ff9800'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Typography variant="h2">{result.score}</Typography>
                                </Box>
                                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                                    {result.totalPages} Pages Scanned
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>

                    <Box sx={{ mt: 4 }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" sx={{ mb: 2 }}>Systemic Issues</Typography>
                                {result.systemicIssues.length === 0 ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <CheckCircle color="#4caf50" />
                                        <Typography>No systemic issues detected.</Typography>
                                    </Box>
                                ) : (
                                    result.systemicIssues.map((issue, idx) => (
                                        <Box key={idx} sx={{
                                            p: 2,
                                            mb: 2,
                                            border: '1px solid #ffcdd2',
                                            borderRadius: 1,
                                            backgroundColor: '#ffebee'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <AlertCircle color="#d32f2f" size={20} />
                                                <Typography variant="subtitle1" color="error">
                                                    {issue.title}
                                                </Typography>
                                                <Chip label={`${issue.count} pages`} size="small" color="error" variant="outlined" />
                                            </Box>
                                            <Typography variant="body2" sx={{ mb: 1 }}>
                                                Fixing rule ({issue.issueId}) affects {issue.count} pages.
                                            </Typography>
                                        </Box>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* Pages List */}
                <Box sx={{ flex: 1 }}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" sx={{ mb: 2 }}>Scanned Pages</Typography>
                            <List>
                                {result.pages.map((page, idx) => (
                                    <React.Fragment key={idx}>
                                        <ListItem
                                            component="div"
                                            sx={{
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'action.hover' },
                                                border: '1px solid #eee',
                                                borderRadius: 2,
                                                mb: 1
                                            }}
                                            onClick={() => router.push(`/results/${page.id}`)}
                                        >
                                            <ListItemText
                                                primary={page.url}
                                                secondary={`${page.ux?.score || 0} UX Score • ${page.issues.length} Issues`}
                                            />
                                            <Chip
                                                label={page.score.toString()}
                                                color={page.score > 80 ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        </ListItem>
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
}
