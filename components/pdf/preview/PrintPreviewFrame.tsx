'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MsqdxLogo } from '@msqdx/react';
import {
    PDF_MINIMAL_LOGO_HEIGHT_PT,
    PDF_MINIMAL_LOGO_WIDTH_PT,
    PDF_PAGE_BACKGROUND,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_MARGIN_PT,
    PDF_PAGE_WIDTH_PT,
    pdfContentMarginsForSide,
    pdfShowsPageLogoForSide,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { pdfPtToCssPx, pdfMarginsToCss } from '@/lib/paths/pdf-print-preview';
import { PDF_TYPE_LINE_HEIGHT } from '@/lib/paths/pdf-typography';

export function PrintPreviewFrame({
    side,
    children,
}: {
    side: PdfSpreadSide;
    children?: ReactNode;
}) {
    const pageW = pdfPtToCssPx(PDF_PAGE_WIDTH_PT);
    const pageH = pdfPtToCssPx(PDF_PAGE_HEIGHT_PT);
    const margins = pdfMarginsToCss(pdfContentMarginsForSide(side));
    const showLogo = pdfShowsPageLogoForSide(side);

    return (
        <Box
            data-print-preview-side={side}
            sx={{
                position: 'relative',
                width: pageW,
                height: pageH,
                flexShrink: 0,
                bgcolor: PDF_PAGE_BACKGROUND,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
        >
            {showLogo ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: pdfPtToCssPx(PDF_PAGE_MARGIN_PT),
                        left: pdfPtToCssPx(PDF_PAGE_MARGIN_PT),
                        zIndex: 1,
                        lineHeight: 0,
                    }}
                >
                    <MsqdxLogo
                        size="small"
                        sx={{
                            width: pdfPtToCssPx(PDF_MINIMAL_LOGO_WIDTH_PT),
                            height: pdfPtToCssPx(PDF_MINIMAL_LOGO_HEIGHT_PT),
                        }}
                    />
                </Box>
            ) : null}

            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    ...margins,
                    zIndex: 2,
                    color: '#111827',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                    fontSize: pdfPtToCssPx(10),
                    lineHeight: PDF_TYPE_LINE_HEIGHT.body,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {children}
            </Box>
        </Box>
    );
}
