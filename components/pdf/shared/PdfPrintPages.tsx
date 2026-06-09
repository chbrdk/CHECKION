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
import { PdfContentColumn, PdfFooter } from '@/components/pdf/shared/PdfPrimitives';

const printPageBase = {
    width: PDF_PAGE_WIDTH_PT,
    height: PDF_PAGE_HEIGHT_PT,
    fontFamily: pdfStyles.page.fontFamily,
    fontSize: 10,
    backgroundColor: PDF_PAGE_BACKGROUND,
};

type PdfPageShellProps = {
    side: PdfSpreadSide;
    children: React.ReactNode;
    /** Rendered at page bottom — outside the centered content column */
    footer?: React.ReactNode;
    contentJustify?: 'flex-start' | 'center';
};

function PdfPageShell({ side, children, footer, contentJustify = 'flex-start' }: PdfPageShellProps) {
    const margins = pdfContentMarginsForSide(side);
    return (
        <Page
            size="A4"
            style={[
                printPageBase,
                {
                    paddingTop: margins.paddingTop,
                    paddingBottom: margins.paddingBottom,
                    paddingLeft: margins.paddingLeft,
                    paddingRight: margins.paddingRight,
                    position: 'relative',
                },
            ]}
        >
            <PdfMinimalPageChrome side={side} />
            <View style={{ alignItems: 'center', justifyContent: contentJustify }}>
                <PdfContentColumn>{children}</PdfContentColumn>
            </View>
            {footer}
        </Page>
    );
}

export function PdfPrintPage({
    side,
    children,
    footer,
}: {
    side: PdfSpreadSide;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <PdfPageShell side={side} footer={footer}>
            {children}
        </PdfPageShell>
    );
}

export function PdfCoverPage({
    children,
    footer,
}: {
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <PdfPageShell side="cover" footer={footer}>
            {children}
        </PdfPageShell>
    );
}

export function PdfSpreadPadPage({
    side,
    footer,
}: {
    side: PdfSpreadSide;
    footer?: React.ReactNode;
}) {
    return (
        <PdfPrintPage side={side} footer={footer}>
            {null}
        </PdfPrintPage>
    );
}

/** @deprecated Chapter intro pages removed from reports — kept for legacy callers. */
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
    const side = pdfSpreadSideFromIndex(startPageIndex);
    return [
        <PdfPrintPage key={`ch-${chapterNumber}-intro`} side={side}>
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
    footer,
}: {
    side: PdfSpreadSide;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <PdfPrintPage side={side} footer={footer}>
            {children}
        </PdfPrintPage>
    );
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
    return pages[0] as React.ReactElement;
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
        const footer = (
            <PdfFooter
                key="report-footer"
                pageNumber={index + 1}
                totalPages={total}
                title={options.title}
                locale={options.locale}
                spreadSide={pdfSpreadSideFromIndex(index)}
            />
        );
        return React.cloneElement(page, { footer } as { footer: React.ReactNode });
    });
}

export function isChapterIntroPage(page: React.ReactElement): boolean {
    const key = page.key != null ? String(page.key) : '';
    return key.startsWith('ch-') && key.endsWith('-intro');
}

/** @deprecated Chapter intro pages removed — no-op pad + intro append. */
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
