'use client';

import { Box, alpha } from '@mui/material';
import { MsqdxTypography, MsqdxMoleculeCard, MsqdxChip } from '@msqdx/react';
import { MSQDX_STATUS } from '@msqdx/tokens';
import type { ContentFreshness, ContentFreshnessSource } from '@/lib/types';
import { CalendarClock, Info } from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';

function sourceLabelKey(source: ContentFreshnessSource): string {
    const map: Record<ContentFreshnessSource, string> = {
        http_last_modified: 'results.contentFreshnessSourceHttpLastModified',
        jsonld_date_modified: 'results.contentFreshnessSourceJsonLdModified',
        jsonld_date_published: 'results.contentFreshnessSourceJsonLdPublished',
        og_article_modified_time: 'results.contentFreshnessSourceOgModified',
        og_updated_time: 'results.contentFreshnessSourceOgUpdated',
        og_article_published_time: 'results.contentFreshnessSourceOgPublished',
    };
    return map[source];
}

function confidenceColor(c: ContentFreshness['confidence']): string {
    switch (c) {
        case 'high':
            return MSQDX_STATUS.success.base;
        case 'medium':
            return MSQDX_STATUS.warning.base;
        case 'low':
            return MSQDX_STATUS.info.base;
        default:
            return 'var(--color-text-muted-on-light)';
    }
}

function confidenceLabelKey(c: ContentFreshness['confidence']): string {
    switch (c) {
        case 'high':
            return 'results.contentFreshnessConfidenceHigh';
        case 'medium':
            return 'results.contentFreshnessConfidenceMedium';
        case 'low':
            return 'results.contentFreshnessConfidenceLow';
        default:
            return 'results.contentFreshnessConfidenceUnknown';
    }
}

export function ContentFreshnessCard({ data }: { data: ContentFreshness }) {
    const { t } = useI18n();
    const hasBest = data.bestAsOfIso != null && data.bestAsOfSource != null;

    return (
        <MsqdxMoleculeCard
            title={t('results.contentFreshnessTitle')}
            subtitle={t('results.contentFreshnessSubtitle')}
            variant="flat"
            borderRadius="lg"
            sx={{ bgcolor: 'var(--color-card-bg)', height: '100%' }}
        >
            <Box sx={{ display: 'grid', gap: 'var(--msqdx-spacing-sm)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <MsqdxTypography
                        variant="body2"
                        sx={{ color: 'var(--color-text-on-light)', display: 'flex', alignItems: 'center', gap: 'var(--msqdx-spacing-xs)' }}
                    >
                        <CalendarClock size={16} /> {t('results.contentFreshnessConfidenceLabel')}
                    </MsqdxTypography>
                    <MsqdxChip
                        label={t(confidenceLabelKey(data.confidence))}
                        size="small"
                        sx={{
                            bgcolor: alpha(confidenceColor(data.confidence), 0.12),
                            color: confidenceColor(data.confidence),
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                        }}
                    />
                </Box>

                {!hasBest && (
                    <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                        {t('results.contentFreshnessNoDates')}
                    </MsqdxTypography>
                )}

                {hasBest && (
                    <>
                        <Box sx={{ p: 'var(--msqdx-spacing-sm)', borderRadius: 1, bgcolor: 'var(--color-secondary-dx-grey-light-tint)' }}>
                            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mb: 0.5 }}>
                                {t('results.contentFreshnessBestSource')}
                            </MsqdxTypography>
                            <MsqdxTypography variant="body2" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)' }}>
                                {t(sourceLabelKey(data.bestAsOfSource!))}
                            </MsqdxTypography>
                            <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', color: 'var(--color-text-on-light)', mt: 0.5 }}>
                                {new Date(data.bestAsOfIso!).toLocaleString()}
                            </MsqdxTypography>
                        </Box>
                        {data.ageDays != null && (
                            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-on-light)' }}>
                                {t('results.contentFreshnessAgeDays', { count: String(data.ageDays) })}
                            </MsqdxTypography>
                        )}
                    </>
                )}

                {data.notes && data.notes.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {data.notes.map((note) => (
                            <MsqdxTypography
                                key={note}
                                variant="caption"
                                sx={{ color: MSQDX_STATUS.warning.base, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
                            >
                                <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                                {note === 'html_long_cache'
                                    ? t('results.contentFreshnessNoteHtmlLongCache')
                                    : t('results.contentFreshnessNoteSourceSpread')}
                            </MsqdxTypography>
                        ))}
                    </Box>
                )}

                {data.signals.length > 0 && (
                    <Box>
                        <MsqdxTypography variant="caption" sx={{ fontWeight: 600, color: 'var(--color-text-on-light)', mb: 0.5 }}>
                            {t('results.contentFreshnessSignalsTitle')}
                        </MsqdxTypography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {data.signals.map((s, i) => (
                                <Box
                                    key={`${s.source}-${i}`}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'baseline',
                                        gap: 1,
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>
                                        {t(sourceLabelKey(s.source))}
                                    </MsqdxTypography>
                                    <MsqdxTypography variant="caption" sx={{ fontFamily: 'monospace', color: 'var(--color-text-on-light)' }}>
                                        {new Date(s.valueIso).toLocaleDateString()}
                                    </MsqdxTypography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                )}
            </Box>
        </MsqdxMoleculeCard>
    );
}
