'use client';

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { PdfPrintPreviewScene } from '@/components/pdf/preview/PdfPrintPreviewDocument';
import { PrintPreviewSpreadViewer } from '@/components/pdf/preview/PrintPreviewSpreadViewer';

type PreviewViewMode = 'spread' | 'scroll';

/**
 * Renders the same react-pdf blob as export.
 * Default: Doppelseiten (`twoPageRight`) via pdf.js — browser iframe shows only single pages.
 */
export function PrintPreviewPdfViewer({ scene }: { scene: PdfPrintPreviewScene }) {
    const [blob, setBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<PreviewViewMode>('spread');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;

        void (async () => {
            try {
                const [{ pdf }, { PdfPrintPreviewDocument }] = await Promise.all([
                    import('@react-pdf/renderer'),
                    import('@/components/pdf/preview/PdfPrintPreviewDocument'),
                ]);
                const nextBlob = await pdf(<PdfPrintPreviewDocument scene={scene} />).toBlob();
                if (cancelled) return;
                objectUrl = URL.createObjectURL(nextBlob);
                setBlob(nextBlob);
                setPdfUrl(objectUrl);
                setError(null);
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'PDF preview failed');
                    setBlob(null);
                    setPdfUrl(null);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [scene]);

    if (error) {
        return (
            <Box sx={{ p: 2, color: 'error.main', fontSize: 14 }} role="alert">
                {error}
            </Box>
        );
    }

    if (!blob || !pdfUrl) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 480,
                    width: '100%',
                }}
            >
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <ToggleButtonGroup
                exclusive
                size="small"
                value={viewMode}
                onChange={(_, v) => v && setViewMode(v)}
                sx={{ mb: 2 }}
            >
                <ToggleButton value="spread" sx={{ textTransform: 'none' }}>
                    Doppelseiten
                </ToggleButton>
                <ToggleButton value="scroll" sx={{ textTransform: 'none' }}>
                    PDF-Scroll
                </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'spread' ? (
                <PrintPreviewSpreadViewer blob={blob} />
            ) : (
                <Box
                    sx={{
                        width: '100%',
                        minHeight: { xs: 520, md: 720 },
                        height: { md: 'calc(100vh - 160px)' },
                    }}
                >
                    <Box
                        component="iframe"
                        src={pdfUrl}
                        title="CHECKION PDF scroll preview"
                        sx={{
                            width: '100%',
                            height: '100%',
                            minHeight: 480,
                            border: 'none',
                            borderRadius: 1,
                            bgcolor: '#fff',
                        }}
                    />
                </Box>
            )}
        </Box>
    );
}
