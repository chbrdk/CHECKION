'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Svg, Path } from '@react-pdf/renderer';
import type { ScanResult } from '@/lib/types';

/* DIN A4: 595.28 x 841.89 pt. Margins for print. */
const MARGIN = 40;
const HEADER_HEIGHT = 36;
const BRAND_PURPLE = '#b638ff';
const ACCENT_LIGHT = 'rgba(182, 56, 255, 0.08)';

const colors = {
    black: '#000000',
    gray900: '#111827',
    gray700: '#374151',
    gray600: '#4B5563',
    gray500: '#6B7280',
    gray400: '#9CA3AF',
    gray200: '#E5E7EB',
    gray100: '#F3F4F6',
    white: '#FFFFFF',
    error: '#DC2626',
    warning: '#D97706',
    notice: '#2563EB',
    success: '#059669',
    brand: BRAND_PURPLE,
};

/** Per-chapter accent colors for section headers and boxes */
const chapterColors = {
    issues: { main: '#B91C1C', bg: 'rgba(185, 28, 28, 0.08)' },
    summary: { main: BRAND_PURPLE, bg: ACCENT_LIGHT },
    visual: { main: '#1D4ED8', bg: 'rgba(29, 78, 216, 0.08)' },
    ux: { main: '#0D9488', bg: 'rgba(13, 148, 136, 0.08)' },
    structure: { main: '#4F46E5', bg: 'rgba(79, 70, 229, 0.08)' },
    seo: { main: '#047857', bg: 'rgba(4, 120, 87, 0.08)' },
    infra: { main: '#C2410C', bg: 'rgba(194, 65, 12, 0.08)' },
    geo: { main: '#0891B2', bg: 'rgba(8, 145, 178, 0.08)' },
} as const;

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: colors.white,
        paddingTop: MARGIN,
        paddingBottom: MARGIN,
        paddingLeft: MARGIN,
        paddingRight: MARGIN,
        fontFamily: 'Helvetica',
        fontSize: 10,
    },
    /* Cover page */
    coverAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        backgroundColor: colors.brand,
    },
    coverLogoWrap: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 24,
    },
    coverTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.gray900,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    coverSubtitle: {
        fontSize: 10,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
    },
    coverUrlBox: {
        backgroundColor: colors.gray100,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 6,
        marginBottom: 24,
        borderLeftWidth: 4,
        borderLeftColor: colors.brand,
    },
    coverUrl: {
        fontSize: 11,
        color: colors.gray900,
        fontWeight: 'bold',
    },
    coverMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
    },
    coverMetaItem: {
        fontSize: 9,
        color: colors.gray500,
    },
    scoreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 8,
    },
    scoreCard: {
        width: '30%',
        minWidth: 100,
        padding: 14,
        borderRadius: 8,
        backgroundColor: colors.gray100,
        borderLeftWidth: 4,
    },
    scoreCardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.gray900,
        marginBottom: 2,
    },
    scoreCardLabel: {
        fontSize: 8,
        color: colors.gray500,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    /* Header / Footer (inner pages) */
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: HEADER_HEIGHT,
        marginBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    headerFallback: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.black,
        letterSpacing: 0.5,
    },
    footer: {
        position: 'absolute',
        bottom: MARGIN,
        left: MARGIN,
        right: MARGIN,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
        fontSize: 8,
        color: colors.gray500,
    },
    /* Section styling – base; use sectionTitleChap for chapter-specific */
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.gray900,
        marginTop: 10,
        marginBottom: 6,
        paddingLeft: 10,
        paddingVertical: 6,
        borderLeftWidth: 4,
        borderRadius: 4,
    },
    subsectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.gray700,
        marginTop: 6,
        marginBottom: 4,
    },
    /* Compact data */
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    kvInline: {
        flexDirection: 'row',
        marginBottom: 2,
        fontSize: 8,
    },
    kvKey: { color: colors.gray500, marginRight: 6 },
    kvVal: { flex: 1, color: colors.gray700 },
    bodyText: {
        fontSize: 9,
        color: colors.gray700,
        marginBottom: 4,
        lineHeight: 1.45,
    },
    metaText: {
        fontSize: 9,
        color: colors.gray500,
        marginBottom: 2,
    },
    url: {
        fontSize: 11,
        color: colors.gray900,
        marginBottom: 6,
        fontWeight: 'bold',
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.gray100,
        padding: 12,
        marginBottom: 12,
        borderRadius: 6,
        borderLeftWidth: 4,
        borderLeftColor: colors.gray200,
    },
    scoreItem: {
        alignItems: 'center',
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.gray900,
    },
    scoreLabel: {
        fontSize: 8,
        color: colors.gray500,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    /* Issue list */
    issueRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingBottom: 8,
        paddingLeft: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
        borderLeftWidth: 3,
        borderLeftColor: colors.gray200,
    },
    issueSeverity: {
        width: 52,
        fontSize: 8,
        fontWeight: 'bold',
    },
    issueContent: {
        flex: 1,
    },
    issueMessage: {
        fontSize: 9,
        color: colors.gray700,
        marginBottom: 2,
    },
    issueSelector: {
        fontSize: 7,
        color: colors.gray400,
        fontFamily: 'Courier',
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 4,
        paddingLeft: 8,
    },
    bulletDot: {
        width: 4,
        marginRight: 8,
        marginTop: 5,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.brand,
    },
    tableRow: {
        flexDirection: 'row',
        marginBottom: 4,
        fontSize: 9,
    },
    tableLabel: {
        width: 130,
        color: colors.gray500,
    },
    tableValue: {
        flex: 1,
        color: colors.gray700,
    },
    outlineItem: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    outlineLevel: {
        width: 24,
        fontSize: 8,
        color: colors.gray500,
    },
    outlineText: {
        flex: 1,
        fontSize: 9,
        color: colors.gray700,
    },
    recommendationRow: {
        marginBottom: 10,
        paddingLeft: 12,
        paddingVertical: 6,
        borderLeftWidth: 3,
        borderLeftColor: colors.brand,
        backgroundColor: ACCENT_LIGHT,
        borderRadius: 4,
    },
    recommendationTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.gray900,
        marginBottom: 2,
    },
    recommendationDesc: {
        fontSize: 8,
        color: colors.gray600,
        lineHeight: 1.35,
    },
    cardBox: {
        backgroundColor: colors.gray100,
        padding: 12,
        borderRadius: 6,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: colors.gray200,
    },
});

