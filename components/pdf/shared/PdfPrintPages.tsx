'use client';

import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import {
    pdfNeedsSpreadPadBeforeChapter,
    pdfContentMarginsForSide,
    pdfSpreadSideFromIndex,
    PDF_DOCUMENT_PAGE_LAYOUT,
    PDF_PAGE_BACKGROUND,
    PDF_PAGE_HEIGHT_PT,
    PDF_PAGE_WIDTH_PT,
    type PdfSpreadSide,
} from '@/lib/paths/pdf-print-tokens';
import { pdfColors, pdfStyles, type PdfChapterKey } from '@/components/pdf/shared/pdf-styles';
import { PdfMinimalPageChrome } from '@/components/pdf/shared/PdfAppFrame';
import { PdfFooter } from '@/components/pdf/shared/PdfPrimitives';

const printPageBase = {
    width: PDF_PAGE_WIDTH_PT,
    height: PDF_PAGE_HEIGHT_PT,
    fontFamily: pdfStyles.page.fontFamily,
    fontSize: 10,
    backgroundColor: PDF_PAGE_BACKGROUND,
};

export function PdfPrintPage({
    side,
    children,
}: {
    side: PdfSpreadSide;
    children: React.ReactNode;
}) {
    const margins = pdfContentMarginsForSide(side);
    return (
        <Page size="A4" style={[printPageBase, { padding: 0 }]}>
            <PdfMinimalPageChrome side={side} />
            <View style={{ flex: 1, ...margins }}>{children}</View>
        </Page>
    );
}

export function PdfCoverPage({ children }: { children: React.ReactNode }) {
    const margins = pdfContentMarginsForSide('cover');
    return (
        <Page size="A4" style={[printPageBase, { padding: 0 }]}>
            <PdfMinimalPageChrome side="cover" />
            <View style={{ flex: 1, ...margins, justifyContent: 'flex-start' }}>{children}</View>
        </Page>
    );
}

export function PdfSpreadPadPage({ side }: { side: PdfSpreadSide }) {
    return <PdfPrintPage side={side}>{null}</PdfPrintPage>;
}

export function PdfChapterSpreadPages({
    chapterNumber,
    title,
    subtitle,
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
    const leftSide = pdfSpreadSideFromIndex(startPageIndex);
    const rightSide = pdfSpreadSideFromIndex(startPageIndex + 1);
    return [
        <PdfPrintPage key={`ch-${chapterNumber}-left`} side={leftSide}>
            <View style={pdfStyles.chapterSpreadLeft}>
                <Text style={pdfStyles.chapterSpreadGhost}>{chapterNumber}</Text>
            </View>
        </PdfPrintPage>,
        <PdfPrintPage key={`ch-${chapterNumber}-right`} side={rightSide}>
            <View style={pdfStyles.chapterSpreadRight}>
                <Text style={pdfStyles.chapterSpreadEyebrow}>
                    {chapterPrefix} {chapterNumber}
                </Text>
                <Text style={pdfStyles.chapterSpreadTitle}>{title}</Text>
                {subtitle ? <Text style={pdfStyles.chapterSpreadSubtitle}>{subtitle}</Text> : null}
            </View>
        </PdfPrintPage>,
    ];
}

export function PdfContentPage({
    side,
    children,
}: {
    side: PdfSpreadSide;
    children: React.ReactNode;
}) {
    return <PdfPrintPage side={side}>{children}</PdfPrintPage>;
}

/** @deprecated Use PdfChapterSpreadPages */
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
    const pages = PdfChapterSpreadPages({
        chapterNumber,
        title,
        subtitle,
        chapter,
        startPageIndex: 0,
    });
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
                <View key={item.label} style={pdfStyles.statTile}>
                    <Text style={pdfStyles.statTileLabel}>{item.label}</Text>
                    <Text style={pdfStyles.statTileValue}>{item.value}</Text>
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
