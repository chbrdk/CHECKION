import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { GeoAudit } from '@/lib/types';
import { Globe, Server, Cloud, Languages } from 'lucide-react';

export function InfraCard({ geo }: { geo: GeoAudit }) {
    if (!geo) return null;

    return (
        <MsqdxMoleculeCard
            title="Infrastruktur & Standort"
            subtitle="Serverstandort, CDN und Spracheinstellungen."
            variant="flat"
            borderRadius="lg"
            sx={{ height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: MSQDX_SPACING.scale.md }}>
                {/* Location Section */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: MSQDX_BRAND_PRIMARY.green }}>
                        <Globe size={18} />
                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>Location</MsqdxTypography>
                    </Box>
                    {geo.location ? (
                        <Box sx={{ p: 1.5, bgcolor: alpha(MSQDX_NEUTRAL[900], 0.3), borderRadius: 1, border: `1px solid ${MSQDX_THEME.dark.border.subtle}` }}>
                            <MsqdxTypography variant="h6" sx={{ color: MSQDX_THEME.dark.text.primary, mb: 0.5, fontSize: '1rem' }}>
                                {geo.location.city}, {geo.location.country}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, display: 'block' }}>
                                {geo.location.region} • {geo.location.continent}
                            </MsqdxTypography>
                        </Box>
                    ) : (
                        <MsqdxTypography variant="body2" sx={{ color: MSQDX_THEME.dark.text.secondary }}>
                            Standort konnte nicht ermittelt werden.
                        </MsqdxTypography>
                    )}
                </Box>

                {/* Infrastructure */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: MSQDX_THEME.dark.text.secondary }}>
                            <Server size={14} />
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Server IP</MsqdxTypography>
                        </Box>
                        <MsqdxTypography variant="body2" sx={{ fontFamily: 'monospace', color: MSQDX_BRAND_PRIMARY.purple, fontSize: '0.85rem' }}>
                            {geo.serverIp || 'Unknown'}
                        </MsqdxTypography>
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, color: MSQDX_THEME.dark.text.secondary }}>
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
                            <MsqdxTypography variant="body2" sx={{ color: MSQDX_THEME.dark.text.tertiary, fontSize: '0.85rem' }}>
                                Kein CDN erkannt
                            </MsqdxTypography>
                        )}
                    </Box>
                </Box>

                {/* Languages */}
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: MSQDX_STATUS.info.base }}>
                        <Languages size={18} />
                        <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600 }}>Languages</MsqdxTypography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {geo.languages.htmlLang && (
                            <MsqdxChip label={`HTML: ${geo.languages.htmlLang}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        )}
                        {geo.languages.hreflangs.length > 0 ? (
                            geo.languages.hreflangs.slice(0, 5).map((hl, i) => (
                                <MsqdxChip key={i} label={hl.lang} size="small" sx={{ bgcolor: alpha(MSQDX_NEUTRAL[400], 0.1), height: 20, fontSize: '0.65rem' }} />
                            ))
                        ) : (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary }}>
                                Keine hreflang-Tags gefunden.
                            </MsqdxTypography>
                        )}
                        {geo.languages.hreflangs.length > 5 && (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, alignSelf: 'center' }}>
                                +{geo.languages.hreflangs.length - 5} more
                            </MsqdxTypography>
                        )}
                    </Box>
                </Box>
            </Box>
        </MsqdxMoleculeCard>
    );
}
