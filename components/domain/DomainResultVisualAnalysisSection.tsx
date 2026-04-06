'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxButton, MsqdxMoleculeCard } from '@msqdx/react';
import { useRouter } from 'next/navigation';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedUx } from '@/lib/domain-aggregation';
import { DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX, DOMAIN_TAB_VIRTUAL_OVERSCAN } from '@/lib/constants';
import { pathDomainSection } from '@/lib/domain-result-sections';
import { VisualUxUrlCountScrollRow } from '@/components/domain/VisualUxUrlCountScrollRow';

export type DomainResultVisualAnalysisSectionProps = {
    t: (key: string) => string;
    domainId: string;
    domainLinkQuery: Record<string, string>;
    ux: AggregatedUx | null;
    onOpenPageUrl: (url: string) => void;
};

function DomainResultVisualAnalysisSectionInner({ t, domainId, domainLinkQuery, ux, onOpenPageUrl }: DomainResultVisualAnalysisSectionProps) {
    const router = useRouter();
    const hasLists =
        ux && (ux.focusOrderByPage.length > 0 || ux.tapTargets.detailsByPage.length > 0);
    return (
        <MsqdxMoleculeCard
            title="Visuelle Analyse (Domain)"
            headerActions={<InfoTooltip title={t('info.visualAnalysis')} ariaLabel={t('common.info')} />}
            subtitle="Focus Order & Touch Targets aus Einzelseiten"
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)', mb: 2 }}>
                Screenshot, Focus Order und Touch Targets sind pro Seite in den Einzel-Scans sichtbar. Unten: Seiten mit relevanten Einträgen.
            </MsqdxTypography>
            {hasLists ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {ux!.focusOrderByPage.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit Focus-Order-Einträgen</MsqdxTypography>
                            <VirtualScrollList
                                items={ux!.focusOrderByPage}
                                maxHeight={260}
                                estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                                overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                                getItemKey={(row) => row.url}
                                renderItem={({ url, count }) => (
                                    <VisualUxUrlCountScrollRow
                                        variant="focus"
                                        url={url}
                                        count={count}
                                        onOpenPageUrl={onOpenPageUrl}
                                    />
                                )}
                            />
                        </Box>
                    )}
                    {ux!.tapTargets.detailsByPage.length > 0 && (
                        <Box>
                            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit Touch-Target-Problemen</MsqdxTypography>
                            <VirtualScrollList
                                items={ux!.tapTargets.detailsByPage}
                                maxHeight={260}
                                estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                                overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                                getItemKey={(row) => row.url}
                                renderItem={({ url, count }) => (
                                    <VisualUxUrlCountScrollRow
                                        variant="tap"
                                        url={url}
                                        count={count}
                                        onOpenPageUrl={onOpenPageUrl}
                                    />
                                )}
                            />
                        </Box>
                    )}
                </Box>
            ) : null}
            <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)', display: 'block', mt: 2 }}>
                {t('domainResult.allPagesInOverview')}
            </MsqdxTypography>
            <MsqdxButton
                size="small"
                variant="text"
                onClick={() =>
                    router.push(
                        pathDomainSection(domainId, 'overview', Object.keys(domainLinkQuery).length ? domainLinkQuery : undefined)
                    )
                }
                sx={{ mt: 0.5, fontSize: '0.75rem' }}
            >
                {t('domainResult.tabOverview')} → {t('domainResult.scannedPages')}
            </MsqdxButton>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultVisualAnalysisSection = memo(DomainResultVisualAnalysisSectionInner);
