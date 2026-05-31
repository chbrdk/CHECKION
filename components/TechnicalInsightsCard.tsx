import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { TechnicalInsights } from '@/lib/types';
import { Globe, Smartphone, Palette, CheckCircle2, Cog, Repeat, RefreshCw } from 'lucide-react';

export function TechnicalInsightsCard({ insights }: { insights: TechnicalInsights }) {
    if (!insights) return null;

    return (
        <MsqdxMoleculeCard
            title="Technische Insights"
            subtitle="Third-Party, PWA, Theme."
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-sm)' }}>
                {insights.thirdPartyDomains.length > 0 && (
                    <Box>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xxs)', mb: 'var(--msqdx-spacing-xxs)' }}>
                            <Globe size={14} /> Third-Party-Domains ({insights.thirdPartyDomains.length})
                        </MsqdxTypography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--msqdx-spacing-xxs)' }}>
                            {insights.thirdPartyDomains.slice(0, 12).map((d, i) => (
                                <MsqdxChip key={i} label={d} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                            ))}
                            {insights.thirdPartyDomains.length > 12 && (
                                <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>+ {insights.thirdPartyDomains.length - 12}</MsqdxTypography>
                            )}
                        </Box>
                    </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                        <Smartphone size={16} /> Web App Manifest
                    </MsqdxTypography>
                    {insights.manifest.present ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                            {insights.manifest.hasName && <CheckCircle2 size={14} color={MSQDX_BRAND_PRIMARY.green} />}
                            {insights.manifest.hasIcons && <CheckCircle2 size={14} color={MSQDX_BRAND_PRIMARY.green} />}
                            <MsqdxChip label="Vorhanden" size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.success.base, 0.1), color: MSQDX_STATUS.success.base, height: 20, fontSize: '0.6rem' }} />
                        </Box>
                    ) : (
                        <MsqdxChip label="Fehlt" size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.1), color: MSQDX_STATUS.error.base, height: 20, fontSize: '0.6rem' }} />
                    )}
                </Box>
                {insights.manifest.present && (!insights.manifest.hasName || !insights.manifest.hasIcons) && (
                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.warning.base }}>
                        {!insights.manifest.hasName && 'Name fehlt im Manifest. '}
                        {!insights.manifest.hasIcons && 'Icons fehlen im Manifest.'}
                    </MsqdxTypography>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                        <Palette size={16} /> theme-color
                    </MsqdxTypography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                        {insights.themeColor ? (
                            <>
                                <Box sx={{ width: 16, height: 16, borderRadius: 1, bgcolor: insights.themeColor, border: '1px solid var(--color-secondary-dx-grey-light-tint)' }} />
                                <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', color: 'var(--color-text-on-light)' }}>{insights.themeColor}</MsqdxTypography>
                            </>
                        ) : (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Nicht gesetzt</MsqdxTypography>
                        )}
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>Apple Touch Icon</MsqdxTypography>
                    {insights.appleTouchIcon ? (
                        <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.success.base, wordBreak: 'break-all' }}>Vorhanden</MsqdxTypography>
                    ) : (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Fehlt</MsqdxTypography>
                    )}
                </Box>
                {insights.serviceWorkerRegistered !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                            <Cog size={16} /> Service Worker
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: insights.serviceWorkerRegistered ? MSQDX_STATUS.success.base : 'var(--color-text-muted-on-light)' }}>
                            {insights.serviceWorkerRegistered ? 'Registriert' : 'Nicht registriert'}
                        </MsqdxTypography>
                    </Box>
                )}
                {insights.redirectCount !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                            <Repeat size={16} /> Redirects
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-on-light)' }}>
                            {insights.redirectCount === 0 ? 'Keine Redirects' : `${insights.redirectCount}`}
                        </MsqdxTypography>
                    </Box>
                )}
                {insights.metaRefreshPresent !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                        <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}>
                            <RefreshCw size={16} /> Meta Refresh
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: insights.metaRefreshPresent ? MSQDX_STATUS.warning.base : 'var(--color-text-muted-on-light)' }}>
                            {insights.metaRefreshPresent ? 'Vorhanden (nicht empfohlen)' : 'Nicht vorhanden'}
                        </MsqdxTypography>
                    </Box>
                )}
            </Box>
        </MsqdxMoleculeCard>
    );
}
