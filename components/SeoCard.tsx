import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_SPACING, MSQDX_THEME, MSQDX_STATUS, MSQDX_BRAND_PRIMARY, MSQDX_NEUTRAL } from '@msqdx/tokens';
import type { SeoAudit } from '@/lib/types';
import { CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';
import { useI18n } from './i18n/I18nProvider';

export function SeoCard({ seo }: { seo: SeoAudit }) {
    const { t } = useI18n();

    return (
        <MsqdxMoleculeCard
            title="SEO & Meta"
            subtitle={t('results.seo.subtitle')}
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-sm)' }}>
                <SeoItem
                    label="Page Title"
                    value={seo.title}
                    recommended="30-60 characters"
                    count={seo.title?.length}
                />
                <SeoItem
                    label="Meta Description"
                    value={seo.metaDescription}
                    recommended="50-160 characters"
                    count={seo.metaDescription?.length}
                />
                <SeoItem label="H1 Heading" value={seo.h1} />
                <SeoItem label="Canonical URL" value={seo.canonical} />

                <Box sx={{ height: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', my: 1 }} />

                <SeoItem label="OG Title" value={seo.ogTitle} />
                <SeoItem label="OG Description" value={seo.ogDescription} />
                <SeoItem label="OG Image" value={seo.ogImage} isMsg={!!seo.ogImage} />
                <SeoItem label="Twitter Card" value={seo.twitterCard} />

                <Box sx={{ height: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', my: 1 }} />

                <SeoItem
                    label="robots.txt"
                    value={
                        seo.robotsTxtPresent === true
                            ? t('available.true')
                            : seo.robotsTxtPresent === false
                              ? t('missing')
                              : undefined
                    }
                />
                <SeoItem label="Sitemap" value={seo.sitemapUrl || null} isMsg={!!seo.sitemapUrl} />

                {(seo.duplicateContentWarning != null || seo.skinnyContent != null || seo.bodyWordCount != null) && (
                    <>
                        <Box sx={{ height: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', my: 1 }} />
                        {seo.bodyWordCount != null && (
                            <SeoItem label={t('results.seo.wordCountLabel')} value={String(seo.bodyWordCount)} />
                        )}
                        {seo.duplicateContentWarning && (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.warning.base }}>
                                {t('results.seo.duplicateContentWarning')}
                            </MsqdxTypography>
                        )}
                        {seo.skinnyContent && (
                            <MsqdxTypography variant="caption" sx={{ color: MSQDX_STATUS.warning.base }}>
                                {t('results.seo.lowContentWarning')}
                            </MsqdxTypography>
                        )}
                    </>
                )}
                {seo.structuredDataRequiredFields && seo.structuredDataRequiredFields.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                color: `${MSQDX_NEUTRAL['700']}`,
                                display: 'block',
                                mb: 'var(--msqdx-spacing-xxs)',
                            }}
                        >
                            {t('results.seo.structuredData')}
                        </MsqdxTypography>
                        {seo.structuredDataRequiredFields.map((item, i) => (
                            <MsqdxTypography
                                key={i}
                                variant="caption"
                                sx={{ color: MSQDX_STATUS.warning.base, display: 'block' }}
                            >
                                {item.type}: {item.missing.join(', ')}
                            </MsqdxTypography>
                        ))}
                    </Box>
                )}
                {seo.jsonLdRichResultGaps && seo.jsonLdRichResultGaps.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                        <MsqdxTypography
                            variant="caption"
                            sx={{
                                color: `${MSQDX_NEUTRAL['700']}`,
                                display: 'block',
                                mb: 'var(--msqdx-spacing-xxs)',
                            }}
                        >
                            JSON-LD (Rich Results)
                        </MsqdxTypography>
                        {seo.jsonLdRichResultGaps.map((item, i) => (
                            <MsqdxTypography
                                key={i}
                                variant="caption"
                                sx={{ color: MSQDX_STATUS.warning.base, display: 'block' }}
                            >
                                {item.schemaType}: {item.missing.join(', ')}
                            </MsqdxTypography>
                        ))}
                    </Box>
                )}

                {seo.keywordAnalysis && seo.keywordAnalysis.topKeywords.length > 0 && (
                    <>
                        <Box sx={{ height: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)', my: 1 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 'var(--msqdx-spacing-xs)' }}>
                            <BarChart3 size={18} color={MSQDX_BRAND_PRIMARY.purple} />
                            <MsqdxTypography
                                variant="subtitle2"
                                sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}
                            >
                                {t('results.seo.keywordAnalysis')}
                            </MsqdxTypography>
                        </Box>
                        <MsqdxTypography
                            variant="caption"
                            sx={{ color: `${MSQDX_NEUTRAL['700']}`, display: 'block', mb: 1 }}
                        >
                            {t('results.seo.totalWords', { totalWords: seo.keywordAnalysis.totalWords })}
                        </MsqdxTypography>
                        <Box
                            sx={{
                                borderRadius: MSQDX_SPACING.borderRadius.xxs,
                                border: '1px solid var(--color-secondary-dx-grey-light-tint)',
                                overflow: 'hidden',
                                bgcolor: 'var(--color-secondary-dx-grey-light-tint)',
                            }}
                        >
                            {seo.keywordAnalysis.topKeywords.map((k, i) => {
                                const presence = seo.keywordAnalysis!.keywordPresence[i];
                                const inCritical =
                                    presence && (presence.inTitle || presence.inH1 || presence.inMetaDescription);
                                return (
                                    <Box
                                        key={k.keyword}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: 0.5,
                                            p: 'var(--msqdx-spacing-xs) var(--msqdx-spacing-sm)',
                                            borderBottom:
                                                i < seo.keywordAnalysis!.topKeywords.length - 1
                                                    ? '1px solid var(--color-secondary-dx-grey-light-tint)'
                                                    : 'none',
                                            bgcolor: inCritical
                                                ? alpha(MSQDX_STATUS.success.base, 0.06)
                                                : 'transparent',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <MsqdxTypography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: 'var(--color-text-on-light)',
                                                    minWidth: 80,
                                                }}
                                            >
                                                {k.keyword}
                                            </MsqdxTypography>
                                            <MsqdxTypography
                                                variant="caption"
                                                sx={{ color: `${MSQDX_NEUTRAL['700']}` }}
                                            >
                                                {k.count}× · {k.densityPercent}%
                                            </MsqdxTypography>
                                        </Box>
                                        {presence && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {presence.inTitle && (
                                                    <MsqdxChip
                                                        label="Title"
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.6rem',
                                                            bgcolor: alpha(MSQDX_STATUS.success.base, 0.15),
                                                            color: MSQDX_STATUS.success.base,
                                                        }}
                                                    />
                                                )}
                                                {presence.inH1 && (
                                                    <MsqdxChip
                                                        label="H1"
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.6rem',
                                                            bgcolor: alpha(MSQDX_STATUS.success.base, 0.15),
                                                            color: MSQDX_STATUS.success.base,
                                                        }}
                                                    />
                                                )}
                                                {presence.inMetaDescription && (
                                                    <MsqdxChip
                                                        label="Meta"
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{
                                                            height: 18,
                                                            fontSize: '0.6rem',
                                                            bgcolor: alpha(MSQDX_STATUS.success.base, 0.15),
                                                            color: MSQDX_STATUS.success.base,
                                                        }}
                                                    />
                                                )}
                                                {!presence.inTitle && !presence.inH1 && !presence.inMetaDescription && (
                                                    <MsqdxTypography
                                                        variant="caption"
                                                        sx={{ color: `${MSQDX_NEUTRAL['700']}` }}
                                                    >
                                                        {t('results.seo.notInCritical')}
                                                    </MsqdxTypography>
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                        {seo.keywordAnalysis.metaKeywordsRaw && (
                            <MsqdxTypography
                                variant="caption"
                                sx={{ color: `${MSQDX_NEUTRAL['700']}`, display: 'block', mt: 1 }}
                            >
                                meta keywords: {seo.keywordAnalysis.metaKeywordsRaw.slice(0, 80)}
                                {seo.keywordAnalysis.metaKeywordsRaw.length > 80 ? '…' : ''}
                            </MsqdxTypography>
                        )}
                    </>
                )}
            </Box>
        </MsqdxMoleculeCard>
    );
}