function PdfHeader() {
    return (
        <View style={styles.header} fixed>
            <MsqdxLogoPdf width={84} height={20} />
        </View>
    );
}

function PdfFooter({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
    return (
        <View style={styles.footer} fixed>
            <Text>Accessibility &amp; UX Audit Report</Text>
            <Text>
                Seite {pageNumber} von {totalPages}
            </Text>
        </View>
    );
}

const SeverityColor: Record<string, string> = {
    error: colors.error,
    warning: colors.warning,
    notice: colors.notice,
};

type ChapterKey = keyof typeof chapterColors;

function SectionHeader({ title, chapter }: { title: string; chapter: ChapterKey }) {
    const c = chapterColors[chapter];
    return (
        <Text style={[styles.sectionTitle, { backgroundColor: c.bg, borderLeftColor: c.main }]}>
            {title}
        </Text>
    );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
    return <View style={[styles.pill, { backgroundColor: color }]}><Text style={{ fontSize: 8, color: colors.white }}>{children}</Text></View>;
}

/** MSQDX wordmark path from design system (black). */
const MSQDX_LOGO_PATH_D =
    'M97.2578 39.9922L97.25 40V39.9922H97.2578ZM81.3662 0C89.9238 0 96.8764 6.78107 97.2188 15.25L97.25 39.9922H88.6807V30C86.4899 31.1408 84.0089 31.7939 81.3701 31.7939C75.4322 31.7939 70.2574 28.5321 67.5322 23.7031C66.5924 28.8865 61.5514 32.0107 55.6367 32.0107C51.7983 32.0107 46.2771 30.5195 44.2715 25.1865V31.2783H35.5566V15.6074C35.5566 13.2462 35.497 9.14551 31.0342 9.14551C26.5718 9.1458 26.5127 13.2424 26.5127 15.6074V31.2783H17.7588V15.6074C17.7588 13.2463 17.7035 9.14579 13.2373 9.14551C8.77061 9.14551 8.71485 13.2423 8.71484 15.6074V31.2783H0V15.1865C0 8.72536 0.425246 6.7809 3.15039 3.88867C5.51382 1.41784 9.93031 0.271484 13.2373 0.271484C16.0487 0.271577 19.6629 1.10615 22.1318 2.87305C24.6048 1.10606 28.2198 0.271484 31.0312 0.271484C34.3392 0.271595 38.7587 1.42083 41.1172 3.88867C42.8004 5.67968 43.6061 7.10397 43.9756 9.45703C44.3656 3.95925 49.5209 0.362485 55.415 0.362305C59.2971 0.362305 65.9819 1.90097 66.7686 9.61816C69.2028 3.96682 74.8231 8.89035e-05 81.3662 0ZM165.024 0.405273C166.114 0.405273 166.999 1.29057 166.999 2.38086V8.74219C166.999 9.83228 166.113 10.7178 165.024 10.7178H159.146C157.804 10.7178 156.719 11.8038 156.719 13.1455V19.0293C156.719 20.1195 155.834 21.0049 154.745 21.0049H148.866C147.525 21.0051 146.441 22.0912 146.44 23.4326V29.3164C146.44 30.4066 145.555 31.2919 144.466 31.292H138.11C137.02 31.2919 136.136 30.4066 136.136 29.3164V22.9561C136.136 21.8659 137.021 20.9806 138.11 20.9805H143.989C145.33 20.9805 146.416 19.8943 146.416 18.5527V12.6689C146.416 11.5787 147.302 10.6934 148.391 10.6934H154.27C155.611 10.6933 156.696 9.60635 156.696 8.26465V2.38184C156.696 1.29169 157.581 0.406488 158.67 0.40625H165.025L165.024 0.405273ZM118.135 0.40625C126.562 0.406358 133.649 7.04075 133.85 15.4707C134.054 24.156 127.059 31.283 118.427 31.2832H103.869V0.40625H118.135ZM165.018 20.9678C166.11 20.9678 166.996 21.8542 166.996 22.9473V29.3027C166.996 30.3959 166.111 31.2822 165.018 31.2822H158.666C157.573 31.282 156.688 30.3958 156.688 29.3027V22.9473C156.689 21.8544 157.574 20.968 158.666 20.9678H165.018ZM44.208 12.0273C44.2478 12.9477 44.2637 13.9915 44.2637 15.1914V22.1963H52.376C52.7494 24.9191 55.3605 24.9189 55.7383 24.9189C57.2289 24.9189 58.8291 24.0658 58.8291 22.625C58.8289 20.3301 56.6391 20.0633 50.9883 17.875C47.7947 16.8527 45.042 14.9438 44.208 12.0273ZM81.3623 8.26855C77.202 8.26869 73.836 11.6417 73.8359 15.8008C73.8359 19.9599 77.2058 23.3329 81.3623 23.333C85.5228 23.333 88.8896 19.9639 88.8896 15.8008C88.8895 11.6378 85.5227 8.26855 81.3623 8.26855ZM112.063 22.2354H118.427V22.2363C121.946 22.2362 124.812 19.3669 124.812 15.8447C124.812 12.3225 121.946 9.45328 118.427 9.45312H112.063V22.2354ZM55.3145 7.46484C53.447 7.46492 52.8059 8.63753 52.8057 9.43652C52.8057 11.0423 54.9881 11.9523 57.3398 12.6406L57.3408 12.6396H57.3447C60.353 13.4785 63.476 14.3474 65.4932 16.2959C65.4893 16.1631 65.4815 16.0332 65.4814 15.9033C65.4814 13.7072 65.9295 11.6138 66.7354 9.70898H58.0869C58.0355 9.06724 57.93 7.46484 55.3145 7.46484ZM143.173 0.405273C144.095 0.405273 144.844 1.15482 144.844 2.07812V7.43848C144.844 8.36275 144.096 9.11133 143.173 9.11133H137.816C136.893 9.11117 136.146 8.36168 136.146 7.43848V2.0791C136.146 1.15493 136.893 0.40641 137.816 0.40625H143.173V0.405273Z';

function MsqdxLogoPdf({ width, height }: { width: number; height: number }) {
    return (
        <Svg viewBox="0 0 167 40" width={width} height={height}>
            <Path d={MSQDX_LOGO_PATH_D} fill={colors.black} />
        </Svg>
    );
}

interface ScanReportProps {
    scan: ScanResult;
}

export function ScanReportDocument({ scan }: ScanReportProps) {
    const allContent: React.ReactNode[] = [];

    // —— Page 1: Cover ——
    allContent.push(
        <React.Fragment key="cover">
            <View style={styles.coverAccentBar} fixed />
            <View style={styles.coverLogoWrap}>
                <MsqdxLogoPdf width={100} height={24} />
            </View>
            <Text style={styles.coverSubtitle}>Accessibility &amp; UX Audit</Text>
            <Text style={styles.coverTitle}>Scan-Report</Text>
            <View style={styles.coverUrlBox}>
                <Text style={styles.coverUrl}>{scan.url}</Text>
            </View>
            <View style={styles.coverMeta}>
                <Text style={styles.coverMetaItem}>Scan-ID: {scan.id.slice(0, 8)}</Text>
                <Text style={styles.coverMetaItem}>Datum: {new Date(scan.timestamp).toLocaleDateString('de-DE')}</Text>
                <Text style={styles.coverMetaItem}>Standard: {scan.standard}</Text>
                <Text style={styles.coverMetaItem}>Gerät: {scan.device ?? 'Desktop'}</Text>
            </View>
            <View style={styles.scoreGrid}>
                <View style={[styles.scoreCard, { borderLeftColor: colors.brand }]}>
                    <Text style={styles.scoreCardValue}>{scan.score}/100</Text>
                    <Text style={styles.scoreCardLabel}>Score</Text>
                </View>
                <View style={[styles.scoreCard, { borderLeftColor: colors.error }]}>
                    <Text style={[styles.scoreCardValue, { color: colors.error }]}>{scan.stats.errors}</Text>
                    <Text style={[styles.scoreCardLabel, { color: colors.error }]}>Fehler</Text>
                </View>
                <View style={[styles.scoreCard, { borderLeftColor: colors.warning }]}>
                    <Text style={[styles.scoreCardValue, { color: colors.warning }]}>{scan.stats.warnings}</Text>
                    <Text style={[styles.scoreCardLabel, { color: colors.warning }]}>Warnungen</Text>
                </View>
                <View style={[styles.scoreCard, { borderLeftColor: colors.notice }]}>
                    <Text style={[styles.scoreCardValue, { color: colors.notice }]}>{scan.stats.notices}</Text>
                    <Text style={[styles.scoreCardLabel, { color: colors.notice }]}>Hinweise</Text>
                </View>
                {scan.ux != null && (
                    <View style={[styles.scoreCard, { borderLeftColor: colors.gray500 }]}>
                        <Text style={styles.scoreCardValue}>{scan.ux.cls != null ? scan.ux.cls.toFixed(2) : '–'}</Text>
                        <Text style={styles.scoreCardLabel}>CLS</Text>
                    </View>
                )}
                {scan.eco != null && (
                    <View style={[styles.scoreCard, { borderLeftColor: colors.success }]}>
                        <Text style={[styles.scoreCardValue, { color: colors.success }]}>{scan.eco.grade}</Text>
                        <Text style={[styles.scoreCardLabel, { color: colors.success }]}>Eco</Text>
                    </View>
                )}
            </View>
            {scan.performance && (
                <View style={[styles.cardBox, { marginTop: 8 }]}>
                    <Text style={styles.subsectionTitle}>Performance (ms)</Text>
                    <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>TTFB / FCP / LCP</Text>
                        <Text style={styles.tableValue}>
                            {scan.performance.ttfb} / {scan.performance.fcp} / {scan.performance.lcp}
                        </Text>
                    </View>
                    <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>DOM Load / Window Load</Text>
                        <Text style={styles.tableValue}>
                            {scan.performance.domLoad} / {scan.performance.windowLoad}
                        </Text>
                    </View>
                </View>
            )}
        </React.Fragment>
    );

    // —— Page 2: Issues, UX/CX, Visual, UX Audit (untereinander, kompakt) ——
    const page2Sections: React.ReactNode[] = [];

    page2Sections.push(
        <React.Fragment key="issues">
            <SectionHeader title="Liste &amp; Details – Issues" chapter="issues" />
            {scan.issues.length === 0 ? (
                <Text style={styles.bodyText}>Keine Issues.</Text>
            ) : (
                <>
                    <View style={styles.pillRow}>
                        <Pill color={colors.error}>{scan.stats.errors} Fehler</Pill>
                        <Pill color={colors.warning}>{scan.stats.warnings} Warnungen</Pill>
                        <Pill color={colors.notice}>{scan.stats.notices} Hinweise</Pill>
                    </View>
                    {scan.issues.slice(0, 12).map((issue, idx) => (
                        <View key={idx} style={[styles.issueRow, { borderLeftColor: SeverityColor[issue.type] ?? colors.gray400, marginBottom: 4 }]}>
                            <Text style={[styles.issueSeverity, { color: SeverityColor[issue.type] ?? colors.gray700 }]}>{issue.type.toUpperCase()}</Text>
                            <View style={styles.issueContent}>
                                <Text style={[styles.issueMessage, { marginBottom: 0 }]}>{issue.message}</Text>
                            </View>
                        </View>
                    ))}
                    {scan.issues.length > 12 && <Text style={[styles.metaText, { fontStyle: 'italic' }]}>+ {scan.issues.length - 12} weitere (Web-Report).</Text>}
                </>
            )}
        </React.Fragment>
    );

    if (scan.llmSummary) {
        page2Sections.push(
            <React.Fragment key="summary">
                <SectionHeader title="UX/CX Check" chapter="summary" />
                {scan.llmSummary.overallGrade && (
                    <View style={styles.pillRow}>
                        <View style={[styles.pill, { backgroundColor: chapterColors.summary.main }]}><Text style={{ fontSize: 8, color: colors.white }}>Note: {scan.llmSummary.overallGrade}</Text></View>
                    </View>
                )}
                <Text style={[styles.bodyText, { marginBottom: 6 }]}>{scan.llmSummary.summary.slice(0, 280)}{scan.llmSummary.summary.length > 280 ? '…' : ''}</Text>
                {scan.llmSummary.recommendations && scan.llmSummary.recommendations.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Empfehlungen (Auszug)</Text>
                        {scan.llmSummary.recommendations.slice(0, 4).map((r, i) => (
                            <View key={i} style={[styles.recommendationRow, { marginBottom: 4, paddingVertical: 4, borderLeftColor: chapterColors.summary.main, backgroundColor: chapterColors.summary.bg }]}>
                                <Text style={styles.recommendationTitle}>P{r.priority}: {r.title}</Text>
                            </View>
                        ))}
                    </>
                )}
            </React.Fragment>
        );
    }

    if (scan.ux && (scan.ux.focusOrder?.length || scan.ux.tapTargets?.details?.length)) {
        page2Sections.push(
            <React.Fragment key="visual">
                <SectionHeader title="Visuelle Analyse" chapter="visual" />
                {scan.ux.focusOrder && scan.ux.focusOrder.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Fokus (Auszug)</Text>
                        <View style={styles.pillRow}>
                            {scan.ux.focusOrder.slice(0, 6).map((item, i) => (
                                <View key={i} style={[styles.pill, { backgroundColor: chapterColors.visual.main }]}>
                                    <Text style={{ fontSize: 7, color: colors.white }}>{item.index}. {(item.text || '?').slice(0, 12)}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
                {scan.ux.tapTargets?.details && scan.ux.tapTargets.details.length > 0 && (
                    <View style={styles.kvInline}><Text style={styles.kvKey}>Touch &lt;44px:</Text><Text style={styles.kvVal}>{scan.ux.tapTargets.details.length} betroffen</Text></View>
                )}
            </React.Fragment>
        );
    }

    if (scan.ux) {
        const ux = scan.ux;
        page2Sections.push(
            <React.Fragment key="ux">
                <SectionHeader title="UX Audit" chapter="ux" />
                <View style={[styles.cardBox, { borderLeftColor: chapterColors.ux.main, padding: 8, marginBottom: 6 }]}>
                    <View style={styles.pillRow}>
                        <View style={[styles.pill, { backgroundColor: ux.viewport?.isMobileFriendly ? colors.success : colors.error }]}><Text style={{ fontSize: 8, color: colors.white }}>Mobile {ux.viewport?.isMobileFriendly ? 'Y' : 'N'}</Text></View>
                        <View style={[styles.pill, { backgroundColor: chapterColors.ux.main }]}><Text style={{ fontSize: 8, color: colors.white }}>Readability {ux.readability?.grade ?? '-'}</Text></View>
                        <View style={[styles.pill, { backgroundColor: colors.gray500 }]}><Text style={{ fontSize: 8, color: colors.white }}>Console: {ux.consoleErrors?.length ?? 0}</Text></View>
                        <View style={[styles.pill, { backgroundColor: (ux.brokenLinks?.length ?? 0) > 0 ? colors.error : colors.success }]}><Text style={{ fontSize: 8, color: colors.white }}>Links: {ux.brokenLinks?.length ?? 0}</Text></View>
                        {ux.hasSkipLink != null ? (
                            <View style={[styles.pill, { backgroundColor: ux.hasSkipLink ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 8, color: colors.white }}>Skip {ux.hasSkipLink ? 'Y' : 'n'}</Text></View>
                        ) : null}
                    </View>
                    {ux.brokenLinks && ux.brokenLinks.length > 0 ? ux.brokenLinks.slice(0, 3).map((l, i) => (
                        <View key={i} style={styles.kvInline}><Text style={styles.kvKey}></Text><Text style={styles.kvVal}>{String(l.href || '').slice(0, 50)}... {l.status}</Text></View>
                    )) : null}
                </View>
            </React.Fragment>
        );
    }

    allContent.push(<React.Fragment key="page2">{page2Sections}</React.Fragment>);

    // —— Page 3: Struktur, Links & SEO, Infrastruktur, GEO (untereinander, kompakt) ——
    const page3Sections: React.ReactNode[] = [];

    if (scan.ux?.headingHierarchy) {
        const h = scan.ux.headingHierarchy;
        page3Sections.push(
            <React.Fragment key="structure">
                <SectionHeader title="Struktur &amp; Semantik" chapter="structure" />
                <View style={[styles.cardBox, { borderLeftColor: chapterColors.structure.main, padding: 8, marginBottom: 6 }]}>
                    <View style={styles.pillRow}>
                        <View style={[styles.pill, { backgroundColor: h.hasSingleH1 ? colors.success : colors.warning }]}><Text style={{ fontSize: 8, color: colors.white }}>H1: {h.hasSingleH1 ? '1' : h.h1Count}</Text></View>
                        {h.skippedLevels.length > 0 ? (
                            <View style={[styles.pill, { backgroundColor: colors.warning }]}><Text style={{ fontSize: 8, color: colors.white }}>Level {h.skippedLevels.map((s) => 'H' + s.from + '-' + s.to).join(', ')}</Text></View>
                        ) : null}
                    </View>
                    {h.outline && h.outline.length > 0 && (
                        <>
                            <Text style={styles.subsectionTitle}>Gliederung</Text>
                            {h.outline.slice(0, 12).map((item, i) => (
                                <View key={i} style={[styles.outlineItem, { paddingLeft: 6 + (item.level - 1) * 8 }]}>
                                    <Text style={styles.outlineLevel}>H{item.level}</Text>
                                    <Text style={[styles.outlineText, { fontSize: 8 }]}>{ (item.text || '(leer)').slice(0, 45)}{(item.text?.length ?? 0) > 45 ? '…' : ''}</Text>
                                </View>
                            ))}
                            {h.outline.length > 12 && <Text style={styles.metaText}>+ {h.outline.length - 12} weitere</Text>}
                        </>
                    )}
                </View>
            </React.Fragment>
        );
    }

    if (scan.seo || scan.links) {
        page3Sections.push(
            <React.Fragment key="seo">
                <SectionHeader title="Links &amp; SEO" chapter="seo" />
                <View style={[styles.cardBox, { borderLeftColor: chapterColors.seo.main, padding: 8, marginBottom: 6 }]}>
                    {scan.seo && (
                        <>
                            <View style={styles.kvInline}><Text style={styles.kvKey}>Title</Text><Text style={styles.kvVal}>{(scan.seo.title ?? '–').slice(0, 55)}</Text></View>
                            <View style={styles.kvInline}><Text style={styles.kvKey}>Meta</Text><Text style={styles.kvVal}>{(scan.seo.metaDescription ?? '–').slice(0, 50)}…</Text></View>
                            <View style={styles.kvInline}><Text style={styles.kvKey}>H1</Text><Text style={styles.kvVal}>{(scan.seo.h1 ?? '–').slice(0, 40)}</Text></View>
                            {scan.seo.keywordAnalysis?.topKeywords?.length ? (
                                <View style={styles.pillRow}>
                                    {scan.seo.keywordAnalysis.topKeywords.slice(0, 5).map((k, i) => (
                                        <View key={i} style={[styles.pill, { backgroundColor: chapterColors.seo.main }]}><Text style={{ fontSize: 7, color: colors.white }}>{k.keyword} {k.densityPercent.toFixed(1)}%</Text></View>
                                    ))}
                                </View>
                            ) : null}
                        </>
                    )}
                    {scan.links && (
                        <>
                            <View style={styles.pillRow}>
                                <View style={[styles.pill, { backgroundColor: chapterColors.seo.main }]}><Text style={{ fontSize: 8, color: colors.white }}>{scan.links.total} Links</Text></View>
                                <View style={[styles.pill, { backgroundColor: colors.gray500 }]}><Text style={{ fontSize: 8, color: colors.white }}>{scan.links.internal} intern</Text></View>
                                <View style={[styles.pill, { backgroundColor: (scan.links.broken?.length ?? 0) > 0 ? colors.error : colors.success }]}><Text style={{ fontSize: 8, color: colors.white }}>{scan.links.broken?.length ?? 0} kaputt</Text></View>
                            </View>
                            {scan.links.broken && scan.links.broken.length > 0 && scan.links.broken.slice(0, 3).map((b, i) => (
                                <View key={i} style={styles.kvInline}><Text style={styles.kvKey}></Text><Text style={styles.kvVal}>{b.url?.slice(0, 45)}… {b.statusCode}</Text></View>
                            ))}
                        </>
                    )}
                </View>
            </React.Fragment>
        );
    }

    if (scan.geo || scan.privacy || scan.security || scan.technicalInsights) {
        page3Sections.push(
            <React.Fragment key="infra">
                <SectionHeader title="Infrastruktur &amp; Privacy" chapter="infra" />
                <View style={[styles.cardBox, { borderLeftColor: chapterColors.infra.main, padding: 8, marginBottom: 6 }]}>
                    {scan.geo && (
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: chapterColors.infra.main }]}><Text style={{ fontSize: 7, color: colors.white }}>{scan.geo.location?.country ?? '–'}</Text></View>
                            <View style={[styles.pill, { backgroundColor: colors.gray500 }]}><Text style={{ fontSize: 7, color: colors.white }}>CDN: {scan.geo.cdn?.provider ?? '–'}</Text></View>
                            <View style={[styles.pill, { backgroundColor: colors.gray500 }]}><Text style={{ fontSize: 7, color: colors.white }}>lang: {scan.geo.languages?.htmlLang ?? '–'}</Text></View>
                        </View>
                    )}
                    {scan.privacy && (
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: scan.privacy.hasPrivacyPolicy ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>Datenschutz {scan.privacy.hasPrivacyPolicy ? '✓' : '–'}</Text></View>
                            <View style={[styles.pill, { backgroundColor: scan.privacy.hasCookieBanner ? colors.warning : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>Cookie-Banner {scan.privacy.hasCookieBanner ? '✓' : '–'}</Text></View>
                        </View>
                    )}
                    {scan.security && (
                        <View style={styles.pillRow}>
                            <View style={[styles.pill, { backgroundColor: scan.security.contentSecurityPolicy?.present ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>CSP</Text></View>
                            <View style={[styles.pill, { backgroundColor: scan.security.xFrameOptions?.present ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>X-Frame</Text></View>
                            <View style={[styles.pill, { backgroundColor: scan.security.strictTransportSecurity?.present ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>HSTS</Text></View>
                        </View>
                    )}
                    {scan.technicalInsights && (
                        <View style={styles.kvInline}>
                            <Text style={styles.kvKey}>Manifest / Theme / Apple</Text>
                            <Text style={styles.kvVal}>{scan.technicalInsights.manifest?.present ? 'Ja' : 'Nein'} · {scan.technicalInsights.themeColor ?? '-'} · {scan.technicalInsights.appleTouchIcon ? 'Ja' : 'Nein'}</Text>
                        </View>
                    )}
                </View>
            </React.Fragment>
        );
    }

    if (scan.generative) {
        const g = scan.generative;
        page3Sections.push(
            <React.Fragment key="generative">
                <SectionHeader title="Generative Search (GEO)" chapter="geo" />
                <View style={[styles.cardBox, { borderLeftColor: chapterColors.geo.main, padding: 8, marginBottom: 6 }]}>
                    <View style={styles.pillRow}>
                        <View style={[styles.pill, { backgroundColor: chapterColors.geo.main }]}><Text style={{ fontSize: 8, color: colors.white }}>Score {g.score}</Text></View>
                        <View style={[styles.pill, { backgroundColor: g.technical?.hasLlmsTxt ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>llms.txt</Text></View>
                        <View style={[styles.pill, { backgroundColor: g.technical?.hasRobotsAllowingAI ? colors.success : colors.gray400 }]}><Text style={{ fontSize: 7, color: colors.white }}>Robots AI</Text></View>
                        <View style={[styles.pill, { backgroundColor: colors.gray500 }]}><Text style={{ fontSize: 7, color: colors.white }}>FAQ: {g.content?.faqCount ?? 0}</Text></View>
                        <View style={[styles.pill, { backgroundColor: colors.gray500 }]}><Text style={{ fontSize: 7, color: colors.white }}>Autor {g.expertise?.hasAuthorBio ? '✓' : '–'}</Text></View>
                    </View>
                    {g.technical?.schemaCoverage?.length ? (
                        <View style={styles.kvInline}><Text style={styles.kvKey}>Schema</Text><Text style={styles.kvVal}>{g.technical.schemaCoverage.join(', ')}</Text></View>
                    ) : null}
                </View>
            </React.Fragment>
        );
    }

    allContent.push(<React.Fragment key="page3">{page3Sections}</React.Fragment>);

    const totalPages = allContent.length;
    const documentPages = allContent.map((content, index) => (
        <Page key={index} size="A4" style={styles.page}>
            <PdfHeader />
            {content}
            <PdfFooter pageNumber={index + 1} totalPages={totalPages} />
        </Page>
    ));

    return <Document>{documentPages}</Document>;
}
