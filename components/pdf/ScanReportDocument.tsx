'use client';

import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import type { ScanResult } from '@/lib/types';
import { pdfColors, pdfStyles, type PdfChapterKey } from '@/components/pdf/shared/pdf-styles';
import { MsqdxLogoPdf } from '@/components/pdf/shared/PdfPrimitives';
import {
    PdfCoverPage,
    PdfContentPage,
    applyReportFooters,
    isChapterIntroPage,
    appendChapterSpread,
    contentSideForIndex,
    PDF_DOCUMENT_PAGE_LAYOUT,
} from '@/components/pdf/shared/PdfLayout';
import { buildScanPage2Content, buildScanPage3Content } from '@/components/pdf/ScanReportSections';

interface ScanReportProps {
    scan: ScanResult;
}

function pushContent(
    pages: React.ReactElement[],
    key: string,
    children: React.ReactNode
): React.ReactElement[] {
    const side = contentSideForIndex(pages.length);
    return [
        ...pages,
        <PdfContentPage key={key} side={side}>
            {children}
        </PdfContentPage>,
    ];
}

export function ScanReportDocument({ scan }: ScanReportProps) {
    let pages: React.ReactElement[] = [];

    const chapter = (props: {
        chapterNumber: string;
        title: string;
        subtitle?: string;
        chapter: PdfChapterKey;
    }) => {
        pages = appendChapterSpread(pages, { ...props, chapterPrefix: 'Kapitel' });
    };

    pages.push(
        <PdfCoverPage key="cover">
            <View style={pdfStyles.coverLogoWrap}>
                <MsqdxLogoPdf width={100} height={24} />
            </View>
            <Text style={pdfStyles.coverSubtitle}>Accessibility &amp; UX Audit</Text>
            <Text style={pdfStyles.coverTitle}>Scan-Report</Text>
            <View style={pdfStyles.coverUrlBox}>
                <Text style={pdfStyles.coverUrl}>{scan.url}</Text>
            </View>
            <View style={pdfStyles.coverMeta}>
                <Text style={pdfStyles.coverMetaItem}>Scan-ID: {scan.id.slice(0, 8)}</Text>
                <Text style={pdfStyles.coverMetaItem}>
                    Datum: {new Date(scan.timestamp).toLocaleDateString('de-DE')}
                </Text>
                <Text style={pdfStyles.coverMetaItem}>Standard: {scan.standard}</Text>
                <Text style={pdfStyles.coverMetaItem}>Gerät: {scan.device ?? 'Desktop'}</Text>
            </View>
            <View style={pdfStyles.scoreGrid}>
                <View style={[pdfStyles.scoreCard, { borderColor: pdfColors.brand }]}>
                    <Text style={pdfStyles.scoreCardValue}>{scan.score}/100</Text>
                    <Text style={pdfStyles.scoreCardLabel}>Score</Text>
                </View>
                <View style={[pdfStyles.scoreCard, { borderColor: pdfColors.error }]}>
                    <Text style={[pdfStyles.scoreCardValue, { color: pdfColors.error }]}>
                        {scan.stats.errors}
                    </Text>
                    <Text style={[pdfStyles.scoreCardLabel, { color: pdfColors.error }]}>
                        Fehler
                    </Text>
                </View>
                <View style={[pdfStyles.scoreCard, { borderColor: pdfColors.warning }]}>
                    <Text style={[pdfStyles.scoreCardValue, { color: pdfColors.warning }]}>
                        {scan.stats.warnings}
                    </Text>
                    <Text style={[pdfStyles.scoreCardLabel, { color: pdfColors.warning }]}>
                        Warnungen
                    </Text>
                </View>
                <View style={[pdfStyles.scoreCard, { borderColor: pdfColors.notice }]}>
                    <Text style={[pdfStyles.scoreCardValue, { color: pdfColors.notice }]}>
                        {scan.stats.notices}
                    </Text>
                    <Text style={[pdfStyles.scoreCardLabel, { color: pdfColors.notice }]}>
                        Hinweise
                    </Text>
                </View>
                {scan.ux != null && (
                    <View style={[pdfStyles.scoreCard, { borderColor: pdfColors.gray500 }]}>
                        <Text style={pdfStyles.scoreCardValue}>
                            {scan.ux.cls != null ? scan.ux.cls.toFixed(2) : '–'}
                        </Text>
                        <Text style={pdfStyles.scoreCardLabel}>CLS</Text>
                    </View>
                )}
                {scan.eco != null && (
                    <View style={[pdfStyles.scoreCard, { borderColor: pdfColors.success }]}>
                        <Text style={[pdfStyles.scoreCardValue, { color: pdfColors.success }]}>
                            {scan.eco.grade}
                        </Text>
                        <Text style={[pdfStyles.scoreCardLabel, { color: pdfColors.success }]}>
                            Eco
                        </Text>
                    </View>
                )}
            </View>
            {scan.eco?.greenWebHosted !== undefined && scan.eco?.greenWebHosted !== null && (
                <Text style={[pdfStyles.metaText, { marginTop: 6 }]}>
                    Green Web (heuristic): {scan.eco.greenWebHosted ? 'listed' : 'not listed'}
                    {scan.eco.greenWebCheckedAt ? ` · checked ${scan.eco.greenWebCheckedAt}` : ''}
                </Text>
            )}
            {scan.performance && (
                <View style={[pdfStyles.cardBox, { marginTop: 8 }]}>
                    <Text style={pdfStyles.subsectionTitle}>Performance (ms)</Text>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>TTFB / FCP / LCP</Text>
                        <Text style={pdfStyles.tableValue}>
                            {scan.performance.ttfb} / {scan.performance.fcp} / {scan.performance.lcp}
                        </Text>
                    </View>
                    <View style={pdfStyles.tableRow}>
                        <Text style={pdfStyles.tableLabel}>DOM Load / Window Load</Text>
                        <Text style={pdfStyles.tableValue}>
                            {scan.performance.domLoad} / {scan.performance.windowLoad}
                        </Text>
                    </View>
                    {scan.performance.nextHopProtocol ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>HTTP (nextHopProtocol)</Text>
                            <Text style={pdfStyles.tableValue}>
                                {scan.performance.nextHopProtocol}
                            </Text>
                        </View>
                    ) : null}
                    {scan.performance.scriptTransferBytesApprox != null &&
                    scan.performance.scriptTransferBytesApprox > 0 ? (
                        <View style={pdfStyles.tableRow}>
                            <Text style={pdfStyles.tableLabel}>Script transfer (approx.)</Text>
                            <Text style={pdfStyles.tableValue}>
                                {Math.round(scan.performance.scriptTransferBytesApprox / 1024)} KB
                            </Text>
                        </View>
                    ) : null}
                </View>
            )}
        </PdfCoverPage>
    );

    chapter({
        chapterNumber: '01',
        title: 'Issues & UX',
        subtitle: 'Accessibility, UX/CX und visuelle Analyse',
        chapter: 'issues',
    });
    pages = pushContent(pages, 'page2', buildScanPage2Content(scan));

    chapter({
        chapterNumber: '02',
        title: 'Struktur & GEO',
        subtitle: 'Semantik, SEO, Infrastruktur und Generative Search',
        chapter: 'structure',
    });
    pages = pushContent(pages, 'page3', buildScanPage3Content(scan));

    const finalPages = applyReportFooters(pages, {
        title: 'Accessibility & UX Audit Report',
        locale: 'de',
        skipFooter: (page, index) => index === 0 || isChapterIntroPage(page),
    });

    return <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>{finalPages}</Document>;
}
