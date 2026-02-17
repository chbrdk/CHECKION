'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import type { DomainSummaryResponse } from '@/lib/domain-summary';
import type { ScanResult } from '@/lib/types';

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
            <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', textAlign: 'center' }}>
                <MsqdxTypography variant="h6" sx={{ color: MSQDX_STATUS.error.base }}>{error}</MsqdxTypography>
            </Box>
        );
    }
    if (!payload) {
        return (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                <CircularProgress sx={{ color: MSQDX_BRAND_PRIMARY.green }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 'var(--msqdx-spacing-md)', maxWidth: 900, mx: 'auto' }}>
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
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Deep Scan: {data.domain}</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                    {new Date(data.timestamp).toLocaleDateString()} · {data.totalPages} Seiten
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: `4px solid ${data.score > 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.warning.base}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MsqdxTypography variant="h6">{data.score}</MsqdxTypography>
                        </Box>
                        <MsqdxTypography variant="body2">Domain-Score</MsqdxTypography>
                    </Box>
                    {agg?.issues && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <MsqdxChip label={`${agg.issues.stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }} />
                            <MsqdxChip label={`${agg.issues.stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                            <MsqdxChip label={`${agg.issues.stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                        </Box>
                    )}
                </Box>
            </MsqdxCard>

            {agg?.performance && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Performance (Ø)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø TTFB</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.performance.avgTtfb} ms</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø FCP</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.performance.avgFcp} ms</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø LCP</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.performance.avgLcp} ms</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø DOM Load</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.performance.avgDomLoad} ms</MsqdxTypography></Box>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', alignSelf: 'flex-end' }}>{agg.performance.pageCount} Seiten</MsqdxTypography>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.eco && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Ökobilanz (zusammengefasst)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø CO₂</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.eco.avgCo2} g</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Gesamtgewicht</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{(agg.eco.totalPageWeight / 1024).toFixed(0)} KB</MsqdxTypography></Box>
                        {Object.keys(agg.eco.gradeDistribution).length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', mr: 0.5 }}>Grade:</MsqdxTypography>
                                {Object.entries(agg.eco.gradeDistribution)
                                    .sort(([a], [b]) => {
                                        const order = ['A+', 'A', 'B', 'C', 'D', 'E', 'F'];
                                        return (order.indexOf(a) - order.indexOf(b));
                                    })
                                    .map(([grade, count]) => (
                                        <MsqdxChip key={grade} label={`${grade}: ${count}`} size="small" sx={{ fontSize: '0.7rem' }} />
                                    ))}
                            </Box>
                        )}
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>{agg.eco.pageCount} Seiten</MsqdxTypography>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.ux && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>UX (aggregiert)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø Score</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.ux.score}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø CLS</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.ux.cls}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Kaputte Links</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.ux.brokenLinks.length}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Seiten mit Console-Errors</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.ux.consoleErrorsByPage.length}</MsqdxTypography></Box>
                        {agg.ux.tapTargets.detailsByPage.length > 0 && (
                            <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Touch-Target-Probleme (Seiten)</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.ux.tapTargets.detailsByPage.length}</MsqdxTypography></Box>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.seo && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>SEO (aggregiert)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Mit Titel</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.seo.withTitle} / {agg.seo.totalPages}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Mit Meta-Description</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.seo.withMetaDescription} / {agg.seo.totalPages}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Mit H1</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.seo.withH1} / {agg.seo.totalPages}</MsqdxTypography></Box>
                        {agg.seo.missingMetaDescriptionUrls.length > 0 && (
                            <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ohne Meta-Description</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.seo.missingMetaDescriptionUrls.length} Seiten</MsqdxTypography></Box>
                        )}
                    </Box>
                    {agg.seo.crossPageKeywords.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Top-Keywords (domainweit)</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {agg.seo.crossPageKeywords.slice(0, 10).map((k) => (
                                    <MsqdxChip key={k.keyword} label={`${k.keyword} (${k.totalCount})`} size="small" sx={{ fontSize: '0.7rem' }} />
                                ))}
                            </Box>
                        </Box>
                    )}
                </MsqdxCard>
            )}

            {agg?.links && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Links</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Gesamt</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.links.totalLinks}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Intern</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.links.internal}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Extern</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.links.external}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Kaputte (unique)</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600, color: agg.links.uniqueBrokenUrls > 0 ? MSQDX_STATUS.error.base : undefined }}>{agg.links.uniqueBrokenUrls}</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.infra?.technicalCounts && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Technische Insights</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <MsqdxChip size="small" label={`Manifest ${agg.infra.technicalCounts.withManifest}/${agg.infra.technicalCounts.pageCount}`} />
                        <MsqdxChip size="small" label={`Theme-Color ${agg.infra.technicalCounts.withThemeColor}/${agg.infra.technicalCounts.pageCount}`} />
                        <MsqdxChip size="small" label={`Apple Touch Icon ${agg.infra.technicalCounts.withAppleTouchIcon}/${agg.infra.technicalCounts.pageCount}`} />
                        <MsqdxChip size="small" label={`Service Worker ${agg.infra.technicalCounts.withServiceWorker}/${agg.infra.technicalCounts.pageCount}`} />
                        {agg.infra.technicalCounts.pagesWithRedirects > 0 && (
                            <MsqdxChip size="small" label={`Redirects ${agg.infra.technicalCounts.pagesWithRedirects} Seiten`} />
                        )}
                        {agg.infra.technicalCounts.withMetaRefresh > 0 && (
                            <MsqdxChip size="small" label="Meta Refresh" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                        )}
                        {agg.infra.technicalCounts.totalThirdPartyDomains > 0 && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {agg.infra.technicalCounts.totalThirdPartyDomains} Third-Party-Domains (gesamt)
                            </MsqdxTypography>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.infra && (agg.infra.privacy.totalPages > 0 || agg.infra.security.totalPages > 0) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Privacy & Security</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        {agg.infra.privacy.totalPages > 0 && (
                            <>
                                <MsqdxChip size="small" label={`Datenschutz ${agg.infra.privacy.withPolicy}/${agg.infra.privacy.totalPages}`} />
                                <MsqdxChip size="small" label={`Cookie-Hinweis ${agg.infra.privacy.withCookieBanner}/${agg.infra.privacy.totalPages}`} />
                                <MsqdxChip size="small" label={`AGB ${agg.infra.privacy.withTerms}/${agg.infra.privacy.totalPages}`} />
                            </>
                        )}
                        {agg.infra.security.totalPages > 0 && (
                            <>
                                <MsqdxChip size="small" label={`CSP ${agg.infra.security.withCsp}/${agg.infra.security.totalPages}`} />
                                <MsqdxChip size="small" label={`X-Frame-Options ${agg.infra.security.withXFrame}/${agg.infra.security.totalPages}`} />
                            </>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {agg?.structure && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Struktur (Überschriften)</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Seiten mit mehreren H1</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.structure.pagesWithMultipleH1.length}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Seiten mit Level-Sprüngen</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.structure.pagesWithSkippedLevels.length}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Gute Struktur</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.structure.pagesWithGoodStructure.length}</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {data.eeat && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>E-E-A-T</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <MsqdxChip size="small" label={`Impressum ${data.eeat.trust.pagesWithImpressum}/${data.eeat.trust.totalPages}`} />
                            <MsqdxChip size="small" label={`Kontakt ${data.eeat.trust.pagesWithContact}/${data.eeat.trust.totalPages}`} />
                            <MsqdxChip size="small" label={`Datenschutz ${data.eeat.trust.pagesWithPrivacy}/${data.eeat.trust.totalPages}`} />
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <MsqdxChip size="small" label={`Über uns ${data.eeat.experience.pagesWithAbout}/${data.eeat.experience.totalPages}`} />
                            <MsqdxChip size="small" label={`Team ${data.eeat.experience.pagesWithTeam}/${data.eeat.experience.totalPages}`} />
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <MsqdxChip size="small" label={`Autor-Bio ${data.eeat.expertise.pagesWithAuthorBio}/${data.eeat.expertise.totalPages}`} />
                            <MsqdxChip size="small" label={`Ø Zitate/Seite ${data.eeat.expertise.avgCitationsPerPage.toFixed(1)}`} />
                        </Box>
                    </Box>
                </MsqdxCard>
            )}

            {agg?.generative && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Generative / GEO</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø Score</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.generative.score}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Seiten mit LLMs.txt</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.generative.withLlmsTxt} / {agg.generative.pageCount}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Robots erlauben AI</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{agg.generative.withRobotsAllowingAi} / {agg.generative.pageCount}</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {data.systemicIssues && data.systemicIssues.length > 0 && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Systemische Issues</MsqdxTypography>
                    {data.systemicIssues.map((issue, idx) => (
                        <Box key={idx} sx={{ mb: 1 }}>
                            <MsqdxTypography variant="body2">{issue.title} — {issue.count} Seiten</MsqdxTypography>
                        </Box>
                    ))}
                </MsqdxCard>
            )}

            <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Gescannte Seiten ({pages.length})</MsqdxTypography>
                <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 400, overflow: 'auto' }}>
                    {pages.slice(0, 200).map((p) => (
                        <li key={p.id}>
                            <MsqdxTypography variant="body2" component="span" sx={{ wordBreak: 'break-all' }}>{p.url}</MsqdxTypography>
                            <MsqdxTypography variant="caption" component="span" sx={{ ml: 1, color: 'var(--color-text-muted-on-light)' }}>
                                Score {p.score} · {p.stats.errors + p.stats.warnings + p.stats.notices} Issues
                            </MsqdxTypography>
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
            <MsqdxCard variant="flat" sx={{ p: 3, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                <MsqdxTypography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Seiten-Scan</MsqdxTypography>
                <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2, wordBreak: 'break-all' }}>
                    {data.url}
                </MsqdxTypography>
                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 2 }}>
                    {new Date(data.timestamp).toISOString().slice(0, 10)} · {data.device}
                </MsqdxTypography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            border: `4px solid ${data.score > 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.warning.base}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MsqdxTypography variant="h6">{data.score}</MsqdxTypography>
                        </Box>
                        <MsqdxTypography variant="body2">Score</MsqdxTypography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <MsqdxChip label={`${stats.errors} Errors`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.12), color: MSQDX_STATUS.error.base }} />
                        <MsqdxChip label={`${stats.warnings} Warnings`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                        <MsqdxChip label={`${stats.notices} Notices`} size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.info.base, 0.12), color: MSQDX_STATUS.info.base }} />
                    </Box>
                    {data.ux?.score != null && (
                        <MsqdxChip label={`UX-Score ${data.ux.score}`} size="small" />
                    )}
                </Box>
            </MsqdxCard>

            {perf && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Performance</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>TTFB</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{perf.ttfb} ms</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>FCP</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{perf.fcp} ms</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>LCP</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{perf.lcp} ms</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>DOM Load</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{perf.domLoad} ms</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {eco && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Ökobilanz</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>CO₂</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{eco.co2} g</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Grade</MsqdxTypography><MsqdxChip label={eco.grade} size="small" /></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Seitengewicht</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{(eco.pageWeight / 1024).toFixed(1)} KB</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {seo && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
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
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Links</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Gesamt</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{links.total}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Intern</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{links.internal}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Extern</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600 }}>{links.external}</MsqdxTypography></Box>
                        <Box><MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Kaputte</MsqdxTypography><MsqdxTypography variant="body1" sx={{ fontWeight: 600, color: (links.broken?.length ?? 0) > 0 ? MSQDX_STATUS.error.base : undefined }}>{links.broken?.length ?? 0}</MsqdxTypography></Box>
                    </Box>
                </MsqdxCard>
            )}

            {(privacy || security) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Privacy & Security</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {privacy && (
                            <>
                                <MsqdxChip size="small" label={privacy.hasPrivacyPolicy ? 'Datenschutz' : 'Kein Datenschutz'} color={privacy.hasPrivacyPolicy ? 'success' : undefined} />
                                <MsqdxChip size="small" label={privacy.hasCookieBanner ? 'Cookie-Hinweis' : 'Kein Cookie-Hinweis'} />
                                <MsqdxChip size="small" label={privacy.hasTermsOfService ? 'AGB' : 'Keine AGB'} />
                            </>
                        )}
                        {security && (
                            <>
                                <MsqdxChip size="small" label={security.contentSecurityPolicy?.present ? 'CSP' : 'Kein CSP'} />
                                <MsqdxChip size="small" label={security.xFrameOptions?.present ? 'X-Frame-Options' : 'Kein X-Frame-Options'} />
                            </>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {technicalInsights && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Technische Insights</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                        <MsqdxChip size="small" label={technicalInsights.manifest.present ? 'Web-App-Manifest' : 'Kein Manifest'} />
                        {technicalInsights.manifest.present && (
                            <>
                                {technicalInsights.manifest.hasName && <MsqdxChip size="small" label="Name" />}
                                {technicalInsights.manifest.hasIcons && <MsqdxChip size="small" label="Icons" />}
                            </>
                        )}
                        {technicalInsights.themeColor != null && technicalInsights.themeColor && (
                            <MsqdxChip size="small" label={`Theme ${technicalInsights.themeColor}`} />
                        )}
                        {technicalInsights.appleTouchIcon != null && technicalInsights.appleTouchIcon && (
                            <MsqdxChip size="small" label="Apple Touch Icon" />
                        )}
                        {technicalInsights.serviceWorkerRegistered && (
                            <MsqdxChip size="small" label="Service Worker" color="success" />
                        )}
                        {technicalInsights.redirectCount != null && technicalInsights.redirectCount > 0 && (
                            <MsqdxChip size="small" label={`${technicalInsights.redirectCount} Redirect(s)`} />
                        )}
                        {technicalInsights.metaRefreshPresent && (
                            <MsqdxChip size="small" label="Meta Refresh" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
                        )}
                        {(technicalInsights.thirdPartyDomains?.length ?? 0) > 0 && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                {technicalInsights.thirdPartyDomains.length} Third-Party-Domain(s)
                            </MsqdxTypography>
                        )}
                    </Box>
                </MsqdxCard>
            )}

            {(generative || geo) && (
                <MsqdxCard variant="flat" sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Generative / GEO</MsqdxTypography>
                    {generative && (
                        <Box sx={{ mb: geo ? 1.5 : 0 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 0.5 }}>
                                <MsqdxChip size="small" label={`GEO-Score ${generative.score}`} />
                                <MsqdxChip size="small" label={generative.technical.hasLlmsTxt ? 'llms.txt' : 'Kein llms.txt'} />
                                <MsqdxChip size="small" label={generative.technical.hasRobotsAllowingAI ? 'Robots (AI)' : 'Robots (AI blockiert)'} />
                                {generative.technical.metaRobotsIndexable === false && (
                                    <MsqdxChip size="small" label="noindex" sx={{ bgcolor: alpha(MSQDX_STATUS.warning.base, 0.12), color: MSQDX_STATUS.warning.base }} />
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
                <MsqdxCard variant="flat" sx={{ p: 2, borderRadius: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
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

