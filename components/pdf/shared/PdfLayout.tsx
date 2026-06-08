'use client';

import React from 'react';
import { Page, View, Text } from '@react-pdf/renderer';
import {
    pdfStyles,
    pdfChapterColors,
    type PdfChapterKey,
} from '@/components/pdf/shared/pdf-styles';
import { MsqdxLogoPdf, PdfFooter, PdfHeader } from '@/components/pdf/shared/PdfPrimitives';

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
    const c = pdfChapterColors[chapter];
    return (
        <Page size="A4" style={[pdfStyles.page, pdfStyles.chapterIntroPage]}>
            <View style={[pdfStyles.chapterIntroAccent, { backgroundColor: c.main }]} fixed />
            <View style={pdfStyles.chapterIntroBody}>
                <Text style={[pdfStyles.chapterIntroNumber, { color: c.main }]}>{chapterNumber}</Text>
                <Text style={pdfStyles.chapterIntroTitle}>{title}</Text>
                {subtitle ? <Text style={pdfStyles.chapterIntroSubtitle}>{subtitle}</Text> : null}
            </View>
            <View style={pdfStyles.chapterIntroFooter}>
                <MsqdxLogoPdf width={88} height={21} />
            </View>
        </Page>
    );
}

export function PdfContentPage({
    children,
    showHeader = true,
}: {
    children: React.ReactNode;
    showHeader?: boolean;
}) {
    return (
        <Page size="A4" style={pdfStyles.page}>
            {showHeader ? <PdfHeader /> : null}
            {children}
        </Page>
    );
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
                        item.accent ? { borderLeftWidth: 4, borderLeftColor: item.accent } : {},
                    ]}
                >
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

/** Attach footers; skip cover (index 0) and chapter intro pages. */
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
            />,
        ]);
    });
}

export function isChapterIntroPage(page: React.ReactElement): boolean {
    return page.key != null && String(page.key).startsWith('ch-intro-');
}