function SeoItem({
    label,
    value,
    recommended,
    count,
    isMsg = false,
}: {
    label: string;
    value: string | null | undefined;
    recommended?: string;
    count?: number;
    isMsg?: boolean;
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
                <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                    {label}
                </MsqdxTypography>
                {recommended && (
                    <MsqdxTypography variant="caption" sx={{ color: `${MSQDX_NEUTRAL['700']}` }}>
                        Rec: {recommended}
                    </MsqdxTypography>
                )}
            </Box>
            <Box sx={{ textAlign: 'right', maxWidth: '60%' }}>
                {isPresent ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <MsqdxTypography
                            variant="body2"
                            sx={{
                                color: isMsg ? MSQDX_BRAND_PRIMARY.purple : 'var(--color-text-muted-on-light)',
                                wordBreak: 'break-word',
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                            }}
                        >
                            {value}
                        </MsqdxTypography>
                        {status === 'good' && (
                            <CheckCircle size={16} color={MSQDX_STATUS.success.base} style={{ flexShrink: 0 }} />
                        )}
                        {status === 'warn' && (
                            <AlertTriangle size={16} color={MSQDX_STATUS.warning.base} style={{ flexShrink: 0 }} />
                        )}
                        {status === 'bad' && (
                            <XCircle size={16} color={MSQDX_STATUS.error.base} style={{ flexShrink: 0 }} />
                        )}
                    </Box>
                ) : (
                    <MsqdxChip
                        label="Missing"
                        size="small"
                        sx={{
                            bgcolor: alpha(MSQDX_STATUS.error.base, 0.1),
                            color: MSQDX_STATUS.error.base,
                            fontSize: '0.65rem',
                            height: 20,
                        }}
                    />
                )}
                {count !== undefined && isPresent && (
                    <MsqdxTypography
                        variant="caption"
                        sx={{
                            display: 'block',
                            color: status === 'warn' ? MSQDX_STATUS.warning.base : MSQDX_THEME.dark.text.tertiary,
                        }}
                    >
                        {count} chars
                    </MsqdxTypography>
                )}
            </Box>
        </Box>
    );
}
