'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { MSQDX_BRAND_PRIMARY, MSQDX_STATUS } from '@msqdx/tokens';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedUx } from '@/lib/domain-aggregation';
import {
    DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
    DOMAIN_UX_BROKEN_LINKS_PREVIEW,
} from '@/lib/constants';

export type DomainResultUxAuditSectionProps = {
    t: (key: string) => string;
    ux: AggregatedUx;
    onOpenPageUrl: (url: string) => void;
    uxBrokenLinksPreview: AggregatedUx['brokenLinks'];
};

function DomainResultUxAuditSectionInner({ t, ux, onOpenPageUrl, uxBrokenLinksPreview }: DomainResultUxAuditSectionProps) {
    return (
        <MsqdxMoleculeCard
            title="UX Audit (Domain)"
            headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />}
            subtitle="Aggregierte Werte über alle Seiten"
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
                <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø UX-Score</MsqdxTypography>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700, color: ux.score >= 80 ? MSQDX_BRAND_PRIMARY.green : MSQDX_STATUS.warning.base }}>{ux.score}</MsqdxTypography>
                </Box>
                <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø CLS</MsqdxTypography>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700 }}>{ux.cls}</MsqdxTypography>
                </Box>
                <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Kaputte Links (gesamt)</MsqdxTypography>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700 }}>{ux.brokenLinks.length}</MsqdxTypography>
                </Box>
            </Box>
            {(ux.pagesByScore.length > 0 || ux.consoleErrorsByPage.length > 0 || ux.tapTargets.detailsByPage.length > 0) && (
                <Box sx={{ mt: 2 }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Erkenntnisse aus Einzelseiten</MsqdxTypography>
                    {ux.pagesByScore.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit niedrigstem UX-Score (zuerst prüfen)</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {ux.pagesByScore.slice(0, 8).map(({ url, score, cls }) => (
                                    <MsqdxButton
                                        key={url}
                                        size="small"
                                        variant="outlined"
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {url} — Score {score}, CLS {cls}
                                    </MsqdxButton>
                                ))}
                            </Box>
                        </Box>
                    )}
                    {ux.consoleErrorsByPage.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit Console-Errors</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {ux.consoleErrorsByPage.slice(0, 6).map(({ url, count }) => (
                                    <MsqdxButton
                                        key={url}
                                        size="small"
                                        variant="text"
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {url} ({count})
                                    </MsqdxButton>
                                ))}
                            </Box>
                        </Box>
                    )}
                    {ux.tapTargets.detailsByPage.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="caption" sx={{ fontWeight: 600 }}>Seiten mit Touch-Target-Problemen</MsqdxTypography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                {ux.tapTargets.detailsByPage.slice(0, 6).map(({ url, count }) => (
                                    <MsqdxButton
                                        key={url}
                                        size="small"
                                        variant="text"
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                                    >
                                        {url} ({count})
                                    </MsqdxButton>
                                ))}
                            </Box>
                        </Box>
                    )}
                </Box>
            )}
            {ux.brokenLinks.length > 0 && (
                <Box sx={{ mt: 2 }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Kaputte Links (Seite)</MsqdxTypography>
                    <VirtualScrollList
                        items={uxBrokenLinksPreview}
                        maxHeight={200}
                        estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                        overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                        getItemKey={(l, i) => `${l.href}|${l.pageUrl}|${l.status}|${i}`}
                        renderItem={(l) => (
                            <MsqdxTypography variant="caption" sx={{ display: 'block', py: 0.25 }}>
                                {l.href} → {l.pageUrl} (HTTP {l.status})
                            </MsqdxTypography>
                        )}
                    />
                    {ux.brokenLinks.length > DOMAIN_UX_BROKEN_LINKS_PREVIEW && (
                        <MsqdxTypography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'var(--color-text-muted-on-light)' }}>
                            … und {ux.brokenLinks.length - DOMAIN_UX_BROKEN_LINKS_PREVIEW} weitere
                        </MsqdxTypography>
                    )}
                </Box>
            )}
        </MsqdxMoleculeCard>
    );
}

export const DomainResultUxAuditSection = memo(DomainResultUxAuditSectionInner);

function DomainResultUxAuditEmptyInner({ t }: { t: (key: string) => string }) {
    return (
        <MsqdxMoleculeCard title="UX Audit (Domain)" headerActions={<InfoTooltip title={t('info.uxAudit')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine UX-Daten über die gescannten Seiten verfügbar.</MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultUxAuditEmpty = memo(DomainResultUxAuditEmptyInner);
