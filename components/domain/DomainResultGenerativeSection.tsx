'use client';

import React, { memo } from 'react';
import { Box } from '@mui/material';
import { MsqdxTypography, MsqdxChip, MsqdxMoleculeCard } from '@msqdx/react';
import { VirtualScrollList } from '@/components/VirtualScrollList';
import { InfoTooltip } from '@/components/InfoTooltip';
import type { AggregatedGenerative } from '@/lib/domain-aggregation';
import {
    DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX,
    DOMAIN_TAB_VIRTUAL_OVERSCAN,
} from '@/lib/constants';
import { GenerativePageScrollRow } from '@/components/domain/GenerativePageScrollRow';

export type DomainResultGenerativeSectionProps = {
    t: (key: string) => string;
    generative: AggregatedGenerative;
    onOpenPageUrl: (url: string) => void;
};

function DomainResultGenerativeSectionInner({ t, generative, onOpenPageUrl }: DomainResultGenerativeSectionProps) {
    return (
        <MsqdxMoleculeCard
            title="Generative Search / GEO (Domain)"
            headerActions={<InfoTooltip title={t('info.generativeGeo')} ariaLabel={t('common.info')} />}
            subtitle="Aggregiert über alle Seiten"
            variant="flat"
            sx={{ bgcolor: 'var(--color-card-bg)' }}
            borderRadius="lg"
        >
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ p: 2, border: '1px solid var(--color-secondary-dx-grey-light-tint)', borderRadius: 1 }}>
                    <MsqdxTypography variant="caption" sx={{ color: 'var(--color-text-muted-on-light)' }}>Ø GEO-Score</MsqdxTypography>
                    <MsqdxTypography variant="h4" sx={{ fontWeight: 700 }}>{generative.score}</MsqdxTypography>
                </Box>
                <MsqdxChip label={`Seiten mit llms.txt: ${generative.withLlmsTxt} / ${generative.pageCount}`} size="small" />
                <MsqdxChip label={`Seiten mit robots (AI erlaubt): ${generative.withRobotsAllowingAi} / ${generative.pageCount}`} size="small" />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <MsqdxTypography variant="caption">Ø FAQ-Anzahl: {generative.contentSummary.avgFaqCount}</MsqdxTypography>
                <MsqdxTypography variant="caption">Ø Listen-Dichte: {generative.contentSummary.avgListDensity}</MsqdxTypography>
                <MsqdxTypography variant="caption">Ø Zitat-Dichte: {generative.contentSummary.avgCitationDensity}</MsqdxTypography>
            </Box>
            <MsqdxTypography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Pro Seite (Score, llms.txt, empfohlenes Schema)</MsqdxTypography>
            <VirtualScrollList
                items={generative.pages}
                maxHeight={300}
                estimateSize={DOMAIN_TAB_VIRTUAL_ROW_ESTIMATE_PX}
                overscan={DOMAIN_TAB_VIRTUAL_OVERSCAN}
                getItemKey={(p) => p.url}
                renderItem={(p) => <GenerativePageScrollRow page={p} onOpenPageUrl={onOpenPageUrl} />}
            />
        </MsqdxMoleculeCard>
    );
}

export const DomainResultGenerativeSection = memo(DomainResultGenerativeSectionInner);

function DomainResultGenerativeEmptyInner({ t }: { t: (key: string) => string }) {
    return (
        <MsqdxMoleculeCard title="Generative Search / GEO (Domain)" headerActions={<InfoTooltip title={t('info.generativeGeo')} ariaLabel={t('common.info')} />} variant="flat" sx={{ bgcolor: 'var(--color-card-bg)' }} borderRadius="lg">
            <MsqdxTypography variant="body2" sx={{ color: 'var(--color-text-muted-on-light)' }}>Keine GEO-Daten verfügbar.</MsqdxTypography>
        </MsqdxMoleculeCard>
    );
}

export const DomainResultGenerativeEmpty = memo(DomainResultGenerativeEmptyInner);
