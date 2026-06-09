'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { MsqdxButton, MsqdxTypography } from '@msqdx/react';
import { PrintPreviewFrame } from '@/components/pdf/preview/PrintPreviewFrame';
import {
    PrintPreviewChapterLeftContent,
    PrintPreviewChapterRightContent,
    PrintPreviewContentSample,
    PrintPreviewCoverContent,
} from '@/components/pdf/preview/PrintPreviewSamples';
import {
    PATH_DEV_PDF_PRINT_PREVIEW,
    CHECKION_DEV_SERVER_PORT,
    checkionDevPdfPrintPreviewUrl,
} from '@/lib/paths/pdf-print-preview';
import { getPublicAssetPath } from '@/lib/constants';

type PreviewScene = 'cover' | 'chapter-spread' | 'content-spread' | 'all-spreads';

const SCENES: { id: PreviewScene; label: string }[] = [
    { id: 'cover', label: 'Deckblatt' },
    { id: 'chapter-spread', label: 'Kapitel-Spread' },
    { id: 'content-spread', label: 'Inhalt-Spread' },
    { id: 'all-spreads', label: 'Alle Spreads' },
];

export function PrintPreviewPlayground() {
    const [scene, setScene] = useState<PreviewScene>('all-spreads');
    const previewPath = getPublicAssetPath(PATH_DEV_PDF_PRINT_PREVIEW);
    const previewUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}${previewPath}`
            : checkionDevPdfPrintPreviewUrl();

    const coverPage = (
        <PrintPreviewFrame side="cover">
            <PrintPreviewCoverContent />
        </PrintPreviewFrame>
    );

    const chapterSpread = (
        <Box sx={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            <PrintPreviewFrame side="left">
                <PrintPreviewChapterLeftContent chapterNumber="01" />
            </PrintPreviewFrame>
            <PrintPreviewFrame side="right">
                <PrintPreviewChapterRightContent
                    chapterNumber="01"
                    title="Executive Summary"
                    subtitle="Lagebild, Risiken und strategische Einordnung auf Basis aller Projekt-Daten."
                />
            </PrintPreviewFrame>
        </Box>
    );

    const contentSpread = (
        <Box sx={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            <PrintPreviewFrame side="left">
                <PrintPreviewContentSample />
            </PrintPreviewFrame>
            <PrintPreviewFrame side="right">
                <PrintPreviewContentSample />
            </PrintPreviewFrame>
        </Box>
    );

    let preview: ReactNode;
    switch (scene) {
        case 'cover':
            preview = coverPage;
            break;
        case 'chapter-spread':
            preview = chapterSpread;
            break;
        case 'content-spread':
            preview = contentSpread;
            break;
        default:
            preview = (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                    {coverPage}
                    {chapterSpread}
                    {contentSpread}
                </Box>
            );
    }

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
                    Minimal-Layout (weiß, kleines Logo nur Deckblatt).
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
                    lib/paths/pdf-print-tokens.ts
                    <br />
                    components/pdf/shared/PdfPrintPages.tsx
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
                    overflow: 'auto',
                    bgcolor: 'rgba(15, 23, 42, 0.06)',
                    borderRadius: 2,
                    p: 3,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-start',
                }}
            >
                {preview}
            </Box>
        </Box>
    );
}
