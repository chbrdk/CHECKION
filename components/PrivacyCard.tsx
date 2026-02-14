import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { PrivacyAudit } from '@/lib/types';
import { ShieldCheck, FileText, Cookie } from 'lucide-react';

export function PrivacyCard({ privacy }: { privacy: PrivacyAudit }) {
    if (!privacy) return null;

    return (
        <MsqdxMoleculeCard
            title="Privacy & Compliance"
            subtitle="Basic GDPR and legal requirement checks."
            variant="flat"
            borderRadius="lg"
            sx={{ height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: MSQDX_SPACING.scale.sm }}>
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

                <Box sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.info.base, 0.05), border: `1px dashed ${alpha(MSQDX_STATUS.info.base, 0.3)}` }}>
                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, lineHeight: 1.4, display: 'block' }}>
                        Hinweis: Diese Prüfung basiert auf Heuristiken (Keywords, Selektoren) und ersetzt keine rechtliche Beratung.
                    </MsqdxTypography>
                </Box>
            </Box>
        </MsqdxMoleculeCard>
    );
}

function PrivacyItem({ label, present, icon, url }: { label: string, present: boolean, icon: React.ReactNode, url?: string | null }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 1, bgcolor: alpha(MSQDX_NEUTRAL[900], 0.2), border: `1px solid ${MSQDX_THEME.dark.border.subtle}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: present ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base, display: 'flex' }}>
                    {icon}
                </Box>
                <Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{label}</MsqdxTypography>
                    {url && (
                        <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary, display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
