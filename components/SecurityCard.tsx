import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { SecurityAudit } from '@/lib/types';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

type SecurityHeaderKey = 'contentSecurityPolicy' | 'xFrameOptions' | 'xContentTypeOptions' | 'strictTransportSecurity' | 'referrerPolicy';
const HEADER_LABELS: Array<{ key: SecurityHeaderKey; label: string }> = [
    { key: 'contentSecurityPolicy', label: 'Content-Security-Policy' },
    { key: 'xFrameOptions', label: 'X-Frame-Options' },
    { key: 'xContentTypeOptions', label: 'X-Content-Type-Options' },
    { key: 'strictTransportSecurity', label: 'Strict-Transport-Security' },
    { key: 'referrerPolicy', label: 'Referrer-Policy' },
];

export function SecurityCard({ security }: { security: SecurityAudit }) {
    if (!security) return null;

    return (
        <MsqdxMoleculeCard
            title="Security Headers"
            subtitle="Recommended HTTP security headers for the main document."
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-xs)' }}>
                {HEADER_LABELS.map(({ key, label }) => {
                    const item = security[key] as { present: boolean; value?: string } | undefined;
                    const present = item?.present ?? false;
                    return (
                        <Box
                            key={key}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                p: 'var(--msqdx-spacing-sm)',
                                borderRadius: 1,
                                bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-sm)' }}>
                                <Box sx={{ color: present ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.error.base, display: 'flex' }}>
                                    {present ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                                </Box>
                                <Box>
                                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-on-light)' }}>
                                        {label}
                                    </MsqdxTypography>
                                    {present && item?.value && (
                                        <MsqdxTypography
                                            variant="caption"
                                            sx={{
                                                color: 'var(--color-text-muted-on-light)',
                                                display: 'block',
                                                maxWidth: '240px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {item.value}
                                        </MsqdxTypography>
                                    )}
                                </Box>
                            </Box>
                            {present ? (
                                <MsqdxChip label="OK" size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.success.base, 0.1), color: MSQDX_STATUS.success.base, height: 18, fontSize: '0.6rem' }} />
                            ) : (
                                <MsqdxChip label="Missing" size="small" sx={{ bgcolor: alpha(MSQDX_STATUS.error.base, 0.1), color: MSQDX_STATUS.error.base, height: 18, fontSize: '0.6rem' }} />
                            )}
                        </Box>
                    );
                })}
                {security.mixedContentUrls && security.mixedContentUrls.length > 0 && (
                    <Box sx={{ mt: 'var(--msqdx-spacing-sm)', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.error.base, 0.05), border: `1px solid ${alpha(MSQDX_STATUS.error.base, 0.3)}` }}>
                        <MsqdxTypography variant="subtitle2" sx={{ color: MSQDX_STATUS.error.base, fontWeight: 600, mb: 'var(--msqdx-spacing-xxs)' }}>Mixed Content (HTTP auf HTTPS-Seite)</MsqdxTypography>
                        {security.mixedContentUrls.slice(0, 5).map((u, i) => (
                            <MsqdxTypography key={i} variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'var(--color-text-on-light)', wordBreak: 'break-all' }}>{u}</MsqdxTypography>
                        ))}
                        {security.mixedContentUrls.length > 5 && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>+ {security.mixedContentUrls.length - 5} weitere</MsqdxTypography>
                        )}
                    </Box>
                )}
                {security.sriMissing && security.sriMissing.length > 0 && (
                    <Box sx={{ mt: 'var(--msqdx-spacing-sm)', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.warning.base, 0.05), border: `1px solid ${alpha(MSQDX_STATUS.warning.base, 0.3)}` }}>
                        <MsqdxTypography variant="subtitle2" sx={{ color: MSQDX_STATUS.warning.base, fontWeight: 600, mb: 'var(--msqdx-spacing-xxs)' }}>Externe Ressourcen ohne SRI (integrity)</MsqdxTypography>
                        {security.sriMissing.slice(0, 5).map((s, i) => (
                            <MsqdxTypography key={i} variant="caption" sx={{ display: 'block', color: 'var(--color-text-on-light)', wordBreak: 'break-all' }}>{s.tag}: {s.url}</MsqdxTypography>
                        ))}
                        {security.sriMissing.length > 5 && (
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>+ {security.sriMissing.length - 5} weitere</MsqdxTypography>
                        )}
                    </Box>
                )}
                {security.cookieWarnings && security.cookieWarnings.length > 0 && (
                    <Box sx={{ mt: 'var(--msqdx-spacing-sm)', p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: alpha(MSQDX_STATUS.warning.base, 0.05), border: `1px solid ${alpha(MSQDX_STATUS.warning.base, 0.3)}` }}>
                        <MsqdxTypography variant="subtitle2" sx={{ color: MSQDX_STATUS.warning.base, fontWeight: 600, mb: 'var(--msqdx-spacing-xxs)' }}>Cookie-Hinweise</MsqdxTypography>
                        {security.cookieWarnings.map((w, i) => (
                            <MsqdxTypography key={i} variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>{w.message}</MsqdxTypography>
                        ))}
                    </Box>
                )}
            </Box>
        </MsqdxMoleculeCard>
    );
}
