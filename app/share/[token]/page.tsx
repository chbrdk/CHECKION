'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { ScanResult } from '@/lib/types';

// --- Status colors: sofort erkennen ob optimal oder nicht
const STATUS = {
    good: MSQDX_BRAND_PRIMARY.green,
    warning: MSQDX_STATUS.warning.base,
    error: MSQDX_STATUS.error.base,
    neutral: 'var(--color-text-muted-on-light)',
};

function getScoreColor(score: number): string {
    if (score >= 80) return STATUS.good;
    if (score >= 50) return STATUS.warning;
    return STATUS.error;
}

function getRatioColor(ratio: number): string {
    if (ratio >= 1) return STATUS.good;
    if (ratio >= 0.5) return STATUS.warning;
    return STATUS.error;
}

/** Performance: lower is better. Thresholds (ms) for LCP/TTFB etc. */
function getPerformanceColor(value: number, kind: 'ttfb' | 'fcp' | 'lcp' | 'dom'): string {
    const limits = { ttfb: 800, fcp: 1800, lcp: 2500, dom: 4000 };
    const limit = limits[kind];
    if (value <= limit * 0.6) return STATUS.good;
    if (value <= limit) return STATUS.warning;
    return STATUS.error;
}

const ECO_GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
function getEcoGradeColor(grade: string): string {
    const i = ECO_GRADE_ORDER.indexOf(grade);
    if (i <= 1) return STATUS.good;
    if (i <= 3) return STATUS.warning;
    return STATUS.error;
}

/** CO2 (g): lower is better. Rough: &lt;0.5 good, &lt;1 warning, else error. */
function getEcoCo2Color(co2: number): string {
    if (co2 <= 0.5) return STATUS.good;
    if (co2 <= 1) return STATUS.warning;
    return STATUS.error;
}

