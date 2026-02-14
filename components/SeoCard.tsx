import { Box, alpha } from '@mui/material';
import {
    MsqdxTypography,
    MsqdxCard,
    MsqdxMoleculeCard,
    MsqdxChip,
} from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_STATUS, MSQDX_BRAND_PRIMARY } from '@msqdx/tokens';
import type { SeoAudit } from '@/lib/types';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function SeoCard({ seo }: { seo: SeoAudit }) {
    return (
        <MsqdxMoleculeCard
            title="SEO & Meta"
            subtitle="Basic Search Engine Optimization check."
            variant="flat"
            borderRadius="lg"
            sx={{ height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: MSQDX_SPACING.scale.md }}>
                <SeoItem label="Page Title" value={seo.title} recommended="30-60 characters" count={seo.title?.length} />
                <SeoItem label="Meta Description" value={seo.metaDescription} recommended="50-160 characters" count={seo.metaDescription?.length} />
                <SeoItem label="H1 Heading" value={seo.h1} />
                <SeoItem label="Canonical URL" value={seo.canonical} />

                <Box sx={{ height: 1, bgcolor: MSQDX_THEME.dark.border.subtle, my: 1 }} />

                <SeoItem label="OG Title" value={seo.ogTitle} />
                <SeoItem label="OG Description" value={seo.ogDescription} />
                <SeoItem label="OG Image" value={seo.ogImage} isMsg={!!seo.ogImage} />
                <SeoItem label="Twitter Card" value={seo.twitterCard} />
            </Box>
        </MsqdxMoleculeCard>
    );
}

function SeoItem({
    label,
    value,
    recommended,
    count,
    isMsg = false
}: {
    label: string,
    value: string | null | undefined,
    recommended?: string,
    count?: number,
    isMsg?: boolean
}) {
    const isPresent = !!value;
    // Simple heuristic for length
    let status: 'good' | 'warn' | 'bad' = isPresent ? 'good' : 'bad';

    if (label === 'Page Title' && count) {
        if (count < 30 || count > 60) status = 'warn';
    }
    if (label === 'Meta Description' && count) {
        if (count < 50 || count > 160) status = 'warn';
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
            <Box>
                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: MSQDX_THEME.dark.text.primary }}>
                    {label}
                </MsqdxTypography>
                {recommended && (
                    <MsqdxTypography variant="caption" sx={{ color: MSQDX_THEME.dark.text.tertiary }}>
                        Rec: {recommended}
                    </MsqdxTypography>
                )}
            </Box>
            <Box sx={{ textAlign: 'right', maxWidth: '60%' }}>
                {isPresent ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <MsqdxTypography variant="body2" sx={{
                            color: isMsg ? MSQDX_BRAND_PRIMARY.purple : MSQDX_THEME.dark.text.secondary,
                            wordBreak: 'break-word',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem'
                        }}>
                            {value}
                        </MsqdxTypography>
                        {status === 'good' && <CheckCircle size={16} color={MSQDX_STATUS.success.base} />}
                        {status === 'warn' && <AlertTriangle size={16} color={MSQDX_STATUS.warning.base} />}
                        {status === 'bad' && <XCircle size={16} color={MSQDX_STATUS.error.base} />}
                    </Box>
                ) : (
                    <MsqdxChip
                        label="Missing"
                        size="small"
                        sx={{
                            bgcolor: alpha(MSQDX_STATUS.error.base, 0.1),
                            color: MSQDX_STATUS.error.base,
                            fontSize: '0.65rem',
                            height: 20
                        }}
                    />
                )}
                {count !== undefined && isPresent && (
                    <MsqdxTypography variant="caption" sx={{ display: 'block', color: status === 'warn' ? MSQDX_STATUS.warning.base : MSQDX_THEME.dark.text.tertiary }}>
                        {count} chars
                    </MsqdxTypography>
                )}
            </Box>
        </Box>
    );
}
