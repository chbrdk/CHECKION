'use client';

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import type { ScanResult } from '@/lib/types';
import { isUxCheckV2Summary } from '@/lib/ux-check-types';
import { pdfColors, pdfChapterColors, pdfStyles } from '@/components/pdf/shared/pdf-styles';
import { scanPdfStyles, scanSeverityColors } from '@/components/pdf/shared/pdf-scan-styles';
import { PdfSectionHeader } from '@/components/pdf/shared/PdfPrimitives';

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
    return (
        <View style={[scanPdfStyles.pill, { backgroundColor: color }]}>
            <Text style={scanPdfStyles.pillText}>{children}</Text>
        </View>
    );
}

export function buildScanPage2Content(scan: ScanResult): React.ReactNode {
    const sections: React.ReactNode[] = [];

    sections.push(
        <React.Fragment key="issues">
            <PdfSectionHeader title="Liste &amp; Details – Issues" chapter="issues" />
            {scan.issues.length === 0 ? (
                <Text style={pdfStyles.bodyText}>Keine Issues.</Text>
            ) : (
                <>
                    <View style={scanPdfStyles.pillRow}>
                        <Pill color={pdfColors.error}>{scan.stats.errors} Fehler</Pill>
                        <Pill color={pdfColors.warning}>{scan.stats.warnings} Warnungen</Pill>
                        <Pill color={pdfColors.notice}>{scan.stats.notices} Hinweise</Pill>
                    </View>
                    {scan.issues.slice(0, 12).map((issue, idx) => (
                        <View
                            key={idx}
                            style={[
                                scanPdfStyles.issueRow,
                                {
                                    borderLeftWidth: 3,
                                    borderLeftColor:
                                        scanSeverityColors[issue.type] ?? pdfColors.gray400,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    scanPdfStyles.issueSeverity,
                                    {
                                        color:
                                            scanSeverityColors[issue.type] ?? pdfColors.gray700,
                                    },
                                ]}
                            >
                                {issue.type.toUpperCase()}
                            </Text>
                            <View style={scanPdfStyles.issueContent}>
                                <Text style={scanPdfStyles.issueMessage}>{issue.message}</Text>
                            </View>
                        </View>
                    ))}
                    {scan.issues.length > 12 && (
                        <Text style={[pdfStyles.metaText, { fontStyle: 'italic' }]}>
                            + {scan.issues.length - 12} weitere (Web-Report).
                        </Text>
                    )}
                </>
            )}
        </React.Fragment>
    );

    if (scan.llmSummary) {
        const llm = scan.llmSummary;
        if (isUxCheckV2Summary(llm)) {
            const s = llm.structured;
            const summaryText =
                typeof llm.reportMarkdown === 'string' && llm.reportMarkdown
                    ? llm.reportMarkdown.slice(0, 280) +
                      (llm.reportMarkdown.length > 280 ? '…' : '')
                    : (s.header?.seitenTitel ?? 'UX-Analyse') +
                      (s.positiveAspects.length
                          ? ` — ${s.positiveAspects.slice(0, 2).join('; ')}`
                          : '');
            sections.push(
                <React.Fragment key="summary">
                    <PdfSectionHeader title="UX/CX Check" chapter="summary" />
                    {s.header?.url ? (
                        <View style={scanPdfStyles.pillRow}>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    { backgroundColor: pdfChapterColors.summary.main },
                                ]}
                            >
                                <Text style={scanPdfStyles.pillText}>
                                    {String(s.header.url).slice(0, 30)}…
                                </Text>
                            </View>
                        </View>
                    ) : null}
                    <Text style={[pdfStyles.bodyText, { marginBottom: 6 }]}>
                        {summaryText.slice(0, 280)}
                        {summaryText.length > 280 ? '…' : ''}
                    </Text>
                    {s.recommendations && s.recommendations.length > 0 && (
                        <>
                            <Text style={pdfStyles.subsectionTitle}>Empfehlungen (Auszug)</Text>
                            {s.recommendations.slice(0, 4).map((r, i) => (
                                <View
                                    key={i}
                                    style={[
                                        pdfStyles.recommendationRow,
                                        {
                                            marginBottom: 4,
                                            paddingVertical: 4,
                                            borderLeftWidth: 3,
                                            borderLeftColor: pdfChapterColors.summary.main,
                                            backgroundColor: pdfChapterColors.summary.bg,
                                        },
                                    ]}
                                >
                                    <Text style={pdfStyles.recommendationTitle}>
                                        {i + 1}. {r}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                </React.Fragment>
            );
        } else {
            const legacy = llm as {
                overallGrade?: string;
                summary?: string;
                recommendations?: Array<{ priority: number; title: string }>;
            };
            sections.push(
                <React.Fragment key="summary">
                    <PdfSectionHeader title="UX/CX Check" chapter="summary" />
                    {legacy.overallGrade && (
                        <View style={scanPdfStyles.pillRow}>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    { backgroundColor: pdfChapterColors.summary.main },
                                ]}
                            >
                                <Text style={scanPdfStyles.pillText}>
                                    Note: {legacy.overallGrade}
                                </Text>
                            </View>
                        </View>
                    )}
                    <Text style={[pdfStyles.bodyText, { marginBottom: 6 }]}>
                        {legacy.summary?.slice(0, 280) ?? ''}
                        {(legacy.summary?.length ?? 0) > 280 ? '…' : ''}
                    </Text>
                    {legacy.recommendations && legacy.recommendations.length > 0 && (
                        <>
                            <Text style={pdfStyles.subsectionTitle}>Empfehlungen (Auszug)</Text>
                            {legacy.recommendations.slice(0, 4).map((r, i) => (
                                <View
                                    key={i}
                                    style={[
                                        pdfStyles.recommendationRow,
                                        {
                                            marginBottom: 4,
                                            paddingVertical: 4,
                                            borderLeftWidth: 3,
                                            borderLeftColor: pdfChapterColors.summary.main,
                                            backgroundColor: pdfChapterColors.summary.bg,
                                        },
                                    ]}
                                >
                                    <Text style={pdfStyles.recommendationTitle}>
                                        P{r.priority}: {r.title}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                </React.Fragment>
            );
        }
    }

    if (scan.ux && (scan.ux.focusOrder?.length || scan.ux.tapTargets?.details?.length)) {
        sections.push(
            <React.Fragment key="visual">
                <PdfSectionHeader title="Visuelle Analyse" chapter="visual" />
                {scan.ux.focusOrder && scan.ux.focusOrder.length > 0 && (
                    <>
                        <Text style={pdfStyles.subsectionTitle}>Fokus (Auszug)</Text>
                        <View style={scanPdfStyles.pillRow}>
                            {scan.ux.focusOrder.slice(0, 6).map((item, i) => (
                                <View
                                    key={i}
                                    style={[
                                        scanPdfStyles.pill,
                                        { backgroundColor: pdfChapterColors.visual.main },
                                    ]}
                                >
                                    <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                        {item.index}. {(item.text || '?').slice(0, 12)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}
                {scan.ux.tapTargets?.details && scan.ux.tapTargets.details.length > 0 && (
                    <View style={scanPdfStyles.kvInline}>
                        <Text style={scanPdfStyles.kvKey}>Touch &lt;44px:</Text>
                        <Text style={scanPdfStyles.kvVal}>
                            {scan.ux.tapTargets.details.length} betroffen
                        </Text>
                    </View>
                )}
            </React.Fragment>
        );
    }

    if (scan.ux) {
        const ux = scan.ux;
        sections.push(
            <React.Fragment key="ux">
                <PdfSectionHeader title="UX Audit" chapter="ux" />
                <View
                    style={[
                        pdfStyles.cardBox,
                        {
                            borderLeftWidth: 4,
                            borderLeftColor: pdfChapterColors.ux.main,
                            padding: 8,
                            marginBottom: 6,
                        },
                    ]}
                >
                    <View style={scanPdfStyles.pillRow}>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                {
                                    backgroundColor: ux.viewport?.isMobileFriendly
                                        ? pdfColors.success
                                        : pdfColors.error,
                                },
                            ]}
                        >
                            <Text style={scanPdfStyles.pillText}>
                                Mobile {ux.viewport?.isMobileFriendly ? 'Y' : 'N'}
                            </Text>
                        </View>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                { backgroundColor: pdfChapterColors.ux.main },
                            ]}
                        >
                            <Text style={scanPdfStyles.pillText}>
                                Readability {ux.readability?.grade ?? '-'}
                            </Text>
                        </View>
                        <View
                            style={[scanPdfStyles.pill, { backgroundColor: pdfColors.gray500 }]}
                        >
                            <Text style={scanPdfStyles.pillText}>
                                Console: {ux.consoleErrors?.length ?? 0}
                            </Text>
                        </View>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                {
                                    backgroundColor:
                                        (ux.brokenLinks?.length ?? 0) > 0
                                            ? pdfColors.error
                                            : pdfColors.success,
                                },
                            ]}
                        >
                            <Text style={scanPdfStyles.pillText}>
                                Links: {ux.brokenLinks?.length ?? 0}
                            </Text>
                        </View>
                        {ux.hasSkipLink != null ? (
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: ux.hasSkipLink
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={scanPdfStyles.pillText}>
                                    Skip {ux.hasSkipLink ? 'Y' : 'n'}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    {ux.brokenLinks && ux.brokenLinks.length > 0
                        ? ux.brokenLinks.slice(0, 3).map((l, i) => (
                              <View key={i} style={scanPdfStyles.kvInline}>
                                  <Text style={scanPdfStyles.kvKey}></Text>
                                  <Text style={scanPdfStyles.kvVal}>
                                      {String(l.href || '').slice(0, 50)}... {l.status}
                                  </Text>
                              </View>
                          ))
                        : null}
                </View>
            </React.Fragment>
        );
    }

    return <>{sections}</>;
}

export function buildScanPage3Content(scan: ScanResult): React.ReactNode {
    const sections: React.ReactNode[] = [];

    if (scan.ux?.headingHierarchy) {
        const h = scan.ux.headingHierarchy;
        sections.push(
            <React.Fragment key="structure">
                <PdfSectionHeader title="Struktur &amp; Semantik" chapter="structure" />
                <View
                    style={[
                        pdfStyles.cardBox,
                        {
                            borderLeftWidth: 4,
                            borderLeftColor: pdfChapterColors.structure.main,
                            padding: 8,
                            marginBottom: 6,
                        },
                    ]}
                >
                    <View style={scanPdfStyles.pillRow}>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                {
                                    backgroundColor: h.hasSingleH1
                                        ? pdfColors.success
                                        : pdfColors.warning,
                                },
                            ]}
                        >
                            <Text style={scanPdfStyles.pillText}>
                                H1: {h.hasSingleH1 ? '1' : h.h1Count}
                            </Text>
                        </View>
                        {h.skippedLevels.length > 0 ? (
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    { backgroundColor: pdfColors.warning },
                                ]}
                            >
                                <Text style={scanPdfStyles.pillText}>
                                    Level{' '}
                                    {h.skippedLevels
                                        .map((s) => 'H' + s.from + '-' + s.to)
                                        .join(', ')}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    {h.outline && h.outline.length > 0 && (
                        <>
                            <Text style={pdfStyles.subsectionTitle}>Gliederung</Text>
                            {h.outline.slice(0, 12).map((item, i) => (
                                <View
                                    key={i}
                                    style={[
                                        scanPdfStyles.outlineItem,
                                        { paddingLeft: 6 + (item.level - 1) * 8 },
                                    ]}
                                >
                                    <Text style={scanPdfStyles.outlineLevel}>H{item.level}</Text>
                                    <Text style={[scanPdfStyles.outlineText, { fontSize: 8 }]}>
                                        {(item.text || '(leer)').slice(0, 45)}
                                        {(item.text?.length ?? 0) > 45 ? '…' : ''}
                                    </Text>
                                </View>
                            ))}
                            {h.outline.length > 12 && (
                                <Text style={pdfStyles.metaText}>
                                    + {h.outline.length - 12} weitere
                                </Text>
                            )}
                        </>
                    )}
                </View>
            </React.Fragment>
        );
    }

    if (scan.seo || scan.links) {
        sections.push(
            <React.Fragment key="seo">
                <PdfSectionHeader title="Links &amp; SEO" chapter="seo" />
                <View
                    style={[
                        pdfStyles.cardBox,
                        {
                            borderLeftWidth: 4,
                            borderLeftColor: pdfChapterColors.seo.main,
                            padding: 8,
                            marginBottom: 6,
                        },
                    ]}
                >
                    {scan.seo && (
                        <>
                            <View style={scanPdfStyles.kvInline}>
                                <Text style={scanPdfStyles.kvKey}>Title</Text>
                                <Text style={scanPdfStyles.kvVal}>
                                    {(scan.seo.title ?? '–').slice(0, 55)}
                                </Text>
                            </View>
                            <View style={scanPdfStyles.kvInline}>
                                <Text style={scanPdfStyles.kvKey}>Meta</Text>
                                <Text style={scanPdfStyles.kvVal}>
                                    {(scan.seo.metaDescription ?? '–').slice(0, 50)}…
                                </Text>
                            </View>
                            <View style={scanPdfStyles.kvInline}>
                                <Text style={scanPdfStyles.kvKey}>H1</Text>
                                <Text style={scanPdfStyles.kvVal}>
                                    {(scan.seo.h1 ?? '–').slice(0, 40)}
                                </Text>
                            </View>
                            {scan.seo.keywordAnalysis?.topKeywords?.length ? (
                                <View style={scanPdfStyles.pillRow}>
                                    {scan.seo.keywordAnalysis.topKeywords
                                        .slice(0, 5)
                                        .map((k, i) => (
                                            <View
                                                key={i}
                                                style={[
                                                    scanPdfStyles.pill,
                                                    {
                                                        backgroundColor:
                                                            pdfChapterColors.seo.main,
                                                    },
                                                ]}
                                            >
                                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                                    {k.keyword} {k.densityPercent.toFixed(1)}%
                                                </Text>
                                            </View>
                                        ))}
                                </View>
                            ) : null}
                            {scan.seo.jsonLdRichResultGaps &&
                            scan.seo.jsonLdRichResultGaps.length > 0 ? (
                                <>
                                    <Text style={pdfStyles.subsectionTitle}>
                                        JSON-LD rich result gaps
                                    </Text>
                                    {scan.seo.jsonLdRichResultGaps.slice(0, 6).map((g, i) => (
                                        <View key={i} style={scanPdfStyles.kvInline}>
                                            <Text style={scanPdfStyles.kvKey}>{g.schemaType}</Text>
                                            <Text style={scanPdfStyles.kvVal}>
                                                {g.missing.join(', ')}
                                            </Text>
                                        </View>
                                    ))}
                                </>
                            ) : null}
                        </>
                    )}
                    {scan.links && (
                        <>
                            <View style={scanPdfStyles.pillRow}>
                                <View
                                    style={[
                                        scanPdfStyles.pill,
                                        { backgroundColor: pdfChapterColors.seo.main },
                                    ]}
                                >
                                    <Text style={scanPdfStyles.pillText}>
                                        {scan.links.total} Links
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        scanPdfStyles.pill,
                                        { backgroundColor: pdfColors.gray500 },
                                    ]}
                                >
                                    <Text style={scanPdfStyles.pillText}>
                                        {scan.links.internal} intern
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        scanPdfStyles.pill,
                                        {
                                            backgroundColor:
                                                (scan.links.broken?.length ?? 0) > 0
                                                    ? pdfColors.error
                                                    : pdfColors.success,
                                        },
                                    ]}
                                >
                                    <Text style={scanPdfStyles.pillText}>
                                        {scan.links.broken?.length ?? 0} kaputt
                                    </Text>
                                </View>
                            </View>
                            {scan.links.broken &&
                                scan.links.broken.length > 0 &&
                                scan.links.broken.slice(0, 3).map((b, i) => (
                                    <View key={i} style={scanPdfStyles.kvInline}>
                                        <Text style={scanPdfStyles.kvKey}></Text>
                                        <Text style={scanPdfStyles.kvVal}>
                                            {b.url?.slice(0, 45)}… {b.statusCode}
                                        </Text>
                                    </View>
                                ))}
                        </>
                    )}
                </View>
            </React.Fragment>
        );
    }

    if (scan.geo || scan.privacy || scan.security || scan.technicalInsights) {
        sections.push(
            <React.Fragment key="infra">
                <PdfSectionHeader title="Infrastruktur &amp; Privacy" chapter="infra" />
                <View
                    style={[
                        pdfStyles.cardBox,
                        {
                            borderLeftWidth: 4,
                            borderLeftColor: pdfChapterColors.infra.main,
                            padding: 8,
                            marginBottom: 6,
                        },
                    ]}
                >
                    {scan.geo && (
                        <View style={scanPdfStyles.pillRow}>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    { backgroundColor: pdfChapterColors.infra.main },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                    {scan.geo.location?.country ?? '–'}
                                </Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    { backgroundColor: pdfColors.gray500 },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                    CDN: {scan.geo.cdn?.provider ?? '–'}
                                </Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    { backgroundColor: pdfColors.gray500 },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                    lang: {scan.geo.languages?.htmlLang ?? '–'}
                                </Text>
                            </View>
                        </View>
                    )}
                    {scan.privacy && (
                        <View style={scanPdfStyles.pillRow}>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.privacy.hasPrivacyPolicy
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                    Datenschutz {scan.privacy.hasPrivacyPolicy ? '✓' : '–'}
                                </Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.privacy.hasCookieBanner
                                            ? pdfColors.warning
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                    Cookie-Banner {scan.privacy.hasCookieBanner ? '✓' : '–'}
                                </Text>
                            </View>
                        </View>
                    )}
                    {scan.consentSignals?.tcfApiPresent ? (
                        <View style={scanPdfStyles.kvInline}>
                            <Text style={scanPdfStyles.kvKey}>Consent (heuristic)</Text>
                            <Text style={scanPdfStyles.kvVal}>TCF API detected</Text>
                        </View>
                    ) : null}
                    {scan.security && (
                        <View style={scanPdfStyles.pillRow}>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.security.contentSecurityPolicy
                                            ?.present
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>CSP</Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.security.xFrameOptions?.present
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>X-Frame</Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.security.strictTransportSecurity
                                            ?.present
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>HSTS</Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.security.permissionsPolicy?.present
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                    Perm-Policy
                                </Text>
                            </View>
                            <View
                                style={[
                                    scanPdfStyles.pill,
                                    {
                                        backgroundColor: scan.security.crossOriginOpenerPolicy
                                            ?.present
                                            ? pdfColors.success
                                            : pdfColors.gray400,
                                    },
                                ]}
                            >
                                <Text style={{ fontSize: 7, color: pdfColors.white }}>COOP</Text>
                            </View>
                        </View>
                    )}
                    {scan.technicalInsights && (
                        <>
                            <View style={scanPdfStyles.kvInline}>
                                <Text style={scanPdfStyles.kvKey}>Manifest / Theme / Apple</Text>
                                <Text style={scanPdfStyles.kvVal}>
                                    {scan.technicalInsights.manifest?.present ? 'Ja' : 'Nein'} ·{' '}
                                    {scan.technicalInsights.themeColor ?? '-'} ·{' '}
                                    {scan.technicalInsights.appleTouchIcon ? 'Ja' : 'Nein'}
                                </Text>
                            </View>
                            {scan.technicalInsights.mainDocumentCache ? (
                                <View style={scanPdfStyles.kvInline}>
                                    <Text style={scanPdfStyles.kvKey}>HTML cache hint</Text>
                                    <Text style={scanPdfStyles.kvVal}>
                                        {scan.technicalInsights.mainDocumentCache.htmlLongCache
                                            ? 'long max-age'
                                            : 'short/typical'}
                                        {scan.technicalInsights.staticAssetCacheWeak
                                            ? ' · static cache weak (heuristic)'
                                            : ''}
                                    </Text>
                                </View>
                            ) : null}
                        </>
                    )}
                </View>
            </React.Fragment>
        );
    }

    if (scan.generative) {
        const g = scan.generative;
        sections.push(
            <React.Fragment key="generative">
                <PdfSectionHeader title="Generative Search (GEO)" chapter="geo" />
                <View
                    style={[
                        pdfStyles.cardBox,
                        {
                            borderLeftWidth: 4,
                            borderLeftColor: pdfChapterColors.geo.main,
                            padding: 8,
                            marginBottom: 6,
                        },
                    ]}
                >
                    <View style={scanPdfStyles.pillRow}>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                { backgroundColor: pdfChapterColors.geo.main },
                            ]}
                        >
                            <Text style={scanPdfStyles.pillText}>Score {g.score}</Text>
                        </View>
                        {g.dimensions ? (
                            <>
                                <View
                                    style={[
                                        scanPdfStyles.pill,
                                        { backgroundColor: pdfColors.gray500 },
                                    ]}
                                >
                                    <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                        D {g.dimensions.discoverability}
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        scanPdfStyles.pill,
                                        { backgroundColor: pdfColors.gray500 },
                                    ]}
                                >
                                    <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                        R {g.dimensions.repurposing}
                                    </Text>
                                </View>
                            </>
                        ) : null}
                        <View
                            style={[
                                scanPdfStyles.pill,
                                {
                                    backgroundColor: g.technical?.hasLlmsTxt
                                        ? pdfColors.success
                                        : pdfColors.gray400,
                                },
                            ]}
                        >
                            <Text style={{ fontSize: 7, color: pdfColors.white }}>llms.txt</Text>
                        </View>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                {
                                    backgroundColor: g.technical?.hasRobotsAllowingAI
                                        ? pdfColors.success
                                        : pdfColors.gray400,
                                },
                            ]}
                        >
                            <Text style={{ fontSize: 7, color: pdfColors.white }}>Robots AI</Text>
                        </View>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                { backgroundColor: pdfColors.gray500 },
                            ]}
                        >
                            <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                FAQ: {g.content?.faqCount ?? 0}
                            </Text>
                        </View>
                        <View
                            style={[
                                scanPdfStyles.pill,
                                { backgroundColor: pdfColors.gray500 },
                            ]}
                        >
                            <Text style={{ fontSize: 7, color: pdfColors.white }}>
                                Autor {g.expertise?.hasAuthorBio ? '✓' : '–'}
                            </Text>
                        </View>
                    </View>
                    {g.technical?.schemaCoverage?.length ? (
                        <View style={scanPdfStyles.kvInline}>
                            <Text style={scanPdfStyles.kvKey}>Schema</Text>
                            <Text style={scanPdfStyles.kvVal}>
                                {g.technical.schemaCoverage.join(', ')}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </React.Fragment>
        );
    }

    return <>{sections}</>;
}
