'use client';

import { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { MsqdxButton, MsqdxTypography } from '@msqdx/react';
import type { PdfPrintPreviewScene } from '@/components/pdf/preview/PdfPrintPreviewDocument';
import { PrintPreviewPdfViewer } from '@/components/pdf/preview/PrintPreviewPdfViewer';
import {
    PATH_DEV_PDF_PRINT_PREVIEW,
    CHECKION_DEV_SERVER_PORT,
    checkionDevPdfPrintPreviewUrl,
} from '@/lib/paths/pdf-print-preview';
import { getPublicAssetPath } from '@/lib/constants';

const SCENES: { id: PdfPrintPreviewScene; label: string }[] = [
    { id: 'all-spreads', label: 'Vollständig (Comprehensive)' },
    { id: 'cover', label: 'Deckblatt' },
    { id: 'content-spread', label: 'Executive Summary' },
];

export function PrintPreviewPlayground() {
    const [scene, setScene] = useState<PdfPrintPreviewScene>('all-spreads');
    const previewPath = getPublicAssetPath(PATH_DEV_PDF_PRINT_PREVIEW);
    const previewUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}${previewPath}`
            : checkionDevPdfPrintPreviewUrl();

    return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3, p: { xs: 2, md: 3 } }}>
            <Box
                sx={{
                    width: { xs: '100%', lg: 300 },
                    flexShrink: 0,
                    position: { lg: 'sticky' },
                    top: 16,
                    alignSelf: 'flex-start',
                }}
            >
                <MsqdxTypography variant="h5" sx={{ mb: 0.5 }}>
                    PDF Print Preview
                </MsqdxTypography>
                <MsqdxTypography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Comprehensive-Report — Doppelseiten-Ansicht (`twoPageRight`) via pdf.js.
                    <br />
                    <Box component="a" href={previewPath} sx={{ fontSize: '0.85em', color: 'inherit' }}>
                        {previewUrl}
                    </Box>
                    <br />
                    <Box component="span" sx={{ fontSize: '0.8em', opacity: 0.85 }}>
                        Port {CHECKION_DEV_SERVER_PORT} (`npm run dev`)
                    </Box>
                </MsqdxTypography>

                <ToggleButtonGroup
                    exclusive
                    value={scene}
                    onChange={(_, v) => v && setScene(v)}
                    size="small"
                    sx={{ flexWrap: 'wrap', mb: 2 }}
                >
                    {SCENES.map((s) => (
                        <ToggleButton key={s.id} value={s.id} sx={{ textTransform: 'none' }}>
                            {s.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                <MsqdxTypography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}>
                    lib/paths/pdf-print-preview-bundle.ts
                    <br />
                    components/pdf/ProjectReportDocument.tsx
                </MsqdxTypography>

                <MsqdxButton
                    variant="outlined"
                    size="small"
                    onClick={() => window.open('/projects', '_blank')}
                >
                    PDF aus gespeichertem Report testen
                </MsqdxButton>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    bgcolor: 'rgba(15, 23, 42, 0.06)',
                    borderRadius: 2,
                    p: { xs: 1, md: 2 },
                }}
            >
                <PrintPreviewPdfViewer key={scene} scene={scene} />
            </Box>
        </Box>
    );
}
