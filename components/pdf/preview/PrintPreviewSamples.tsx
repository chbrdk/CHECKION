'use client';

import { Box } from '@mui/material';
import { pdfColors } from '@/components/pdf/shared/pdf-styles';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import { getProjectReportPdfLabels } from '@/lib/project-report/pdf-labels';
import { pdfPtToCssPx } from '@/lib/paths/pdf-print-preview';
import { PDF_PREVIEW_FONT_WEIGHT, PDF_TYPE_LINE_HEIGHT } from '@/lib/paths/pdf-typography';

function pt(ptValue: number) {
    return pdfPtToCssPx(ptValue);
}

const previewLabels = getProjectReportPdfLabels('de');

export function PrintPreviewCoverContent() {
    return (
        <>
            <Box
                sx={{
                    fontSize: pt(8),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.light,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: pdfColors.gray400,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
                    mb: 1,
                }}
            >
                {pdfCoverEyebrow(previewLabels.reportSubtitle)}
            </Box>
            <Box
                sx={{
                    fontSize: pt(34),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.bold,
                    letterSpacing: '-0.04em',
                    lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
                    mb: 1,
                }}
            >
                {previewLabels.reportTitle}
            </Box>
            <Box
                sx={{
                    fontSize: pt(11),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.regular,
                    color: pdfColors.gray700,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
                    mb: 2,
                }}
            >
                Beispiel GmbH · example.com
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: pt(16), mb: 2 }}>
                {['Domain 72', 'SEO 81', 'GEO 64', 'Rank 58'].map((t) => (
                    <Box key={t} sx={{ width: '22%', minWidth: pt(80), fontSize: pt(10) }}>
                        <Box
                            sx={{
                                fontWeight: PDF_PREVIEW_FONT_WEIGHT.bold,
                                fontSize: pt(17),
                                lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
                            }}
                        >
                            {t.split(' ')[1]}
                        </Box>
                        <Box
                            sx={{
                                fontWeight: PDF_PREVIEW_FONT_WEIGHT.light,
                                color: pdfColors.gray400,
                                fontSize: pt(7),
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
                            }}
                        >
                            {t.split(' ')[0]}
                        </Box>
                    </Box>
                ))}
            </Box>
            <Box
                sx={{
                    fontSize: pt(10),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.regular,
                    color: pdfColors.gray700,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
                }}
            >
                Kurzer Lead-Text — ohne Karten, Rahmen oder Brand-Flächen.
            </Box>
        </>
    );
}

export function PrintPreviewChapterLeftContent({ chapterNumber }: { chapterNumber: string }) {
    return (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box
                sx={{
                    fontSize: pt(96),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.light,
                    color: pdfColors.gray200,
                    letterSpacing: '-0.04em',
                    lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
                    userSelect: 'none',
                }}
            >
                {chapterNumber}
            </Box>
        </Box>
    );
}

export function PrintPreviewChapterRightContent({
    chapterNumber,
    title,
    subtitle,
}: {
    chapterNumber: string;
    title: string;
    subtitle: string;
}) {
    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box
                sx={{
                    fontSize: pt(7),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.light,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: pdfColors.gray400,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.snug,
                    mb: pt(10),
                }}
            >
                Kapitel {chapterNumber}
            </Box>
            <Box
                sx={{
                    fontSize: pt(28),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.bold,
                    letterSpacing: '-0.03em',
                    lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
                    mb: pt(12),
                }}
            >
                {title}
            </Box>
            <Box
                sx={{
                    fontSize: pt(10),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.regular,
                    color: pdfColors.gray600,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
                    maxWidth: pt(380),
                }}
            >
                {subtitle}
            </Box>
        </Box>
    );
}

export function PrintPreviewContentSample() {
    return (
        <>
            <Box
                sx={{
                    fontSize: pt(12),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.bold,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
                    letterSpacing: '-0.01em',
                    mb: pt(10),
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
                            fontWeight: PDF_PREVIEW_FONT_WEIGHT.bold,
                            fontSize: pt(10),
                            lineHeight: PDF_TYPE_LINE_HEIGHT.tight,
                        }}
                    >
                        {t}
                    </Box>
                ))}
            </Box>
            <Box
                sx={{
                    fontSize: pt(9),
                    fontWeight: PDF_PREVIEW_FONT_WEIGHT.regular,
                    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
                    color: pdfColors.gray700,
                }}
            >
                Fließtext ohne Boxen — entspricht dem minimalistischen PDF-Export.
            </Box>
        </>
    );
}
