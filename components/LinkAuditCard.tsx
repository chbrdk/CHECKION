import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_STATUS, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { LinkAudit } from '@/lib/types';
import { Link2, Link, ExternalLink, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useI18n } from './i18n/I18nProvider';

export function LinkAuditCard({ links }: { links: LinkAudit }) {
    const { t } = useI18n();
    if (!links) return null;

    return (
        <MsqdxMoleculeCard
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
            title="Link Audit"
            subtitle="Analysis of hyperlinks and their availability."
            variant="flat"
            borderRadius="lg"
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 'var(--msqdx-spacing-sm)',
                    mb: 'var(--msqdx-spacing-md)',
                }}
            >
                <StatItem label="Total Links" value={links.total} icon={<Link2 size={16} />} />
                <StatItem label="Internal" value={links.internal} icon={<Link size={16} />} />
                <StatItem label="External" value={links.external} icon={<ExternalLink size={16} />} />
            </Box>

            {links.broken.length > 0 ? (
                <Box>
                    <MsqdxTypography
                        variant="subtitle2"
                        sx={{
                            mb: 'var(--msqdx-spacing-xxs)',
                            color: MSQDX_STATUS.error.base,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <AlertTriangle size={16} />
                        {t('results.seo.brokenLinks', { brokenLinks: links.broken.length })}
                    </MsqdxTypography>
                    <Box
                        sx={{
                            borderRadius: MSQDX_SPACING.borderRadius.xxs,
                            border: `1px solid ${MSQDX_STATUS.error.base}`,
                            bgcolor: alpha(MSQDX_STATUS.error.base, 0.05),
                            overflow: 'hidden',
                        }}
                    >
                        {links.broken.map((link, i) => (
                            <Box
                                key={i}
                                sx={{
                                    py: MSQDX_SPACING.scale.xxs,
                                    px: MSQDX_SPACING.scale.xs,
                                    borderBottom:
                                        i < links.broken.length - 1
                                            ? `1px solid ${alpha(MSQDX_STATUS.error.base, 0.5)}`
                                            : 'none',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <Box sx={{ overflow: 'hidden' }}>
                                    <MsqdxTypography
                                        variant="body2"
                                        sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                    >
                                        {link.text || 'No Text'}
                                    </MsqdxTypography>
                                    <MsqdxTypography
                                        variant="caption"
                                        sx={{
                                            color: `${MSQDX_NEUTRAL['700']}`,
                                            display: 'block',
                                            maxWidth: '300px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {link.url}
                                    </MsqdxTypography>
                                </Box>
                                <MsqdxChip
                                    label={link.statusCode || 'Error'}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                        bgcolor: MSQDX_STATUS.error.base,
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        height: 24,
                                    }}
                                />
                            </Box>
                        ))}
                    </Box>
                </Box>
            ) : (
                <Box
                    sx={{
                        p: 'var(--msqdx-spacing-sm)',
                        bgcolor: alpha(MSQDX_STATUS.success.base, 0.05),
                        borderRadius: MSQDX_SPACING.borderRadius.xxs,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--msqdx-spacing-sm)',
                    }}
                >
                    <CheckCircle size={24} color={MSQDX_STATUS.success.base} />
                    <Box>
                        <MsqdxTypography variant="subtitle2" sx={{ color: MSQDX_STATUS.success.dark }}>
                            {t('results.seo.noBrokenLinks')}
                        </MsqdxTypography>
                        <MsqdxTypography variant="caption" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                            {t('results.seo.noBrokenLinksDescription')}
                        </MsqdxTypography>
                    </Box>
                </Box>
            )}

            {links.missingNoopener && links.missingNoopener.length > 0 ? (
                <Box sx={{ mt: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxTypography
                        variant="subtitle2"
                        sx={{
                            mb: 'var(--msqdx-spacing-xs)',
                            color: MSQDX_STATUS.warning.base,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <AlertTriangle size={16} />
                        {t('results.seo.linksMissingNoopener', { missing: links.missingNoopener.length })}
                    </MsqdxTypography>
                    <MsqdxTypography
                        variant="caption"
                        sx={{
                            color: `${MSQDX_NEUTRAL['700']}`,
                            display: 'block',
                            mb: 'var(--msqdx-spacing-xs)',
                        }}
                    >
                        {t('results.seo.linksMissingNoopenerDescription')}
                    </MsqdxTypography>
                    <Box
                        sx={{
                            borderRadius: MSQDX_SPACING.borderRadius.xxs,
                            border: `1px solid ${alpha(MSQDX_STATUS.warning.base, 0.6)}`,
                            bgcolor: alpha(MSQDX_STATUS.warning.base, 0.05),
                            overflow: 'hidden',
                        }}
                    >
                        {links.missingNoopener.map((link, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 'var(--msqdx-spacing-sm)',
                                    borderBottom:
                                        i < links.missingNoopener!.length - 1
                                            ? `1px solid ${alpha(MSQDX_STATUS.warning.base, 0.3)}`
                                            : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--msqdx-spacing-xxs)',
                                }}
                            >
                                <MsqdxTypography
                                    variant="body2"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {link.text || 'No Text'}
                                </MsqdxTypography>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{
                                        color: `${MSQDX_NEUTRAL['700']}`,
                                        display: 'block',
                                        maxWidth: '300px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {link.url}
                                </MsqdxTypography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            ) : null}

            {links.pdfLinks && links.pdfLinks.length > 0 && (
                <Box sx={{ mt: 'var(--msqdx-spacing-md)' }}>
                    <MsqdxTypography
                        variant="subtitle2"
                        sx={{
                            mb: 'var(--msqdx-spacing-xs)',
                            color: MSQDX_STATUS.warning.base,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <FileText size={16} />
                        {t('results.seo.linkedPdfs', { pdfs: links.pdfLinks.length })}
                    </MsqdxTypography>
                    <Box
                        sx={{
                            borderRadius: MSQDX_SPACING.borderRadius.xxs,
                            border: `1px solid ${alpha(MSQDX_STATUS.warning.base, 0.6)}`,
                            bgcolor: alpha(MSQDX_STATUS.warning.base, 0.05),
                            overflow: 'hidden',
                        }}
                    >
                        {links.pdfLinks.slice(0, 8).map((item, i) => (
                            <Box
                                key={i}
                                sx={{
                                    p: 'var(--msqdx-spacing-sm)',
                                    borderBottom:
                                        i < Math.min(8, links.pdfLinks!.length) - 1
                                            ? `1px solid ${alpha(MSQDX_STATUS.warning.base, 0.3)}`
                                            : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--msqdx-spacing-xxs)',
                                }}
                            >
                                <MsqdxTypography
                                    variant="body2"
                                    sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                                >
                                    {item.text || 'PDF'}
                                </MsqdxTypography>
                                <MsqdxTypography
                                    variant="caption"
                                    sx={{
                                        color: `${MSQDX_NEUTRAL['700']}`,
                                        display: 'block',
                                        maxWidth: '300px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {item.url}
                                </MsqdxTypography>
                            </Box>
                        ))}
                        {links.pdfLinks.length > 8 && (
                            <Box sx={{ p: 'var(--msqdx-spacing-sm)' }}>
                                <MsqdxTypography variant="caption" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                                    {t('results.seo.morePdfs', { morePdfs: links.pdfLinks.length - 8 })}
                                </MsqdxTypography>
                            </Box>
                        )}
                    </Box>
                </Box>
            )}
        </MsqdxMoleculeCard>
    );
}

function StatItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <Box
            sx={{
                textAlign: 'center',
                p: 1,
                bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                borderRadius: '8px',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    mb: 0.5,
                    color: `${MSQDX_NEUTRAL['700']}`,
                }}
            >
                {icon}
                <MsqdxTypography variant="caption">{label}</MsqdxTypography>
            </Box>
            <MsqdxTypography variant="h6" sx={{ fontWeight: 700 }}>
                {value}
            </MsqdxTypography>
        </Box>
    );
}
