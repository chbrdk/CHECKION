'use client';

import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { ConsentSignals, PrivacyAudit } from '@/lib/types';
import { ShieldCheck, FileText, Cookie } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { InfoTooltip } from '@/components/InfoTooltip';

export function PrivacyCard({ privacy, consentSignals }: { privacy: PrivacyAudit; consentSignals?: ConsentSignals }) {
    const { t } = useI18n();
    if (!privacy) return null;

    return (
        <MsqdxMoleculeCard
            title="Privacy & Compliance"
            subtitle="Basic GDPR and legal requirement checks."
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-xs)' }}>
                <PrivacyItem
                    label="Privacy Policy"
                    present={privacy.hasPrivacyPolicy}
                    icon={<FileText size={18} />}
                    url={privacy.privacyPolicyUrl}
                />
                <PrivacyItem
                    label="Cookie Consent"
                    present={privacy.hasCookieBanner}
                    icon={<Cookie size={18} />}
                />
                <PrivacyItem
                    label="Terms of Service"
                    present={privacy.hasTermsOfService}
                    icon={<ShieldCheck size={18} />}
                />

                {consentSignals && (
                    <Box sx={{ p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_BRAND_PRIMARY.purple, 0.06), border: `1px solid ${alpha(MSQDX_BRAND_PRIMARY.purple, 0.2)}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                {t('results.privacyConsentHeuristicTitle')}
                            </MsqdxTypography>
                            <InfoTooltip title={t('info.heuristicSignalsBrief')} ariaLabel={t('common.info')} />
                        </Box>
                        {consentSignals.tcfApiPresent && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-on-light)' }}>TCF: __tcfapi erkannt</MsqdxTypography>
                        )}
                        {(consentSignals.cmpDomHints?.length ?? 0) > 0 && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)' }}>
                                CMP-Hinweise: {consentSignals.cmpDomHints!.join(', ')}
                            </MsqdxTypography>
                        )}
                        {(consentSignals.consentModeHints?.length ?? 0) > 0 && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', color: 'var(--color-text-muted-on-light)' }}>
                                Consent-Mode-ähnlich: {consentSignals.consentModeHints!.join(', ')}
                            </MsqdxTypography>
                        )}
                        {(consentSignals.earlyThirdPartyScriptHosts?.length ?? 0) > 0 && (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)', wordBreak: 'break-all' }}>
                                Frühe Drittanbieter-Skript-Hosts: {consentSignals.earlyThirdPartyScriptHosts!.slice(0, 12).join(', ')}
                                {(consentSignals.earlyThirdPartyScriptHosts!.length ?? 0) > 12 ? '…' : ''}
                            </MsqdxTypography>
                        )}
                    </Box>
                )}
                <Box sx={{ mt: 'var(--msqdx-spacing-xs)', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.info.base, 0.05), border: `1px dashed ${alpha(MSQDX_STATUS.info.base, 0.3)}` }}>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', lineHeight: 1.4, display: 'block' }}>
                        Hinweis: Diese Prüfung basiert auf Heuristiken (Keywords, Selektoren) und ersetzt keine rechtliche Beratung.
                    </MsqdxTypography>
                </Box>
            </Box>
        </MsqdxMoleculeCard>
    );
}

function PrivacyItem({ label, present, icon, url }: { label: string, present: boolean, icon: React.ReactNode, url?: string | null }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', border: '1px solid var(--color-secondary-dx-grey-light-tint)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)' }}>
                <Box sx={{ color: present ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base, display: 'flex' }}>
                    {icon}
                </Box>
                <Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</MsqdxTypography>
                    {url && (
                        <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {url}
                        </MsqdxTypography>
                    )}
                </Box>
            </Box>
            {present ? (
                <ShieldCheck color={MSQDX_STATUS.success.base} size={18} />
            ) : (
                <MsqdxChip label="Missing" size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.1), color: MSQDX_STATUS.error.base, height: 18, fontSize: '0.6rem' }} />
            )}
        </Box>
    );
}
