'use client';

import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { MsqdxCornerBox } from '@msqdx/react';
import {
    PDF_BRAND_COLOR,
    PDF_CORNER_TAB_PADDING_BOTTOM_PT,
    PDF_CORNER_TAB_PADDING_TOP_PT,
    PDF_CORNER_TAB_PADDING_X_PT,
    PDF_INNER_BACKGROUND,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    PDF_RADIUS_BUTTON_PT,
    pdfContentMarginsForSide,
    pdfFrameRectForSide,
    pdfShowsCornerTabForSide,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { pdfPtToCssLength, pdfPtToCssPx, pdfMarginsToCss } from '@/lib/paths/pdf-print-preview';
import {
    buildAppInnerFramePath,
    cornerTabBox,
    pdfCornerTabAnchor,
} from '@/components/pdf/shared/pdf-frame-path';

export function PrintPreviewFrame({
    side,
    accentColor = PDF_BRAND_COLOR,
    innerFill = PDF_INNER_BACKGROUND,
    showCornerTab = pdfShowsCornerTabForSide(side),
    showBindingMarker = true,
    children,
}: {
    side: PdfSpreadSide;
    accentColor?: string;
    innerFill?: string;
    showCornerTab?: boolean;
    showBindingMarker?: boolean;
    children?: ReactNode;
}) {
    const brand = accentColor;
    const pageW = pdfPtToCssPx(PDF_PAGE_WIDTH_PT);
    const pageH = pdfPtToCssPx(PDF_PAGE_HEIGHT_PT);
    const margins = pdfMarginsToCss(pdfContentMarginsForSide(side));
    const tab = cornerTabBox(side);
    const tabAnchor = pdfCornerTabAnchor(side);
    const cornerRadiusPx = PDF_RADIUS_BUTTON_PT;
    const frame = pdfFrameRectForSide(side);

    return (
        <Box
            data-print-preview-side={side}
            sx={{
                position: 'relative',
                width: pageW,
                height: pageH,
                flexShrink: 0,
                bgcolor: brand,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
        >
            <Box
                component="svg"
                viewBox={`0 0 ${PDF_PAGE_WIDTH_PT} ${PDF_PAGE_HEIGHT_PT}`}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            >
                <path d={buildAppInnerFramePath(side)} fill={innerFill} />
            </Box>

            {showCornerTab ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: pdfPtToCssPx(tab.y),
                        left: pdfPtToCssPx(tab.x),
                        width: 'fit-content',
                        height: 'fit-content',
                        zIndex: 3,
                    }}
                >
                    <MsqdxCornerBox
                        logo
                        borderRadius={cornerRadiusPx}
                        topLeft={tabAnchor === 'left' ? 'square' : 'cutdown-a'}
                        topRight={tabAnchor === 'left' ? 'rounded' : 'square'}
                        bottomLeft={tabAnchor === 'left' ? 'cutdown-b' : 'rounded'}
                        bottomRight={tabAnchor === 'left' ? 'cutdown-a' : 'cutdown-b'}
                        sx={{
                            width: 'fit-content',
                            height: 'fit-content',
                            bgcolor: brand,
                            boxSizing: 'border-box',
                            paddingTop: pdfPtToCssLength(PDF_CORNER_TAB_PADDING_TOP_PT),
                            paddingBottom: pdfPtToCssLength(PDF_CORNER_TAB_PADDING_BOTTOM_PT),
                            paddingLeft: pdfPtToCssLength(PDF_CORNER_TAB_PADDING_X_PT),
                            paddingRight: pdfPtToCssLength(PDF_CORNER_TAB_PADDING_X_PT),
                        }}
                    />
                </Box>
            ) : null}

            {showBindingMarker && side === 'left' ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: pdfPtToCssPx(frame.y + frame.height * 0.38),
                        left: pdfPtToCssPx(frame.x + frame.width - 4),
                        width: pdfPtToCssPx(4),
                        height: pdfPtToCssPx(100),
                        bgcolor: brand,
                        opacity: 0.4,
                        zIndex: 1,
                    }}
                />
            ) : null}
            {showBindingMarker && side === 'right' ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: pdfPtToCssPx(frame.y + frame.height * 0.38),
                        left: pdfPtToCssPx(frame.x),
                        width: pdfPtToCssPx(4),
                        height: pdfPtToCssPx(100),
                        bgcolor: brand,
                        opacity: 0.4,
                        zIndex: 1,
                    }}
                />
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
                    lineHeight: 1.45,
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
