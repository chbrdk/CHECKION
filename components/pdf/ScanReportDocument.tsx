'use client';

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { ScanResult } from '@/lib/types';

/* DIN A4: 595.28 x 841.89 pt. Margins for print. */
const MARGIN = 40;
const HEADER_HEIGHT = 32;

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
};

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
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: HEADER_HEIGHT,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    logo: {
        fontSize: 14,
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
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.gray900,
        marginTop: 14,
        marginBottom: 8,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    subsectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.gray700,
        marginTop: 10,
        marginBottom: 4,
    },
    bodyText: {
        fontSize: 9,
        color: colors.gray700,
        marginBottom: 4,
        lineHeight: 1.4,
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
        borderRadius: 4,
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
    issueRow: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingBottom: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.gray100,
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
        marginBottom: 1,
    },
    issueSelector: {
        fontSize: 7,
        color: colors.gray400,
        fontFamily: 'Courier',
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 3,
        paddingLeft: 8,
    },
    bulletDot: {
        width: 4,
        marginRight: 6,
        marginTop: 5,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gray500,
    },
    tableRow: {
        flexDirection: 'row',
        marginBottom: 2,
        fontSize: 8,
    },
    tableLabel: {
        width: 120,
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
        marginBottom: 8,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: colors.gray200,
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
});

function PdfHeader() {
    return (
        <View style={styles.header} fixed>
            <Text style={styles.logo}>CHECKION</Text>
        </View>
    );
}

