'use client';

import React, { memo } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxMoleculeCard } from '@msqdx/react';
import { ExternalLink } from 'lucide-react';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedStructure } from '@/lib/domain-aggregation';
import {
    DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
} from '@/lib/constants';

export type DomainResultStructureSectionProps = {
    t: (key: string, values?: Record<string, string>) => string;
    structure: AggregatedStructure;
    onOpenPageUrl: (url: string) => void;
};

function DomainResultStructureSectionInner({ t, structure, onOpenPageUrl }: DomainResultStructureSectionProps) {
    return (
        <MsqdxMoleculeCard
            title="Struktur & Semantik (Domain)"
            headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />}
            subtitle="Überschriften-Hierarchie über alle Seiten"
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <MsqdxChip label={`Seiten mit mehreren H1: ${structure.pagesWithMultipleH1.length}`} size="small" brandColor="pink" />
                <MsqdxChip label={`Seiten mit übersprungenen Leveln: ${structure.pagesWithSkippedLevels.length}`} size="small" brandColor="yellow" />
                {structure.pagesWithGoodStructure.length > 0 && (
                    <MsqdxChip label={`Seiten mit guter Struktur: ${structure.pagesWithGoodStructure.length}`} size="small" brandColor="green" />
                )}
            </Box>
            {structure.pagesWithGoodStructure.length > 0 && structure.pagesWithGoodStructure.length <= 10 && (
                <Box sx={{ mb: 2 }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit guter Überschriften-Struktur</MsqdxTypography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {structure.pagesWithGoodStructure.map((url) => (
                            <Box
                                key={url}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    py: 0.25,
                                    pr: 0.5,
                                    border: '1px solid var(--color-secondary-dx-grey-light-tint, #e0e0e0)',
                                    borderRadius: 1,
                                    px: 1,
                                }}
                            >
                                <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={url}>
                                    {url}
                                </MsqdxTypography>
                                <Tooltip title={t('domainResult.openPage')}>
                                    <IconButton
                                        size="small"
                                        aria-label={t('domainResult.openPageAria', { url })}
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        <ExternalLink size={16} strokeWidth={2} aria-hidden />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
            {structure.pagesWithMultipleH1.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit mehreren H1</MsqdxTypography>
                    <VirtualScrollList
                        items={structure.pagesWithMultipleH1}
                        maxHeight={320}
                        estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                        overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                        getItemKey={(url) => url}
                        renderItem={(url) => (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', py: 0.25, pr: 0.5 }}>
                                <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={url}>
                                    {url}
                                </MsqdxTypography>
                                <Tooltip title={t('domainResult.openPage')}>
                                    <IconButton
                                        size="small"
                                        aria-label={t('domainResult.openPageAria', { url })}
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        <ExternalLink size={16} strokeWidth={2} aria-hidden />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    />
                </Box>
            )}
            {structure.pagesWithSkippedLevels.length > 0 && (
                <Box>
                    <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Seiten mit übersprungenen Überschriften-Leveln</MsqdxTypography>
                    <VirtualScrollList
                        items={structure.pagesWithSkippedLevels}
                        maxHeight={320}
                        estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                        overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                        getItemKey={(url) => url}
                        renderItem={(url) => (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', py: 0.25, pr: 0.5 }}>
                                <MsqdxTypography variant="caption" sx={{ flex: 1, minWidth: 0 }} noWrap title={url}>
                                    {url}
                                </MsqdxTypography>
                                <Tooltip title={t('domainResult.openPage')}>
                                    <IconButton
                                        size="small"
                                        aria-label={t('domainResult.openPageAria', { url })}
                                        onClick={() => onOpenPageUrl(url)}
                                        sx={{ flexShrink: 0 }}
                                    >
                                        <ExternalLink size={16} strokeWidth={2} aria-hidden />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        )}
                    />
                </Box>
            )}
        </MsqdxMoleculeCard>
    );
}

export const DomainResultStructureSection = memo(DomainResultStructureSectionInner);

function DomainResultStructureEmptyInner({ t }: { t: (key: string) => string }) {
    return (
        <MsqdxMoleculeCard title="Struktur & Semantik (Domain)" headerActions={<InfoTooltip title={t('info.structureSemantics')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine Struktur-Daten (Überschriften) verfügbar.</MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultStructureEmpty = memo(DomainResultStructureEmptyInner);
