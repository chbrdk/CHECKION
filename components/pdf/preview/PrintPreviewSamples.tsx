'use client';

import { Box } from '@mui/material';
import { pdfColors, pdfChapterColors } from '@/components/pdf/shared/pdf-styles';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfPtToCssPx } from '@/lib/paths/pdf-print-preview';
import { PDF_RADIUS_BUTTON_PT } from '@/lib/paths/pdf-print-tokens';

function pt(ptValue: number) {
    return pdfPtToCssPx(ptValue);
}

const previewLabels = getProjectReportPdfLabels('de');

export function PrintPreviewCoverContent() {
    const r = pt(PDF_RADIUS_BUTTON_PT / 2);
    return (
        <>
            <Box sx={{ fontSize: pt(9), letterSpacing: '0.14em', textTransform: 'uppercase', color: pdfColors.gray500, mb: 1 }}>
                {pdfCoverEyebrow(previewLabels.reportSubtitle)}
            </Box>
            <Box sx={{ fontSize: pt(36), fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.05, mb: 1.5 }}>
                {previewLabels.reportTitle}
            </Box>
            <Box
                sx={{
                    bgcolor: pdfColors.white,
                    borderRadius: `${r}px`,
                    py: pt(14),
                    px: pt(16),
                    mb: 2,
                    fontWeight: 700,
                    fontSize: pt(11),
                }}
            >
                Beispiel GmbH · example.com
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: pt(10), mb: 2 }}>
                {[
                    { label: 'Domain', value: '72', color: '#B91C1C' },
                    { label: 'SEO', value: '81', color: '#047857' },
                    { label: 'GEO', value: '64', color: '#0891B2' },
                    { label: 'Rank', value: '58', color: '#dc2626' },
                ].map((k) => (
                    <Box
                        key={k.label}
                        sx={{
                            width: '22%',
                            minWidth: pt(90),
                            p: pt(12),
                            borderRadius: `${r}px`,
                            bgcolor: pdfColors.white,
                        }}
                    >
                        <Box sx={{ fontSize: pt(18), fontWeight: 700, color: k.color }}>{k.value}</Box>
                        <Box sx={{ fontSize: pt(8), color: pdfColors.gray500, textTransform: 'uppercase' }}>
                            {k.label}
                        </Box>
                    </Box>
                ))}
            </Box>
            <Box sx={{ fontSize: pt(11), color: pdfColors.gray700, lineHeight: 1.55 }}>
                Executive Summary Vorschau — Typo, Karten und Abstände werden über{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', fontSize: pt(9) }}>
                    PdfProjectReportCoverContent
                </Box>{' '}
                und{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', fontSize: pt(9) }}>
                    pdf-styles.ts
                </Box>{' '}
                mit dem PDF-Export geteilt.
            </Box>
        </>
    );
}

export function PrintPreviewChapterLeftContent({
    chapterNumber,
    color,
}: {
    chapterNumber: string;
    color: string;
}) {
    return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Box
                sx={{
                    fontSize: pt(120),
                    fontWeight: 700,
                    color,
                    opacity: 0.18,
                    letterSpacing: '-0.05em',
                    userSelect: 'none',
                }}
            >
                {chapterNumber}
            </Box>
            <Box
                sx={{
                    position: 'absolute',
                    width: pt(180),
                    height: pt(180),
                    borderRadius: '50%',
                    bgcolor: color,
                    opacity: 0.12,
                }}
            />
        </Box>
    );
}

export function PrintPreviewChapterRightContent({
    chapterNumber,
    title,
    subtitle,
    color,
}: {
    chapterNumber: string;
    title: string;
    subtitle: string;
    color: string;
}) {
    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: pt(12) }}>
            <Box
                sx={{
                    fontSize: pt(9),
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color,
                    mb: pt(12),
                }}
            >
                Kapitel {chapterNumber}
            </Box>
            <Box sx={{ fontSize: pt(30), fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.12, mb: pt(14) }}>
                {title}
            </Box>
            <Box sx={{ fontSize: pt(11), color: pdfColors.gray600, lineHeight: 1.55, maxWidth: pt(380) }}>
                {subtitle}
            </Box>
        </Box>
    );
}

export function PrintPreviewContentSample() {
    const c = pdfChapterColors.summary;
    const r = pt(PDF_RADIUS_BUTTON_PT / 2);
    return (
        <>
            <Box
                sx={{
                    fontSize: pt(13),
                    fontWeight: 700,
                    mb: pt(10),
                    px: pt(12),
                    py: pt(8),
                    borderRadius: `${r}px`,
                    bgcolor: c.bg,
                    color: c.main,
                }}
            >
                Executive Summary
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: pt(12), mb: pt(14) }}>
                {['Domain 72/100', 'WCAG 12 Fehler', 'Keywords 48'].map((t) => (
                    <Box
                        key={t}
                        sx={{
                            width: '47%',
                            p: pt(12),
                            borderRadius: `${r}px`,
                            bgcolor: pdfColors.white,
                            fontWeight: 700,
                            fontSize: pt(16),
                        }}
                    >
                        {t}
                    </Box>
                ))}
            </Box>
            <Box
                sx={{
                    p: pt(16),
                    borderRadius: `${r}px`,
                    bgcolor: pdfColors.white,
                    fontSize: pt(11),
                    lineHeight: 1.55,
                    color: pdfColors.gray700,
                }}
            >
                Lorem ipsum für Fließtext, Listen und Karten. Inhaltsseiten nutzen denselben App-Frame
                (`PdfContentPage`) ohne zusätzliche Header-Leiste — Branding kommt über den Corner-Tab.
            </Box>
        </>
    );
}
