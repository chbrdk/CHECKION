'use client';

import React from 'react';
import { Document, View, Text } from '@react-pdf/renderer';
import type { ScanResult } from '@/lib/types';
import { pdfCoverEyebrow } from '@/lib/paths/pdf-cover-copy';
import { PdfScanReportCoverContent } from '@/components/pdf/shared/PdfCoverContent';
import { pdfColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';
import {
    PdfCoverPage,
    PdfContentPage,
    applyReportFooters,
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

    pages.push(
        <PdfCoverPage key="cover">
            <PdfScanReportCoverContent
                eyebrow={pdfCoverEyebrow('Accessibility & UX Audit')}
                title="Scan-Report"
                urlLine={scan.url}
                metaLines={[
                    `Scan-ID: ${scan.id.slice(0, 8)}`,
                    `Datum: ${new Date(scan.timestamp).toLocaleDateString('de-DE')}`,
                    `Standard: ${scan.standard}`,
                    `Gerät: ${scan.device ?? 'Desktop'}`,
                ]}
                scoreItems={[
                    { label: 'Score', value: `${scan.score}/100` },
                    {
                        label: 'Fehler',
                        value: String(scan.stats.errors),
                        valueColor: pdfColors.error,
                        labelColor: pdfColors.error,
                    },
                    {
                        label: 'Warnungen',
                        value: String(scan.stats.warnings),
                        valueColor: pdfColors.warning,
                        labelColor: pdfColors.warning,
                    },
                    {
                        label: 'Hinweise',
                        value: String(scan.stats.notices),
                        valueColor: pdfColors.notice,
                        labelColor: pdfColors.notice,
                    },
                    ...(scan.ux != null
                        ? [
                              {
                                  label: 'CLS',
                                  value: scan.ux.cls != null ? scan.ux.cls.toFixed(2) : '–',
                              },
                          ]
                        : []),
                    ...(scan.eco != null
                        ? [
                              {
                                  label: 'Eco',
                                  value: scan.eco.grade,
                                  valueColor: pdfColors.success,
                                  labelColor: pdfColors.success,
                              },
                          ]
                        : []),
                ]}
            />
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

    pages = pushContent(pages, 'page2', buildScanPage2Content(scan));
    pages = pushContent(pages, 'page3', buildScanPage3Content(scan));

    const finalPages = applyReportFooters(pages, {
        title: 'Accessibility & UX Audit Report',
        locale: 'de',
        skipFooter: (_page, index) => index === 0,
    });

    return <Document pageLayout={PDF_DOCUMENT_PAGE_LAYOUT}>{finalPages}</Document>;
}