function PdfFooter({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
    return (
        <View style={styles.footer} fixed>
            <Text>Accessibility & UX Audit Report</Text>
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

interface ScanReportProps {
    scan: ScanResult;
}

export function ScanReportDocument({ scan }: ScanReportProps) {
    const pages: React.ReactNode[] = [];
    let pageNum = 0;

    const addPage = (content: React.ReactNode) => {
        pageNum += 1;
        pages.push(
            <Page key={pageNum} size="A4" style={styles.page}>
                <PdfHeader />
                {content}
                <PdfFooter pageNumber={pageNum} totalPages={0} />
            </Page>
        );
    };

    // We'll build pages and set total at end; for fixed footer we need total. So we build content first then wrap in Document with correct total.
    const allContent: React.ReactNode[] = [];

    // —— Page 1: Deckblatt & Übersicht ——
    allContent.push(
        <React.Fragment key="p1">
            <Text style={{ fontSize: 8, color: colors.gray500, marginBottom: 4, textTransform: 'uppercase' }}>
                Accessibility & UX Audit Report
            </Text>
            <Text style={styles.url}>{scan.url}</Text>
            <View style={styles.metaText}>
                <Text style={styles.metaText}>Scan-ID: {scan.id.slice(0, 8)}</Text>
                <Text style={styles.metaText}>Datum: {new Date(scan.timestamp).toLocaleDateString('de-DE')}</Text>
                <Text style={styles.metaText}>Standard: {scan.standard} · Gerät: {scan.device ?? 'Desktop'}</Text>
            </View>
            <View style={styles.scoreRow}>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>{scan.score}/100</Text>
                    <Text style={styles.scoreLabel}>Checkion Score</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={[styles.scoreValue, { color: SeverityColor.error }]}>{scan.stats.errors}</Text>
                    <Text style={[styles.scoreLabel, { color: SeverityColor.error }]}>Fehler</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={[styles.scoreValue, { color: SeverityColor.warning }]}>{scan.stats.warnings}</Text>
                    <Text style={[styles.scoreLabel, { color: SeverityColor.warning }]}>Warnungen</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreValue}>{scan.stats.notices}</Text>
                    <Text style={styles.scoreLabel}>Hinweise</Text>
                </View>
                {scan.ux != null && (
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{scan.ux.cls != null ? scan.ux.cls.toFixed(2) : '–'}</Text>
                        <Text style={styles.scoreLabel}>CLS</Text>
                    </View>
                )}
                {scan.eco != null && (
                    <View style={styles.scoreItem}>
                        <Text style={styles.scoreValue}>{scan.eco.grade}</Text>
                        <Text style={styles.scoreLabel}>Eco Grade</Text>
                    </View>
                )}
            </View>
            {scan.performance && (
                <>
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
                </>
            )}
        </React.Fragment>
    );

    // —— Liste & Details (Issues) ——
    allContent.push(
        <React.Fragment key="issues">
            <Text style={styles.sectionTitle}>Liste & Details – Gefundene Issues</Text>
            {scan.issues.length === 0 ? (
                <Text style={styles.bodyText}>Keine Issues gefunden.</Text>
            ) : (
                scan.issues.slice(0, 25).map((issue, idx) => (
                    <View key={idx} style={styles.issueRow}>
                        <Text style={[styles.issueSeverity, { color: SeverityColor[issue.type] ?? colors.gray700 }]}>
                            {issue.type.toUpperCase()}
                        </Text>
                        <View style={styles.issueContent}>
                            <Text style={styles.issueMessage}>{issue.message}</Text>
                            <Text style={styles.issueSelector}>{issue.selector}</Text>
                        </View>
                    </View>
                ))
            )}
            {scan.issues.length > 25 && (
                <Text style={[styles.metaText, { marginTop: 6, fontStyle: 'italic' }]}>
                    + {scan.issues.length - 25} weitere Issues (siehe Web-Report).
                </Text>
            )}
        </React.Fragment>
    );

    // —— UX/CX Check (LLM Summary) ——
    if (scan.llmSummary) {
        allContent.push(
            <React.Fragment key="summary">
                <Text style={styles.sectionTitle}>UX/CX Check</Text>
                {scan.llmSummary.overallGrade && (
                    <Text style={[styles.bodyText, { marginBottom: 6 }]}>Gesamtnote: {scan.llmSummary.overallGrade}</Text>
                )}
                <Text style={styles.bodyText}>{scan.llmSummary.summary}</Text>
                {scan.llmSummary.themes && scan.llmSummary.themes.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Themen</Text>
                        {scan.llmSummary.themes.map((t, i) => (
                            <View key={i} style={styles.bulletItem}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bodyText}>
                                    {t.name}
                                    {t.severity ? ` (${t.severity})` : ''}
                                    {t.description ? ` – ${t.description}` : ''}
                                </Text>
                            </View>
                        ))}
                    </>
                )}
                {scan.llmSummary.recommendations && scan.llmSummary.recommendations.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Empfehlungen</Text>
                        {scan.llmSummary.recommendations.slice(0, 10).map((r, i) => (
                            <View key={i} style={styles.recommendationRow}>
                                <Text style={styles.recommendationTitle}>P{r.priority}: {r.title}</Text>
                                <Text style={styles.recommendationDesc}>{r.description}</Text>
                            </View>
                        ))}
                        {scan.llmSummary.recommendations.length > 10 && (
                            <Text style={styles.metaText}>+ {scan.llmSummary.recommendations.length - 10} weitere Empfehlungen.</Text>
                        )}
                    </>
                )}
                <Text style={[styles.metaText, { marginTop: 8 }]}>
                    Generiert mit {scan.llmSummary.modelUsed} am{' '}
                    {new Date(scan.llmSummary.generatedAt).toLocaleString('de-DE')}.
                </Text>
            </React.Fragment>
        );
    }

    // —— Visuelle Analyse (Focus Order, Tap Targets) ——
    if (scan.ux && (scan.ux.focusOrder?.length || scan.ux.tapTargets?.details?.length)) {
        allContent.push(
            <React.Fragment key="visual">
                <Text style={styles.sectionTitle}>Visuelle Analyse</Text>
                {scan.ux.focusOrder && scan.ux.focusOrder.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Fokusreihenfolge (Auszug)</Text>
                        {scan.ux.focusOrder.slice(0, 15).map((item, i) => (
                            <View key={i} style={styles.bulletItem}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bodyText}>
                                    {item.index}. {item.text || '(ohne Text)'} [{item.role}]
                                </Text>
                            </View>
                        ))}
                        {scan.ux.focusOrder.length > 15 && (
                            <Text style={styles.metaText}>+ {scan.ux.focusOrder.length - 15} weitere Elemente.</Text>
                        )}
                    </>
                )}
                {scan.ux.tapTargets?.details && scan.ux.tapTargets.details.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Touch Targets (&lt; 44×44 px)</Text>
                        {scan.ux.tapTargets.details.slice(0, 10).map((t, i) => (
                            <View key={i} style={styles.bulletItem}>
                                <View style={styles.bulletDot} />
                                <Text style={styles.bodyText}>
                                    {t.element} {t.text ? `"${t.text}"` : ''} – {t.size?.width ?? 0}×{t.size?.height ?? 0} px
                                </Text>
                            </View>
                        ))}
                        {scan.ux.tapTargets.details.length > 10 && (
                            <Text style={styles.metaText}>+ {scan.ux.tapTargets.details.length - 10} weitere.</Text>
                        )}
                    </>
                )}
            </React.Fragment>
        );
    }

    // —— UX Audit (Details) ——
    if (scan.ux) {
        const ux = scan.ux;
        allContent.push(
            <React.Fragment key="ux">
                <Text style={styles.sectionTitle}>UX Audit</Text>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Mobile Friendly</Text>
                    <Text style={styles.tableValue}>{ux.viewport?.isMobileFriendly ? 'Ja' : 'Nein'}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Readability</Text>
                    <Text style={styles.tableValue}>
                        {ux.readability?.grade ?? '–'} (Score: {ux.readability?.score ?? '–'})
                    </Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Console-Fehler</Text>
                    <Text style={styles.tableValue}>{ux.consoleErrors?.length ?? 0}</Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Kaputte Links</Text>
                    <Text style={styles.tableValue}>{ux.brokenLinks?.length ?? 0}</Text>
                </View>
                {ux.hasSkipLink != null && (
                    <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Skip-Link</Text>
                        <Text style={styles.tableValue}>{ux.hasSkipLink ? 'Vorhanden' : 'Fehlt'}</Text>
                    </View>
                )}
                {ux.reducedMotionInCss != null && (
                    <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Reduced Motion (CSS)</Text>
                        <Text style={styles.tableValue}>{ux.reducedMotionInCss ? 'Ja' : 'Nein'}</Text>
                    </View>
                )}
                {ux.brokenLinks && ux.brokenLinks.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Kaputte Links (Auszug)</Text>
                        {ux.brokenLinks.slice(0, 5).map((l, i) => (
                            <Text key={i} style={styles.bodyText}>
                                {l.href} → {l.status} {l.text ? `(${l.text})` : ''}
                            </Text>
                        ))}
                    </>
                )}
            </React.Fragment>
        );
    }

    // —— Struktur & Semantik ——
    if (scan.ux?.headingHierarchy) {
        const h = scan.ux.headingHierarchy;
        allContent.push(
            <React.Fragment key="structure">
                <Text style={styles.sectionTitle}>Struktur & Semantik</Text>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Eine H1</Text>
                    <Text style={styles.tableValue}>{h.hasSingleH1 ? 'Ja' : `Nein (${h.h1Count} H1)`}</Text>
                </View>
                {h.skippedLevels.length > 0 && (
                    <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Übersprungene Level</Text>
                        <Text style={styles.tableValue}>
                            {h.skippedLevels.map((s) => `H${s.from}→H${s.to}`).join(', ')}
                        </Text>
                    </View>
                )}
                {h.outline && h.outline.length > 0 && (
                    <>
                        <Text style={styles.subsectionTitle}>Überschriften-Gliederung</Text>
                        {h.outline.slice(0, 30).map((item, i) => (
                            <View key={i} style={[styles.outlineItem, { paddingLeft: 8 + (item.level - 1) * 10 }]}>
                                <Text style={styles.outlineLevel}>H{item.level}</Text>
                                <Text style={styles.outlineText}>{item.text || '(leer)'}</Text>
                            </View>
                        ))}
                        {h.outline.length > 30 && (
                            <Text style={styles.metaText}>+ {h.outline.length - 30} weitere Überschriften.</Text>
                        )}
                    </>
                )}
            </React.Fragment>
        );
    }

    // —— Links & SEO ——
    if (scan.seo || scan.links) {
        allContent.push(
            <React.Fragment key="seo">
                <Text style={styles.sectionTitle}>Links & SEO</Text>
                {scan.seo && (
                    <>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Title</Text>
                            <Text style={styles.tableValue}>{scan.seo.title ?? '–'}</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Meta Description</Text>
                            <Text style={styles.tableValue}>{(scan.seo.metaDescription ?? '–').slice(0, 80)}…</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>H1</Text>
                            <Text style={styles.tableValue}>{scan.seo.h1 ?? '–'}</Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Canonical / OG</Text>
                            <Text style={styles.tableValue}>
                                {scan.seo.canonical ?? '–'} / {scan.seo.ogTitle ? 'vorhanden' : '–'}
                            </Text>
                        </View>
                        {scan.seo.keywordAnalysis && (
                            <>
                                <Text style={styles.subsectionTitle}>Keywords (Top)</Text>
                                {scan.seo.keywordAnalysis.topKeywords?.slice(0, 8).map((k, i) => (
                                    <Text key={i} style={styles.bodyText}>
                                        {k.keyword}: {k.count}× ({k.densityPercent.toFixed(2)} %)
                                    </Text>
                                ))}
                            </>
                        )}
                    </>
                )}
                {scan.links && (
                    <>
                        <Text style={styles.subsectionTitle}>Link-Audit</Text>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Gesamt / Intern / Extern</Text>
                            <Text style={styles.tableValue}>
                                {scan.links.total} / {scan.links.internal} / {scan.links.external}
                            </Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Kaputte Links</Text>
                            <Text style={styles.tableValue}>{scan.links.broken?.length ?? 0}</Text>
                        </View>
                        {scan.links.broken && scan.links.broken.length > 0 && (
                            <>
                                {scan.links.broken.slice(0, 5).map((b, i) => (
                                    <Text key={i} style={styles.bodyText}>
                                        {b.url} → {b.statusCode}
                                    </Text>
                                ))}
                            </>
                        )}
                    </>
                )}
            </React.Fragment>
        );
    }

    // —— Infrastruktur & Privacy ——
    if (scan.geo || scan.privacy || scan.security || scan.technicalInsights) {
        allContent.push(
            <React.Fragment key="infra">
                <Text style={styles.sectionTitle}>Infrastruktur & Privacy</Text>
                {scan.geo && (
                    <>
                        <Text style={styles.subsectionTitle}>Geo / CDN</Text>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Server-IP / CDN</Text>
                            <Text style={styles.tableValue}>
                                {scan.geo.serverIp ?? '–'} / {scan.geo.cdn?.provider ?? '–'}
                            </Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Standort</Text>
                            <Text style={styles.tableValue}>
                                {scan.geo.location?.city ?? '–'}, {scan.geo.location?.country ?? '–'}
                            </Text>
                        </View>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>html lang / hreflang</Text>
                            <Text style={styles.tableValue}>
                                {scan.geo.languages?.htmlLang ?? '–'} / {scan.geo.languages?.hreflangs?.length ?? 0} hreflang(s)
                            </Text>
                        </View>
                    </>
                )}
                {scan.privacy && (
                    <>
                        <Text style={styles.subsectionTitle}>Privacy</Text>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Datenschutz / Cookie-Banner / AGB</Text>
                            <Text style={styles.tableValue}>
                                {scan.privacy.hasPrivacyPolicy ? 'Ja' : 'Nein'} /{' '}
                                {scan.privacy.hasCookieBanner ? 'Ja' : 'Nein'} /{' '}
                                {scan.privacy.hasTermsOfService ? 'Ja' : 'Nein'}
                            </Text>
                        </View>
                    </>
                )}
                {scan.security && (
                    <>
                        <Text style={styles.subsectionTitle}>Security-Header</Text>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>CSP / X-Frame-Options / HSTS</Text>
                            <Text style={styles.tableValue}>
                                {scan.security.contentSecurityPolicy?.present ? 'Ja' : 'Nein'} /{' '}
                                {scan.security.xFrameOptions?.present ? 'Ja' : 'Nein'} /{' '}
                                {scan.security.strictTransportSecurity?.present ? 'Ja' : 'Nein'}
                            </Text>
                        </View>
                    </>
                )}
                {scan.technicalInsights && (
                    <>
                        <Text style={styles.subsectionTitle}>Technik</Text>
                        <View style={styles.tableRow}>
                            <Text style={styles.tableLabel}>Manifest / Theme-Color / Apple Touch Icon</Text>
                            <Text style={styles.tableValue}>
                                {scan.technicalInsights.manifest?.present ? 'Ja' : 'Nein'} /{' '}
                                {scan.technicalInsights.themeColor ?? '–'} /{' '}
                                {scan.technicalInsights.appleTouchIcon ? 'Ja' : 'Nein'}
                            </Text>
                        </View>
                        {(scan.technicalInsights.thirdPartyDomains?.length ?? 0) > 0 && (
                            <Text style={styles.bodyText}>
                                Third-Party-Domains: {scan.technicalInsights.thirdPartyDomains?.slice(0, 5).join(', ')}
                                {(scan.technicalInsights.thirdPartyDomains?.length ?? 0) > 5 ? ' …' : ''}
                            </Text>
                        )}
                    </>
                )}
            </React.Fragment>
        );
    }

    // —— Generative Search (GEO) ——
    if (scan.generative) {
        const g = scan.generative;
        allContent.push(
            <React.Fragment key="generative">
                <Text style={styles.sectionTitle}>Generative Search (GEO)</Text>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>GEO Score</Text>
                    <Text style={styles.tableValue}>{g.score}</Text>
                </View>
                <Text style={styles.subsectionTitle}>Technisch</Text>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>llms.txt / Robots (AI)</Text>
                    <Text style={styles.tableValue}>
                        {g.technical?.hasLlmsTxt ? 'Ja' : 'Nein'} / {g.technical?.hasRobotsAllowingAI ? 'Ja' : 'Nein'}
                    </Text>
                </View>
                {g.technical?.schemaCoverage?.length ? (
                    <View style={styles.tableRow}>
                        <Text style={styles.tableLabel}>Schema-Typen</Text>
                        <Text style={styles.tableValue}>{g.technical.schemaCoverage.join(', ')}</Text>
                    </View>
                ) : null}
                {g.technical?.recommendedSchemaTypesFound?.length ? (
                    <Text style={styles.bodyText}>
                        Empfohlene Schema-Typen: {g.technical.recommendedSchemaTypesFound.join(', ')}
                    </Text>
                ) : null}
                <Text style={styles.subsectionTitle}>Content / Expertise</Text>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>FAQ / Tabellen / Listen / Zitate</Text>
                    <Text style={styles.tableValue}>
                        {g.content?.faqCount ?? 0} / {g.content?.tableCount ?? 0} / {g.content?.listDensity ?? 0} / {g.content?.citationDensity ?? 0}
                    </Text>
                </View>
                <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Autor / Experten-Zitate</Text>
                    <Text style={styles.tableValue}>
                        {g.expertise?.hasAuthorBio ? 'Ja' : 'Nein'} / {g.expertise?.hasExpertCitations ? 'Ja' : 'Nein'}
                    </Text>
                </View>
            </React.Fragment>
        );
    }

    // Split content into pages: we approximate ~40 lines per page (with section titles and spacing). Simple approach: one section per page to keep it clean.
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
