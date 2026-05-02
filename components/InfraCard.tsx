import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { GeoAudit, ScanResult } from '@/lib/types';
import { Globe, Server, Cloud, Languages, Layers, Radar } from 'lucide-react';

export function InfraCard({
    geo,
    performance,
    technicalInsights,
}: {
    geo: GeoAudit;
    performance?: ScanResult['performance'];
    technicalInsights?: ScanResult['technicalInsights'];
}) {
    if (!geo) return null;

    return (
        <MsqdxMoleculeCard
            title="Infrastruktur & Standort"
            subtitle="Serverstandort, CDN, Sprachen, erkannte Plattform und Tracking-Tools."
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-sm)' }}>
                {/* Location Section */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)', color: MSQDX_BRAND_PRIMARY.green }}>
                        <Globe size={18} />
                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>Location</MsqdxTypography>
                    </Box>
                    {geo.location ? (
                        <Box sx={{ p: 1.5, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', borderRadius: 1, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                            <MsqdxTypography variant="h6" sx={{ color: 'var(--color-text-on-light)', mb: 'var(--msqdx-spacing-xxs)', fontSize: '1rem' }}>
                                {geo.location.city}, {geo.location.country}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block' }}>
                                {geo.location.region} • {geo.location.continent}
                            </MsqdxTypography>
                        </Box>
                    ) : (
                        <Box>
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Standort konnte nicht ermittelt werden (z. B. localhost, private IP oder keine Geo-API).
                            </MsqdxTypography>
                            {geo.serverIp && /^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(geo.serverIp.trim()) ? (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                                    Hinweis: Bei lokaler Entwicklung ist die Server-IP oft privat — Geo-Lookup ist dann nicht möglich.
                                </MsqdxTypography>
                            ) : null}
                        </Box>
                    )}
                </Box>

                {/* Stack / platform (heuristic) */}
                {(geo.detectedPlatforms?.length ?? 0) > 0 || (geo.hostingHints?.server || geo.hostingHints?.poweredBy) ? (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)', color: MSQDX_BRAND_PRIMARY.purple }}>
                            <Layers size={18} />
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>System & Hosting</MsqdxTypography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                            {(geo.detectedPlatforms ?? []).map((p) => (
                                <MsqdxChip
                                    key={p}
                                    label={p}
                                    size="small"
                                    sx={{ bgcolor: alpha(MSQDX_BRAND_PRIMARY.purple, 0.12), color: MSQDX_BRAND_PRIMARY.purple, height: 22, fontSize: '0.7rem' }}
                                />
                            ))}
                            {geo.hostingHints?.server ? (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                    Server: {geo.hostingHints.server}
                                </MsqdxTypography>
                            ) : null}
                            {geo.hostingHints?.poweredBy ? (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', fontFamily: 'monospace' }}>
                                    X-Powered-By: {geo.hostingHints.poweredBy}
                                </MsqdxTypography>
                            ) : null}
                        </Box>
                    </Box>
                ) : null}

                {/* Tracking & tags */}
                {(geo.detectedTracking?.length ?? 0) > 0 ? (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)', color: MSQDX_STATUS.warning.base }}>
                            <Radar size={18} />
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>Tracking & Tags</MsqdxTypography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-xs)', flexWrap: 'wrap' }}>
                            {(geo.detectedTracking ?? []).map((t, i) => (
                                <MsqdxChip
                                    key={`${t.id}-${i}`}
                                    label={t.name}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: '0.65rem', borderColor: alpha(MSQDX_STATUS.warning.base, 0.4) }}
                                />
                            ))}
                        </Box>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 0.5 }}>
                            Heuristik aus eingebundenen Skripten und Abgleich mit Drittanbieter-Domains aus dem Seitenaufruf. Keine Garantie auf Vollständigkeit (z. B. Consent, später geladene Tags).
                        </MsqdxTypography>
                    </Box>
                ) : null}

                {/* Infrastructure */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--msqdx-spacing-sm)' }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xxs)', color: 'var(--color-text-muted-on-light)' }}>
                            <Server size={14} />
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Server IP</MsqdxTypography>
                        </Box>
                        <MsqdxTypography variant="body2" sx={{ fontFamily: 'monospace', color: MSQDX_BRAND_PRIMARY.purple, fontSize: '0.85rem' }}>
                            {geo.serverIp || 'Unknown'}
                        </MsqdxTypography>
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xxs)', color: 'var(--color-text-muted-on-light)' }}>
                            <Cloud size={14} />
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CDN Status</MsqdxTypography>
                        </Box>
                        {geo.cdn.detected ? (
                            <MsqdxChip
                                label={geo.cdn.provider || 'Detected'}
                                size="small"
                                sx={{ bgcolor: alpha(MSQDX_BRAND_PRIMARY.green, 0.1), color: MSQDX_BRAND_PRIMARY.green, fontWeight: 600, height: 20, fontSize: '0.65rem' }}
                            />
                        ) : (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', fontSize: '0.85rem' }}>
                                Kein CDN erkannt
                            </MsqdxTypography>
                        )}
                    </Box>
                </Box>

                {/* Languages */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)', mb: 'var(--msqdx-spacing-xs)', color: MSQDX_STATUS.info.base }}>
                        <Languages size={18} />
                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>Languages</MsqdxTypography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 'var(--msqdx-spacing-xs)', flexWrap: 'wrap' }}>
                        {geo.languages.htmlLang && (
                            <MsqdxChip label={`HTML: ${geo.languages.htmlLang}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                        {geo.languages.hreflangs.length > 0 ? (
                            geo.languages.hreflangs.slice(0, 5).map((hl, i) => (
                                <MsqdxChip key={i} label={hl.lang} size="small" sx={{ bgcolor: alpha(MSQDX_NEUTRAL[400], 0.1), height: 20, fontSize: '0.65rem' }} />
                            ))
                        ) : (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                Keine hreflang-Tags gefunden.
                            </MsqdxTypography>
                        )}
                        {geo.languages.hreflangs.length > 5 && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', alignSelf: 'center' }}>
                                +{geo.languages.hreflangs.length - 5} more
                            </MsqdxTypography>
                        )}
                    </Box>
                </Box>

                {(performance?.nextHopProtocol || performance?.scriptTransferBytesApprox || technicalInsights?.mainDocumentCache) && (
                    <Box sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                            Transport & Cache (Lab)
                        </MsqdxTypography>
                        {performance?.nextHopProtocol && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)' }}>
                                Protokoll: {performance.nextHopProtocol}
                            </MsqdxTypography>
                        )}
                        {performance?.scriptTransferBytesApprox != null && performance.scriptTransferBytesApprox > 0 && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)' }}>
                                Skript-Transfer (ca.): {(performance.scriptTransferBytesApprox / 1024).toFixed(0)} KB
                            </MsqdxTypography>
                        )}
                        {technicalInsights?.mainDocumentCache?.cacheControl && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)', wordBreak: 'break-word' }}>
                                HTML Cache-Control: {technicalInsights.mainDocumentCache.cacheControl}
                                {technicalInsights.mainDocumentCache.htmlLongCache ? ' · langes max-age' : ''}
                            </MsqdxTypography>
                        )}
                        {technicalInsights?.staticAssetCacheWeak && (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.warning.base, display: 'block', mt: 0.5 }}>
                                Hinweis: großes Skript-Volumen bei schwachem HTML-Caching (Heuristik).
                            </MsqdxTypography>
                        )}
                    </Box>
                )}
            </Box>
        </MsqdxMoleculeCard>
    );
}
