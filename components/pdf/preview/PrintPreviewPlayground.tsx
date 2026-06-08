'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    Box,
    FormControlLabel,
    MenuItem,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import { MsqdxButton, MsqdxTypography } from '@msqdx/react';
import { PrintPreviewFrame } from '@/components/pdf/preview/PrintPreviewFrame';
import {
    PrintPreviewChapterLeftContent,
    PrintPreviewChapterRightContent,
    PrintPreviewContentSample,
    PrintPreviewCoverContent,
} from '@/components/pdf/preview/PrintPreviewSamples';
import { pdfChapterColors, type PdfChapterKey } from '@/components/pdf/shared/pdf-styles';
import {
    PATH_DEV_PDF_PRINT_PREVIEW,
    CHECKION_DEV_SERVER_PORT,
    checkionDevPdfPrintPreviewUrl,
} from '@/lib/paths/pdf-print-preview';
import { getPublicAssetPath } from '@/lib/constants';
import { PDF_BRAND_COLOR, pdfShowsCornerTabForSide } from '@/lib/paths/pdf-print-tokens';

type PreviewScene = 'cover' | 'chapter-spread' | 'content-spread' | 'all-spreads';

const SCENES: { id: PreviewScene; label: string }[] = [
    { id: 'cover', label: 'Deckblatt' },
    { id: 'chapter-spread', label: 'Kapitel-Spread' },
    { id: 'content-spread', label: 'Inhalt-Spread' },
    { id: 'all-spreads', label: 'Alle Spreads' },
];

export function PrintPreviewPlayground() {
    const [scene, setScene] = useState<PreviewScene>('all-spreads');
    const [chapterKey, setChapterKey] = useState<PdfChapterKey>('summary');
    const [brandColor, setBrandColor] = useState(PDF_BRAND_COLOR);
    const [showBinding, setShowBinding] = useState(true);
    const [showCornerTab, setShowCornerTab] = useState(true);
    const previewPath = getPublicAssetPath(PATH_DEV_PDF_PRINT_PREVIEW);
    const previewUrl =
        typeof window !== 'undefined'
            ? `${window.location.origin}${previewPath}`
            : checkionDevPdfPrintPreviewUrl();

    const chapter = pdfChapterColors[chapterKey];

    const coverPage = (
        <PrintPreviewFrame
            side="cover"
            accentColor={brandColor}
            showCornerTab={showCornerTab && pdfShowsCornerTabForSide('cover')}
            showBindingMarker={showBinding}
        >
            <PrintPreviewCoverContent />
        </PrintPreviewFrame>
    );

    const chapterSpread = (
        <Box sx={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            <PrintPreviewFrame
                side="left"
                accentColor={chapter.main}
                innerFill={chapter.bg}
                showCornerTab={showCornerTab && pdfShowsCornerTabForSide('left')}
                showBindingMarker={showBinding}
            >
                <PrintPreviewChapterLeftContent chapterNumber="01" color={chapter.main} />
            </PrintPreviewFrame>
            <PrintPreviewFrame
                side="right"
                accentColor={chapter.main}
                showCornerTab={showCornerTab && pdfShowsCornerTabForSide('right')}
                showBindingMarker={showBinding}
            >
                <PrintPreviewChapterRightContent
                    chapterNumber="01"
                    title="Executive Summary"
                    subtitle="Lagebild, Risiken und strategische Einordnung auf Basis aller Projekt-Daten."
                    color={chapter.main}
                />
            </PrintPreviewFrame>
        </Box>
    );

    const contentSpread = (
        <Box sx={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
            <PrintPreviewFrame
                side="left"
                accentColor={brandColor}
                showCornerTab={showCornerTab && pdfShowsCornerTabForSide('left')}
                showBindingMarker={showBinding}
            >
                <PrintPreviewContentSample />
            </PrintPreviewFrame>
            <PrintPreviewFrame
                side="right"
                accentColor={brandColor}
                showCornerTab={showCornerTab && pdfShowsCornerTabForSide('right')}
                showBindingMarker={showBinding}
            >
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
                    width: { xs: '100%', lg: 320 },
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
                    Live-Vorschau mit denselben Token & SVG-Pfaden wie das PDF.
                    <br />
                    URL:{' '}
                    <Box component="a" href={previewPath} sx={{ fontSize: '0.85em', color: 'inherit' }}>
                        {previewUrl}
                    </Box>
                    <br />
                    <Box component="span" sx={{ fontSize: '0.8em', opacity: 0.85 }}>
                        CHECKION Dev-Server: Port {CHECKION_DEV_SERVER_PORT} (`npm run dev`), nicht 3000.
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

                <TextField
                    select
                    fullWidth
                    size="small"
                    label="Kapitel-Akzent"
                    value={chapterKey}
                    onChange={(e) => setChapterKey(e.target.value as PdfChapterKey)}
                    sx={{ mb: 2 }}
                >
                    {(Object.keys(pdfChapterColors) as PdfChapterKey[]).map((k) => (
                        <MenuItem key={k} value={k}>
                            {k}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    fullWidth
                    size="small"
                    label="Brand-Farbe"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    sx={{ mb: 2 }}
                />

                <FormControlLabel
                    control={<Switch checked={showCornerTab} onChange={(e) => setShowCornerTab(e.target.checked)} />}
                    label="Corner-Tab / Logo (Deckblatt + linke Seite)"
                />
                <FormControlLabel
                    control={<Switch checked={showBinding} onChange={(e) => setShowBinding(e.target.checked)} />}
                    label="Bindungs-Markierung"
                />

                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <MsqdxTypography variant="caption" color="text.secondary">
                        Token-Quellen (gemeinsam mit PDF):
                    </MsqdxTypography>
                    <MsqdxTypography variant="caption" component="div">
                        lib/paths/pdf-print-tokens.ts
                        <br />
                        components/pdf/shared/pdf-frame-path.ts
                        <br />
                        components/pdf/preview/PrintPreviewFrame.tsx
                    </MsqdxTypography>
                    <MsqdxButton
                        variant="outlined"
                        size="small"
                        onClick={() => window.open('/projects', '_blank')}
                        sx={{ mt: 1, alignSelf: 'flex-start' }}
                    >
                        PDF aus gespeichertem Report testen
                    </MsqdxButton>
                </Box>
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
