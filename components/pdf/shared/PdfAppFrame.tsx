'use client';

import React from 'react';
import { View, Svg, Path } from '@react-pdf/renderer';
import {
    PDF_BRAND_COLOR,
    PDF_INNER_BACKGROUND,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    pdfFrameRectForSide,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import {
    buildAppInnerFramePath,
    buildCornerTabPath,
    cornerTabLogoPosition,
} from '@/components/pdf/shared/pdf-frame-path';
import { MsqdxLogoPdf } from '@/components/pdf/shared/PdfPrimitives';

export function PdfAppFrameBackground({
    side,
    accentColor,
    showCornerTab = true,
    innerFill = PDF_INNER_BACKGROUND,
}: {
    side: PdfSpreadSide;
    accentColor?: string;
    showCornerTab?: boolean;
    innerFill?: string;
}) {
    const brand = accentColor ?? PDF_BRAND_COLOR;
    const innerPath = buildAppInnerFramePath(side);
    const tabPath = buildCornerTabPath(side);
    const logoPos = cornerTabLogoPosition(side);
    const frame = pdfFrameRectForSide(side);

    return (
        <>
            <View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: brand,
                }}
                fixed
            />
            <Svg
                viewBox={`0 0 ${PDF_PAGE_WIDTH_PT} ${PDF_PAGE_HEIGHT_PT}`}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: PDF_PAGE_WIDTH_PT,
                    height: PDF_PAGE_HEIGHT_PT,
                }}
                fixed
            >
                <Path d={innerPath} fill={innerFill} stroke={brand} strokeWidth={3} />
                {showCornerTab ? <Path d={tabPath} fill={brand} /> : null}
            </Svg>
            {showCornerTab ? (
                <View
                    style={{
                        position: 'absolute',
                        top: logoPos.top,
                        left: logoPos.left,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                    fixed
                >
                    <MsqdxLogoPdf width={72} height={17} color="#000000" />
                </View>
            ) : null}
            {side === 'left' ? (
                <View
                    style={{
                        position: 'absolute',
                        top: frame.y + frame.height * 0.38,
                        left: frame.x + frame.width - 4,
                        width: 4,
                        height: 100,
                        backgroundColor: brand,
                        opacity: 0.4,
                    }}
                    fixed
                />
            ) : null}
            {side === 'right' ? (
                <View
                    style={{
                        position: 'absolute',
                        top: frame.y + frame.height * 0.38,
                        left: frame.x,
                        width: 4,
                        height: 100,
                        backgroundColor: brand,
                        opacity: 0.4,
                    }}
                    fixed
                />
            ) : null}
        </>
    );
}