/** Circular score ring (0–100) with color. */
function ScoreRing({ score, size = 56, label }: { score: number; size?: number; label?: string }) {
    const color = getScoreColor(score);
    const pct = Math.min(100, Math.max(0, score));
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: `conic-gradient(${color} 0% ${pct}%, ${alpha(color, 0.15)} ${pct}% 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <Box sx={{
                    width: size - 10,
                    height: size - 10,
                    borderRadius: '50%',
                    bgcolor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <MsqdxTypography variant="h6" sx={{ fontWeight: 700, color }}>{Math.round(score)}</MsqdxTypography>
                </Box>
            </Box>
            {label && <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{label}</MsqdxTypography>}
        </Box>
    );
}

/** Horizontal bar: value/total with color. */
function MetricBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? (value / total) * 100 : 0;
    return (
        <Box sx={{ width: '100%', minWidth: 120 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{label}</MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color }}>{value} / {total}</MsqdxTypography>
            </Box>
            <Box sx={{ height: 6, borderRadius: 3, bgcolor: alpha(color, 0.15), overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
            </Box>
        </Box>
    );
}

/** Single metric box with optional status color. */
function MetricBox({ label, value, unit, statusColor }: { label: string; value: number | string; unit?: string; statusColor?: string }) {
    return (
        <Box sx={{
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            bgcolor: statusColor ? alpha(statusColor, 0.08) : 'transparent',
            border: statusColor ? `1px solid ${alpha(statusColor, 0.3)}` : '1px solid transparent',
        }}>
            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, display: 'block' }}>{label}</MsqdxTypography>
            <MsqdxTypography variant="body1" sx={{ fontWeight: 700, color: statusColor || 'inherit' }}>{value}{unit ?? ''}</MsqdxTypography>
        </Box>
    );
}

type SharePayload =
    | { type: 'domain'; data: DomainSummaryResponse }
    | { type: 'single'; data: ScanResult };

export default function ShareLandingPage() {
    const params = useParams();
    const token = params.token as string;
    const [payload, setPayload] = useState<SharePayload | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        fetch(`/api/share/${encodeURIComponent(token)}`)
            .then((res) => {
                if (!res.ok) throw new Error(res.status === 404 ? 'Link ungültig oder abgelaufen' : 'Fehler beim Laden');
                return res.json();
            })
            .then(setPayload)
            .catch((e) => setError(e instanceof Error ? e.message : 'Fehler'));
    }, [token]);

    if (error) {
        return (
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center', bgcolor: '#fff', minHeight: '100vh' }}>
                <MsqdxTypography variant="h6" sx={{ color: MSQDX_STATUS.error.base }}>{error}</MsqdxTypography>
            </Box>
        );
    }
    if (!payload) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, bgcolor: '#fff' }}>
                <CircularProgress sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto', bgcolor: '#fff', minHeight: '100vh' }}>
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                    Geteilte Scan-Ergebnisse · CHECKION
                </MsqdxTypography>
            </Box>
            {payload.type === 'domain' ? (
                <ShareDomainContent data={payload.data} />
            ) : (
                <ShareSingleContent data={payload.data} />
            )}
        </Box>
    );
}

function ShareDomainContent({ data }: { data: DomainSummaryResponse }) {
    const pages = data.pages ?? [];
    const agg = data.aggregated;

    return (
        <>
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Deep Scan: {data.domain}</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: STATUS.neutral, mb: 2 }}>
                    {new Date(data.timestamp).toLocaleDateString()} · {data.totalPages} Seiten
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <ScoreRing score={data.score} size={64} label="Domain-Score" />
                    {agg?.issues && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                            <MsqdxChip label={`${agg.issues.stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                            <MsqdxChip label={`${agg.issues.stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                            <MsqdxChip label={`${agg.issues.stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                        </Box>
                    )}
                </Box>
            </MsqdxCard>

            {agg?.performance && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Performance (Ø)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Ø TTFB" value={agg.performance.avgTtfb} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgTtfb, 'ttfb')} />
                        <MetricBox label="Ø FCP" value={agg.performance.avgFcp} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgFcp, 'fcp')} />
                        <MetricBox label="Ø LCP" value={agg.performance.avgLcp} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgLcp, 'lcp')} />
                        <MetricBox label="Ø DOM Load" value={agg.performance.avgDomLoad} unit=" ms" statusColor={getPerformanceColor(agg.performance.avgDomLoad, 'dom')} />
                        <Box sx={{ alignSelf: 'flex-end', py: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{agg.performance.pageCount} Seiten</MsqdxTypography>
                        </Box>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.eco && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Ökobilanz (zusammengefasst)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
                        <MetricBox label="Ø CO₂" value={agg.eco.avgCo2} unit=" g" statusColor={getEcoCo2Color(agg.eco.avgCo2)} />
                        <MetricBox label="Gesamtgewicht" value={(agg.eco.totalPageWeight / 1024).toFixed(0)} unit=" KB" />
                        {Object.keys(agg.eco.gradeDistribution).length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, mr: 0.5 }}>Grade:</MsqdxTypography>
                                {Object.entries(agg.eco.gradeDistribution)
                                    .sort(([a], [b]) => (ECO_GRADE_ORDER.indexOf(a) - ECO_GRADE_ORDER.indexOf(b)))
                                    .map(([grade, count]) => (
                                        <MsqdxChip key={grade} label={`${grade}: ${count}`} size="small" sx={{ fontSize: '0.7rem', bgcolor: alpha(getEcoGradeColor(grade), 0.15), color: getEcoGradeColor(grade) }} />
                                    ))}
                            </Box>
                        )}
                        <Box sx={{ alignSelf: 'center' }}><MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{agg.eco.pageCount} Seiten</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.ux && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>UX (aggregiert)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
                        <ScoreRing score={agg.ux.score} size={52} label="Ø UX-Score" />
                        <MetricBox label="Ø CLS" value={agg.ux.cls} statusColor={agg.ux.cls <= 0.1 ? STATUS.good : agg.ux.cls <= 0.25 ? STATUS.warning : STATUS.error} />
                        <MetricBox label="Kaputte Links" value={agg.ux.brokenLinks.length} statusColor={agg.ux.brokenLinks.length > 0 ? STATUS.error : undefined} />
                        <MetricBox label="Seiten mit Console-Errors" value={agg.ux.consoleErrorsByPage.length} statusColor={agg.ux.consoleErrorsByPage.length > 0 ? STATUS.error : undefined} />
                        {agg.ux.tapTargets.detailsByPage.length > 0 && (
                            <MetricBox label="Touch-Target-Probleme (Seiten)" value={agg.ux.tapTargets.detailsByPage.length} statusColor={STATUS.warning} />
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.seo && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>SEO (aggregiert)</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: agg.seo.crossPageKeywords.length > 0 ? 1.5 : 0 }}>
                        <MetricBar label="Mit Titel" value={agg.seo.withTitle} total={agg.seo.totalPages} color={getRatioColor(agg.seo.withTitle / agg.seo.totalPages)} />
                        <MetricBar label="Mit Meta-Description" value={agg.seo.withMetaDescription} total={agg.seo.totalPages} color={getRatioColor(agg.seo.withMetaDescription / agg.seo.totalPages)} />
                        <MetricBar label="Mit H1" value={agg.seo.withH1} total={agg.seo.totalPages} color={getRatioColor(agg.seo.withH1 / agg.seo.totalPages)} />
                        {agg.seo.missingMetaDescriptionUrls.length > 0 && (
                            <Box sx={{ gridColumn: '1 / -1' }}>
                                <MsqdxChip size="small" label={`Ohne Meta-Description: ${agg.seo.missingMetaDescriptionUrls.length} Seiten`} sx={{ bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                            </Box>
                        )}
                    </Box>
                    {agg.seo.crossPageKeywords.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>Top-Keywords (domainweit)</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {agg.seo.crossPageKeywords.slice(0, 10).map((k) => (
                                    <MsqdxChip key={k.keyword} label={`${k.keyword} (${k.totalCount})`} size="small" sx={{ fontSize: '0.7rem', bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />
                                ))}
                            </Box>
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {agg?.links && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Links</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Gesamt" value={agg.links.totalLinks} />
                        <MetricBox label="Intern" value={agg.links.internal} statusColor={STATUS.good} />
                        <MetricBox label="Extern" value={agg.links.external} />
                        <MetricBox label="Kaputte (unique)" value={agg.links.uniqueBrokenUrls} statusColor={agg.links.uniqueBrokenUrls > 0 ? STATUS.error : undefined} />
                    </Box>
                    {agg.links.uniqueBrokenUrls > 0 && agg.links.totalLinks > 0 && (
                        <Box sx={{ mt: 1.5 }}>
                            <MetricBar label="Intakte vs. kaputte Links" value={agg.links.totalLinks - agg.links.uniqueBrokenUrls} total={agg.links.totalLinks} color={getRatioColor((agg.links.totalLinks - agg.links.uniqueBrokenUrls) / agg.links.totalLinks)} />
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {agg?.infra?.technicalCounts && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Technische Insights</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        <MetricBar label="Manifest" value={agg.infra.technicalCounts.withManifest} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withManifest / agg.infra.technicalCounts.pageCount)} />
                        <MetricBar label="Theme-Color" value={agg.infra.technicalCounts.withThemeColor} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withThemeColor / agg.infra.technicalCounts.pageCount)} />
                        <MetricBar label="Apple Touch Icon" value={agg.infra.technicalCounts.withAppleTouchIcon} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withAppleTouchIcon / agg.infra.technicalCounts.pageCount)} />
                        <MetricBar label="Service Worker" value={agg.infra.technicalCounts.withServiceWorker} total={agg.infra.technicalCounts.pageCount} color={getRatioColor(agg.infra.technicalCounts.withServiceWorker / agg.infra.technicalCounts.pageCount)} />
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, alignItems: 'center' }}>
                        {agg.infra.technicalCounts.pagesWithRedirects > 0 && (
                            <MsqdxChip size="small" label={`Redirects ${agg.infra.technicalCounts.pagesWithRedirects} Seiten`} sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {agg.infra.technicalCounts.withMetaRefresh > 0 && (
                            <MsqdxChip size="small" label="Meta Refresh" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {agg.infra.technicalCounts.totalThirdPartyDomains > 0 && (
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{agg.infra.technicalCounts.totalThirdPartyDomains} Third-Party-Domains (gesamt)</MsqdxTypography>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.infra && (agg.infra.privacy.totalPages > 0 || agg.infra.security.totalPages > 0) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Privacy & Security</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        {agg.infra.privacy.totalPages > 0 && (
                            <>
                                <MetricBar label="Datenschutz" value={agg.infra.privacy.withPolicy} total={agg.infra.privacy.totalPages} color={getRatioColor(agg.infra.privacy.withPolicy / agg.infra.privacy.totalPages)} />
                                <MetricBar label="Cookie-Hinweis" value={agg.infra.privacy.withCookieBanner} total={agg.infra.privacy.totalPages} color={getRatioColor(agg.infra.privacy.withCookieBanner / agg.infra.privacy.totalPages)} />
                                <MetricBar label="AGB" value={agg.infra.privacy.withTerms} total={agg.infra.privacy.totalPages} color={getRatioColor(agg.infra.privacy.withTerms / agg.infra.privacy.totalPages)} />
                            </>
                        )}
                        {agg.infra.security.totalPages > 0 && (
                            <>
                                <MetricBar label="CSP" value={agg.infra.security.withCsp} total={agg.infra.security.totalPages} color={getRatioColor(agg.infra.security.withCsp / agg.infra.security.totalPages)} />
                                <MetricBar label="X-Frame-Options" value={agg.infra.security.withXFrame} total={agg.infra.security.totalPages} color={getRatioColor(agg.infra.security.withXFrame / agg.infra.security.totalPages)} />
                            </>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.structure && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Struktur (Überschriften)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Seiten mit mehreren H1" value={agg.structure.pagesWithMultipleH1.length} statusColor={agg.structure.pagesWithMultipleH1.length > 0 ? STATUS.error : undefined} />
                        <MetricBox label="Seiten mit Level-Sprüngen" value={agg.structure.pagesWithSkippedLevels.length} statusColor={agg.structure.pagesWithSkippedLevels.length > 0 ? STATUS.warning : undefined} />
                        <MetricBox label="Gute Struktur" value={agg.structure.pagesWithGoodStructure.length} statusColor={agg.structure.pagesWithGoodStructure.length > 0 ? STATUS.good : undefined} />
                    </Box>
                </MsqdxCard>
            )}

            {data.eeat && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>E-E-A-T</MsqdxTypography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                        <MetricBar label="Impressum" value={data.eeat.trust.pagesWithImpressum} total={data.eeat.trust.totalPages} color={getRatioColor(data.eeat.trust.pagesWithImpressum / data.eeat.trust.totalPages)} />
                        <MetricBar label="Kontakt" value={data.eeat.trust.pagesWithContact} total={data.eeat.trust.totalPages} color={getRatioColor(data.eeat.trust.pagesWithContact / data.eeat.trust.totalPages)} />
                        <MetricBar label="Datenschutz" value={data.eeat.trust.pagesWithPrivacy} total={data.eeat.trust.totalPages} color={getRatioColor(data.eeat.trust.pagesWithPrivacy / data.eeat.trust.totalPages)} />
                        <MetricBar label="Über uns" value={data.eeat.experience.pagesWithAbout} total={data.eeat.experience.totalPages} color={getRatioColor(data.eeat.experience.pagesWithAbout / data.eeat.experience.totalPages)} />
                        <MetricBar label="Team" value={data.eeat.experience.pagesWithTeam} total={data.eeat.experience.totalPages} color={getRatioColor(data.eeat.experience.pagesWithTeam / data.eeat.experience.totalPages)} />
                        <MetricBar label="Autor-Bio" value={data.eeat.expertise.pagesWithAuthorBio} total={data.eeat.expertise.totalPages} color={getRatioColor(data.eeat.expertise.pagesWithAuthorBio / data.eeat.expertise.totalPages)} />
                    </Box>
                    <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, mt: 1 }}>Ø Zitate/Seite: {data.eeat.expertise.avgCitationsPerPage.toFixed(1)}</MsqdxTypography>
                </MsqdxCard>
            )}

            {agg?.generative && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Generative / GEO</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
                        <ScoreRing score={agg.generative.score} size={52} label="Ø GEO-Score" />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <MetricBar label="Seiten mit LLMs.txt" value={agg.generative.withLlmsTxt} total={agg.generative.pageCount} color={getRatioColor(agg.generative.withLlmsTxt / agg.generative.pageCount)} />
                            <MetricBar label="Robots erlauben AI" value={agg.generative.withRobotsAllowingAi} total={agg.generative.pageCount} color={getRatioColor(agg.generative.withRobotsAllowingAi / agg.generative.pageCount)} />
                        </Box>
                    </Box>
                </MsqdxCard>
            )}

            {data.systemicIssues && data.systemicIssues.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: `1px solid ${alpha(STATUS.error, 0.3)}`, bgcolor: alpha(STATUS.error, 0.04) }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: STATUS.error }}>Systemische Issues</MsqdxTypography>
                    {data.systemicIssues.map((issue, idx) => (
                        <Box key={idx} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: STATUS.error }} />
                            <MsqdxTypography variant="body2" sx={{ color: STATUS.error }}>{issue.title} — {issue.count} Seiten</MsqdxTypography>
                        </Box>
                    ))}
                </MsqdxCard>
            )}

            <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Gescannte Seiten ({pages.length})</MsqdxTypography>
                <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 400, overflow: 'auto' }}>
                    {pages.slice(0, 200).map((p) => (
                        <li key={p.id} style={{ listStyle: 'none', marginLeft: -8 }}>
                            <MsqdxTypography variant="body2" component="span" sx={{ wordBreak: 'break-all' }}>{p.url}</MsqdxTypography>
                            <MsqdxTypography variant="caption" component="span" sx={{ ml: 1, fontWeight: 600, color: getScoreColor(p.score) }}>Score {p.score}</MsqdxTypography>
                            <MsqdxTypography variant="caption" component="span" sx={{ ml: 0.5, color: STATUS.neutral }}>· {p.stats.errors + p.stats.warnings + p.stats.notices} Issues</MsqdxTypography>
                        </li>
                    ))}
                </Box>
                {pages.length > 200 && (
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        … und {pages.length - 200} weitere Seiten
                    </MsqdxTypography>
                )}
            </MsqdxCard>
        </>
    );
}

