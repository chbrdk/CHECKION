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
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                            Standort konnte nicht ermittelt werden.
                        </MsqdxTypography>
                    )}
                </Box>

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
            </Box>
        </MsqdxMoleculeCard>
    );
}
