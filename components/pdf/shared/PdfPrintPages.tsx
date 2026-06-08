'use client';

import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import {
    pdfNeedsSpreadPadBeforeChapter,
    pdfContentMarginsForSide,
    pdfShowsCornerTabForSide,
    pdfSpreadSideFromIndex,
    PDF_DOCUMENT_PAGE_LAYOUT,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { pdfChapterColors, pdfColors, pdfStyles, type PdfChapterKey } from '@/components/pdf/shared/pdf-styles';
import { PdfAppFrameBackground } from '@/components/pdf/shared/PdfAppFrame';
import { MsqdxLogoPdf, PdfFooter, PdfHeader } from '@/components/pdf/shared/PdfPrimitives';

const printPageBase = {
    width: PDF_PAGE_WIDTH_PT,
    height: PDF_PAGE_HEIGHT_PT,
    fontFamily: pdfStyles.page.fontFamily,
    fontSize: 10,
};

export function PdfPrintPage({
    side,
    children,
    accentColor,
    showCornerTab = pdfShowsCornerTabForSide(side),
    innerFill,
}: {
    side: PdfSpreadSide;
    children: React.ReactNode;
    accentColor?: string;
    /** Override side rule; default follows {@link pdfShowsCornerTabForSide}. */
    showCornerTab?: boolean;
    innerFill?: string;
}) {
    const margins = pdfContentMarginsForSide(side);
    return (
        <Page size="A4" style={[printPageBase, { padding: 0 }]}>
            <PdfAppFrameBackground
                side={side}
                accentColor={accentColor}
                showCornerTab={showCornerTab}
                innerFill={innerFill}
            />
            <View style={{ flex: 1, ...margins }}>{children}</View>
        </Page>
    );
}

export function PdfCoverPage({
    children,
    accentColor,
}: {
    children: React.ReactNode;
    accentColor?: string;
}) {
    const margins = pdfContentMarginsForSide('cover');
    return (
        <Page size="A4" style={[printPageBase, pdfStyles.coverPage, { padding: 0 }]}>
            <PdfAppFrameBackground side="cover" accentColor={accentColor} showCornerTab />
            <View style={{ flex: 1, ...margins, justifyContent: 'center' }}>{children}</View>
        </Page>
    );
}

export function PdfSpreadPadPage({ side }: { side: PdfSpreadSide }) {
    return (
        <PdfPrintPage side={side} showCornerTab>
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', opacity: 0.2 }}>
                <MsqdxLogoPdf width={100} height={24} />
            </View>
        </PdfPrintPage>
    );
}

export function PdfChapterSpreadPages({
    chapterNumber,
    title,
    subtitle,
    chapter,
    chapterPrefix = 'Kapitel',
    startPageIndex,
}: {
    chapterNumber: string;
    title: string;
    subtitle?: string;
    chapter: PdfChapterKey;
    chapterPrefix?: string;
    startPageIndex: number;
}) {
    const c = pdfChapterColors[chapter];
    const leftSide = pdfSpreadSideFromIndex(startPageIndex);
    const rightSide = pdfSpreadSideFromIndex(startPageIndex + 1);
    return [
        <PdfPrintPage key={`ch-${chapterNumber}-left`} side={leftSide} accentColor={c.main} innerFill={c.bg}>
            <View style={pdfStyles.chapterSpreadLeft}>
                <Text style={[pdfStyles.chapterSpreadGhost, { color: c.main }]}>{chapterNumber}</Text>
                <View style={[pdfStyles.chapterSpreadAccentRing, { borderColor: c.main }]} />
            </View>
        </PdfPrintPage>,
        <PdfPrintPage key={`ch-${chapterNumber}-right`} side={rightSide} accentColor={c.main}>
            <View style={pdfStyles.chapterSpreadRight}>
                <Text style={[pdfStyles.chapterSpreadEyebrow, { color: c.main }]}>
                    {chapterPrefix} {chapterNumber}
                </Text>
                <Text style={pdfStyles.chapterSpreadTitle}>{title}</Text>
                {subtitle ? <Text style={pdfStyles.chapterSpreadSubtitle}>{subtitle}</Text> : null}
                <View style={pdfStyles.chapterSpreadFooterLogo}>
                    <MsqdxLogoPdf width={96} height={23} />
                </View>
            </View>
        </PdfPrintPage>,
    ];
}

export function PdfContentPage({
    side,
    children,
    showHeader = false,
    accentColor,
}: {
    side: PdfSpreadSide;
    children: React.ReactNode;
    /** Legacy top logo bar — print layout uses corner tab instead. */
    showHeader?: boolean;
    accentColor?: string;
}) {
    return (
        <PdfPrintPage side={side} accentColor={accentColor}>
            {showHeader ? <PdfHeader /> : null}
            {children}
        </PdfPrintPage>
    );
}

/** @deprecated Use PdfChapterSpreadPages — kept for isChapterIntroPage detection */
export function PdfChapterIntroPage({
    chapterNumber,
    title,
    subtitle,
    chapter,
}: {
    chapterNumber: string;
    title: string;
    subtitle?: string;
    chapter: PdfChapterKey;
}) {
    const pages = PdfChapterSpreadPages({ chapterNumber, title, subtitle, chapter, startPageIndex: 0 });
    return pages[1] as React.ReactElement;
}

export function PdfStatGrid({
    items,
}: {
    items: Array<{ label: string; value: string; accent?: string }>;
}) {
    return (
        <View style={pdfStyles.statGrid}>
            {items.map((item) => (
                <View
                    key={item.label}
                    style={[
                        pdfStyles.statTile,
                        item.accent ? { backgroundColor: pdfColors.brandTint } : {},
                    ]}
                >
                    <Text style={pdfStyles.statTileLabel}>{item.label}</Text>
                    <Text style={[pdfStyles.statTileValue, item.accent ? { color: item.accent } : {}]}>
                        {item.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export function PdfDataTable({
    columns,
    rows,
}: {
    columns: Array<{ key: string; label: string; width?: string | number }>;
    rows: Array<Record<string, string>>;
}) {
    return (
        <View style={pdfStyles.contentPanel}>
            <View style={pdfStyles.dataTableHeader}>
                {columns.map((col) => (
                    <Text
                        key={col.key}
                        style={[pdfStyles.dataTableHeaderCell, { width: col.width ?? '25%' }]}
                    >
                        {col.label}
                    </Text>
                ))}
            </View>
            {rows.map((row, i) => (
                <View key={i} style={pdfStyles.dataTableRow}>
                    {columns.map((col) => (
                        <Text
                            key={col.key}
                            style={[
                                pdfStyles.tableValue,
                                { width: col.width ?? '25%', fontSize: 9 },
                            ]}
                        >
                            {row[col.key] ?? '–'}
                        </Text>
                    ))}
                </View>
            ))}
        </View>
    );
}

export function PdfLeadText({ children }: { children: string }) {
    const chunks = children.split(/\n\n+/).filter(Boolean);
    return (
        <>
            {chunks.map((chunk, i) => (
                <Text key={i} style={pdfStyles.leadText}>
                    {chunk.trim()}
                </Text>
            ))}
        </>
    );
}

export function applyReportFooters(
    pages: React.ReactElement[],
    options: {
        title: string;
        locale: 'de' | 'en';
        skipFooter?: (page: React.ReactElement, index: number) => boolean;
    }
): React.ReactElement[] {
    const total = pages.length;
    return pages.map((page, index) => {
        if (options.skipFooter?.(page, index)) return page;
        const children = React.Children.toArray((page.props as { children?: React.ReactNode }).children);
        const withoutFooter = children.filter(
            (child) => !React.isValidElement(child) || child.key !== 'report-footer'
        );
        return React.cloneElement(page, {}, [
            ...withoutFooter,
            <PdfFooter
                key="report-footer"
                pageNumber={index + 1}
                totalPages={total}
                title={options.title}
                locale={options.locale}
                spreadSide={pdfSpreadSideFromIndex(index)}
            />,
        ]);
    });
}

export function isChapterIntroPage(page: React.ReactElement): boolean {
    const key = page.key != null ? String(page.key) : '';
    return key.startsWith('ch-') && (key.includes('-left') || key.includes('-right') || key.startsWith('ch-intro-'));
}

export function appendChapterSpread(
    pages: React.ReactElement[],
    props: {
        chapterNumber: string;
        title: string;
        subtitle?: string;
        chapter: PdfChapterKey;
        chapterPrefix?: string;
    }
): React.ReactElement[] {
    const next = [...pages];
    if (pdfNeedsSpreadPadBeforeChapter(next.length)) {
        const padSide = pdfSpreadSideFromIndex(next.length);
        next.push(
            <PdfSpreadPadPage key={`spread-pad-before-${props.chapterNumber}`} side={padSide} />
        );
    }
    next.push(...PdfChapterSpreadPages({ ...props, startPageIndex: next.length }));
    return next;
}

export function contentSideForIndex(index: number): PdfSpreadSide {
    return pdfSpreadSideFromIndex(index);
}

export { PDF_DOCUMENT_PAGE_LAYOUT };