function ShareSingleContent({ data }: { data: ScanResult }) {
    const issueCount = (data.issues?.length ?? 0);
    const stats = data.stats ?? { errors: 0, warnings: 0, notices: 0 };
    const perf = data.performance;
    const eco = data.eco;
    const seo = data.seo;
    const links = data.links;
    const privacy = data.privacy;
    const security = data.security;
    const technicalInsights = data.technicalInsights;
    const generative = data.generative;
    const geo = data.geo;

    return (
        <>
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Seiten-Scan</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: STATUS.neutral, mb: 2, wordBreak: 'break-all' }}>
                    {data.url}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral, display: 'block', mb: 2 }}>
                    {new Date(data.timestamp).toISOString().slice(0, 10)} · {data.device}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <ScoreRing score={data.score} size={64} label="Score" />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <MsqdxChip label={`${stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                        <MsqdxChip label={`${stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        <MsqdxChip label={`${stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                    </Box>
                    {data.ux?.score != null && (
                        <ScoreRing score={data.ux.score} size={52} label="UX-Score" />
                    )}
                </Box>
            </MsqdxCard>

            {perf && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Performance</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="TTFB" value={perf.ttfb} unit=" ms" statusColor={getPerformanceColor(perf.ttfb, 'ttfb')} />
                        <MetricBox label="FCP" value={perf.fcp} unit=" ms" statusColor={getPerformanceColor(perf.fcp, 'fcp')} />
                        <MetricBox label="LCP" value={perf.lcp} unit=" ms" statusColor={getPerformanceColor(perf.lcp, 'lcp')} />
                        <MetricBox label="DOM Load" value={perf.domLoad} unit=" ms" statusColor={getPerformanceColor(perf.domLoad, 'dom')} />
                    </Box>
                </MsqdxCard>
            )}

            {eco && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Ökobilanz</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="CO₂" value={eco.co2} unit=" g" statusColor={getEcoCo2Color(eco.co2)} />
                        <Box sx={{ px: 1.5, py: 1, borderRadius: 1.5, bgcolor: alpha(getEcoGradeColor(eco.grade), 0.08), border: `1px solid ${alpha(getEcoGradeColor(eco.grade), 0.3)}` }}>
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>Grade</MsqdxTypography>
                            <MsqdxChip label={eco.grade} size="small" sx={{ mt: 0.25, bgcolor: alpha(getEcoGradeColor(eco.grade), 0.2), color: getEcoGradeColor(eco.grade), fontWeight: 700 }} />
                        </Box>
                        <MetricBox label="Seitengewicht" value={(eco.pageWeight / 1024).toFixed(1)} unit=" KB" />
                    </Box>
                </MsqdxCard>
            )}

            {seo && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>SEO</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {seo.title && <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Titel</MsqdxTypography><MsqdxTypography variant="body2" sx={{ wordBreak: 'break-word' }}>{seo.title.length > 80 ? seo.title.slice(0, 80) + '…' : seo.title}</MsqdxTypography></Box>}
                        {seo.metaDescription && <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Meta-Description</MsqdxTypography><MsqdxTypography variant="body2" sx={{ wordBreak: 'break-word' }}>{seo.metaDescription.length > 120 ? seo.metaDescription.slice(0, 120) + '…' : seo.metaDescription}</MsqdxTypography></Box>}
                        {seo.h1 && <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>H1</MsqdxTypography><MsqdxTypography variant="body2" sx={{ wordBreak: 'break-word' }}>{seo.h1.length > 80 ? seo.h1.slice(0, 80) + '…' : seo.h1}</MsqdxTypography></Box>}
                        {!seo.title && !seo.metaDescription && !seo.h1 && <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine SEO-Daten</MsqdxTypography>}
                    </Box>
                </MsqdxCard>
            )}

            {links && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Links</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <MetricBox label="Gesamt" value={links.total} />
                        <MetricBox label="Intern" value={links.internal} statusColor={STATUS.good} />
                        <MetricBox label="Extern" value={links.external} />
                        <MetricBox label="Kaputte" value={links.broken?.length ?? 0} statusColor={(links.broken?.length ?? 0) > 0 ? STATUS.error : undefined} />
                    </Box>
                </MsqdxCard>
            )}

            {(privacy || security) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Privacy & Security</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {privacy && (
                            <>
                                <MsqdxChip size="small" label={privacy.hasPrivacyPolicy ? 'Datenschutz' : 'Kein Datenschutz'} sx={privacy.hasPrivacyPolicy ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.error, 0.12), color: STATUS.error }} />
                                <MsqdxChip size="small" label={privacy.hasCookieBanner ? 'Cookie-Hinweis' : 'Kein Cookie-Hinweis'} sx={privacy.hasCookieBanner ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: '#f0f0f0', color: '#666' }} />
                                <MsqdxChip size="small" label={privacy.hasTermsOfService ? 'AGB' : 'Keine AGB'} sx={privacy.hasTermsOfService ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                            </>
                        )}
                        {security && (
                            <>
                                <MsqdxChip size="small" label={security.contentSecurityPolicy?.present ? 'CSP' : 'Kein CSP'} sx={security.contentSecurityPolicy?.present ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                <MsqdxChip size="small" label={security.xFrameOptions?.present ? 'X-Frame-Options' : 'Kein X-Frame-Options'} sx={security.xFrameOptions?.present ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                            </>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {technicalInsights && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>Technische Insights</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <MsqdxChip size="small" label={technicalInsights.manifest.present ? 'Web-App-Manifest' : 'Kein Manifest'} sx={technicalInsights.manifest.present ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        {technicalInsights.manifest.present && (
                            <>
                                {technicalInsights.manifest.hasName && <MsqdxChip size="small" label="Name" sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />}
                                {technicalInsights.manifest.hasIcons && <MsqdxChip size="small" label="Icons" sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />}
                            </>
                        )}
                        {technicalInsights.themeColor != null && technicalInsights.themeColor && (
                            <MsqdxChip size="small" label={`Theme ${technicalInsights.themeColor}`} sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />
                        )}
                        {technicalInsights.appleTouchIcon != null && technicalInsights.appleTouchIcon && (
                            <MsqdxChip size="small" label="Apple Touch Icon" sx={{ bgcolor: alpha(STATUS.good, 0.1), color: STATUS.good }} />
                        )}
                        {technicalInsights.serviceWorkerRegistered && (
                            <MsqdxChip size="small" label="Service Worker" sx={{ bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good }} />
                        )}
                        {technicalInsights.redirectCount != null && technicalInsights.redirectCount > 0 && (
                            <MsqdxChip size="small" label={`${technicalInsights.redirectCount} Redirect(s)`} sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {technicalInsights.metaRefreshPresent && (
                            <MsqdxChip size="small" label="Meta Refresh" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                        )}
                        {(technicalInsights.thirdPartyDomains?.length ?? 0) > 0 && (
                            <MsqdxTypography variant="caption" sx={{ color: STATUS.neutral }}>{technicalInsights.thirdPartyDomains.length} Third-Party-Domain(s)</MsqdxTypography>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {(generative || geo) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Generative / GEO</MsqdxTypography>
                    {generative && (
                        <Box sx={{ mb: geo ? 1.5 : 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                <MsqdxChip size="small" label={`GEO-Score ${generative.score}`} sx={{ bgcolor: alpha(getScoreColor(generative.score), 0.12), color: getScoreColor(generative.score), fontWeight: 600 }} />
                                <MsqdxChip size="small" label={generative.technical.hasLlmsTxt ? 'llms.txt' : 'Kein llms.txt'} sx={generative.technical.hasLlmsTxt ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                <MsqdxChip size="small" label={generative.technical.hasRobotsAllowingAI ? 'Robots (AI)' : 'Robots (AI blockiert)'} sx={generative.technical.hasRobotsAllowingAI ? { bgcolor: alpha(STATUS.good, 0.12), color: STATUS.good } : { bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                {generative.technical.metaRobotsIndexable === false && (
                                    <MsqdxChip size="small" label="noindex" sx={{ bgcolor: alpha(STATUS.warning, 0.12), color: STATUS.warning }} />
                                )}
                            </Box>
                            {generative.technical.schemaCoverage?.length > 0 && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                    Schema: {generative.technical.schemaCoverage.slice(0, 5).join(', ')}{generative.technical.schemaCoverage.length > 5 ? ' …' : ''}
                                </MsqdxTypography>
                            )}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    FAQ: {generative.content.faqCount} · Tabellen: {generative.content.tableCount} · Autor: {generative.expertise.hasAuthorBio ? 'Ja' : 'Nein'} · Zitate: {generative.expertise.hasExpertCitations ? 'Ja' : 'Nein'}
                                </MsqdxTypography>
                            </Box>
                        </Box>
                    )}
                    {geo && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                            {geo.location?.country && <MsqdxChip size="small" label={[geo.location.city, geo.location.country].filter(Boolean).join(', ')} />}
                            {geo.cdn.detected && geo.cdn.provider && <MsqdxChip size="small" label={`CDN: ${geo.cdn.provider}`} />}
                            {geo.languages.htmlLang && <MsqdxChip size="small" label={`lang=${geo.languages.htmlLang}`} />}
                            {(geo.languages.hreflangs?.length ?? 0) > 0 && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                    {geo.languages.hreflangs.length} hreflang(s)
                                </MsqdxTypography>
                            )}
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {issueCount > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', bgcolor: '#fff' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Issues ({issueCount})</MsqdxTypography>
                    <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 300, overflow: 'auto' }}>
                        {(data.issues ?? []).slice(0, 50).map((issue, idx) => (
                            <li key={idx}>
                                <MsqdxTypography variant="body2">[{issue.type}] {issue.message}</MsqdxTypography>
                            </li>
                        ))}
                    </Box>
                    {issueCount > 50 && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>… und {issueCount - 50} weitere</MsqdxTypography>
                    )}
                </MsqdxCard>
            )}
        </>
    );
}

